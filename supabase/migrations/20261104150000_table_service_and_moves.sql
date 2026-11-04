BEGIN;

ALTER TABLE public.table_scan_sessions
  ADD COLUMN IF NOT EXISTS device_key uuid,
  ADD COLUMN IF NOT EXISTS move_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS device_key uuid,
  ADD COLUMN IF NOT EXISTS moved_from_table_id uuid REFERENCES public.tables(id),
  ADD COLUMN IF NOT EXISTS moved_from_table_name text,
  ADD COLUMN IF NOT EXISTS moved_at timestamptz;

CREATE INDEX IF NOT EXISTS table_scan_sessions_open_device_idx
  ON public.table_scan_sessions(table_id, device_key)
  WHERE closed_at IS NULL;

CREATE INDEX IF NOT EXISTS orders_active_scan_session_idx
  ON public.orders(scan_session_id, status)
  WHERE status IN ('open', 'served');

DO $$
BEGIN
  IF to_regclass('public.table_scan_sessions') IS NULL OR to_regclass('public.orders') IS NULL THEN
    RAISE EXCEPTION 'The deployed table_scan_sessions and orders tables must exist before this migration.';
  END IF;
  IF to_regprocedure('public.place_order_v2(text,jsonb,text,uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Expected deployed public.place_order_v2(text,jsonb,text,uuid,uuid); no order-creation function was changed.';
  END IF;
END;
$$;

-- Backfills session ownership when existing orders already carry a recognized device-key column.
DO $$
DECLARE
  v_source_column text;
BEGIN
  SELECT column_name
    INTO v_source_column
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'orders'
     AND column_name IN ('customer_device_key', 'device_id')
   ORDER BY CASE column_name WHEN 'customer_device_key' THEN 1 ELSE 2 END
   LIMIT 1;

  IF v_source_column IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.orders SET device_key = nullif(to_jsonb(orders)->>%L, '''')::uuid WHERE device_key IS NULL AND to_jsonb(orders)->>%L ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''',
      v_source_column,
      v_source_column
    );
  END IF;

  UPDATE public.table_scan_sessions AS session
     SET device_key = order_row.device_key
    FROM public.orders AS order_row
   WHERE order_row.scan_session_id = session.id
     AND order_row.device_key IS NOT NULL
     AND session.device_key IS NULL;
END;
$$;

-- Closes paid sessions immediately and cancelled sessions when no active order remains.
CREATE OR REPLACE FUNCTION public.close_table_scan_session_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.table_scan_sessions
       SET closed_at = COALESCE(closed_at, now())
     WHERE id = NEW.scan_session_id;
  ELSIF NEW.status = 'cancelled'
    AND OLD.status IS DISTINCT FROM NEW.status
    AND NOT EXISTS (
      SELECT 1
        FROM public.orders AS active_order
       WHERE active_order.scan_session_id = NEW.scan_session_id
         AND active_order.id <> NEW.id
         AND active_order.status IN ('open', 'served')
    ) THEN
    UPDATE public.table_scan_sessions
       SET closed_at = COALESCE(closed_at, now())
     WHERE id = NEW.scan_session_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Starts a scan session or resumes the same device's in-service session, serializing scans per table.
DROP FUNCTION IF EXISTS public.begin_table_scan_session(text);
CREATE OR REPLACE FUNCTION public.begin_table_scan_session(
  p_token text,
  p_device_key uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table_id uuid;
  v_cafe_id uuid;
  v_session_id uuid;
  v_session_device_key uuid;
  v_order_device_key uuid;
BEGIN
  SELECT tbl.id, tbl.cafe_id
    INTO v_table_id, v_cafe_id
    FROM public.tables AS tbl
    JOIN public.cafes AS cafe ON cafe.id = tbl.cafe_id
    LEFT JOIN public.cafe_billing AS billing ON billing.cafe_id = cafe.id
   WHERE tbl.token = p_token
     AND tbl.active = true
     AND cafe.active = true
     AND (billing.active_until IS NULL OR billing.active_until >= CURRENT_DATE)
   FOR UPDATE OF tbl;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'table_inactive';
  END IF;

  UPDATE public.table_scan_sessions AS session
     SET closed_at = now()
   WHERE session.table_id = v_table_id
     AND session.closed_at IS NULL
     AND session.created_at < now() - interval '3 hours'
     AND NOT EXISTS (
       SELECT 1
         FROM public.orders AS active_order
        WHERE active_order.scan_session_id = session.id
          AND active_order.status IN ('open', 'served')
     );

  SELECT session.id, session.device_key, active_order.device_key
    INTO v_session_id, v_session_device_key, v_order_device_key
    FROM public.table_scan_sessions AS session
    JOIN public.orders AS active_order
      ON active_order.scan_session_id = session.id
     AND active_order.status IN ('open', 'served')
   WHERE session.table_id = v_table_id
     AND session.closed_at IS NULL
   ORDER BY session.created_at DESC
   LIMIT 1
   FOR UPDATE OF session;

  IF v_session_id IS NOT NULL THEN
    IF p_device_key IS NOT NULL
      AND (v_session_device_key = p_device_key OR v_order_device_key = p_device_key) THEN
      UPDATE public.table_scan_sessions
         SET device_key = COALESCE(device_key, p_device_key)
       WHERE id = v_session_id;
      RETURN v_session_id;
    END IF;
    RAISE EXCEPTION 'table_in_service';
  END IF;

  INSERT INTO public.table_scan_sessions(table_id, device_key)
  VALUES (v_table_id, p_device_key)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- Requires an open scan session and copies its device key onto newly created orders.
CREATE OR REPLACE FUNCTION public.require_open_table_scan_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_scan_session_id uuid;
  v_session_table_id uuid;
  v_session_device_key uuid;
  v_closed_at timestamptz;
BEGIN
  v_scan_session_id := COALESCE(
    NEW.scan_session_id,
    nullif(current_setting('app.scan_session_id', true), '')::uuid
  );
  IF v_scan_session_id IS NULL THEN
    RAISE EXCEPTION 'table_session_missing';
  END IF;

  SELECT session.table_id, session.device_key, session.closed_at
    INTO v_session_table_id, v_session_device_key, v_closed_at
    FROM public.table_scan_sessions AS session
   WHERE session.id = v_scan_session_id
   FOR UPDATE;

  IF NOT FOUND OR v_closed_at IS NOT NULL OR v_session_table_id IS DISTINCT FROM NEW.table_id THEN
    RAISE EXCEPTION 'table_session_closed';
  END IF;

  NEW.scan_session_id := v_scan_session_id;
  NEW.device_key := COALESCE(NEW.device_key, v_session_device_key);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_require_open_table_scan_session ON public.orders;
CREATE TRIGGER orders_require_open_table_scan_session
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.require_open_table_scan_session();

-- Returns only free active table ids and names for the validated customer session's cafe.
CREATE OR REPLACE FUNCTION public.get_free_tables_for_scan_session(
  p_scan_session_id uuid,
  p_device_key uuid
)
RETURNS TABLE(table_id uuid, table_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cafe_id uuid;
BEGIN
  SELECT table_row.cafe_id
    INTO v_cafe_id
    FROM public.table_scan_sessions AS session
    JOIN public.tables AS table_row ON table_row.id = session.table_id
   WHERE session.id = p_scan_session_id
     AND session.device_key = p_device_key
     AND session.closed_at IS NULL
     AND EXISTS (
       SELECT 1 FROM public.orders AS active_order
        WHERE active_order.scan_session_id = session.id
          AND active_order.status IN ('open', 'served')
     );

  IF v_cafe_id IS NULL THEN
    RAISE EXCEPTION 'table_session_missing';
  END IF;

  RETURN QUERY
  SELECT destination.id, destination.name
    FROM public.tables AS destination
   WHERE destination.cafe_id = v_cafe_id
     AND destination.active = true
     AND NOT EXISTS (
       SELECT 1
         FROM public.table_scan_sessions AS session
         JOIN public.orders AS active_order
           ON active_order.scan_session_id = session.id
          AND active_order.status IN ('open', 'served')
        WHERE session.table_id = destination.id
          AND session.closed_at IS NULL
     )
   ORDER BY destination.sort_order, destination.name;
END;
$$;

-- Moves this device's active scan session to a free table and records the previous table on its orders.
CREATE OR REPLACE FUNCTION public.move_scan_session_to_table(
  p_scan_session_id uuid,
  p_device_key uuid,
  p_new_table_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_table_id uuid;
  v_old_table_name text;
  v_cafe_id uuid;
  v_new_table_name text;
  v_new_token text;
  v_closed_at timestamptz;
  v_move_count integer;
BEGIN
  SELECT session.table_id, session.closed_at, session.move_count, old_table.cafe_id, old_table.name
    INTO v_old_table_id, v_closed_at, v_move_count, v_cafe_id, v_old_table_name
    FROM public.table_scan_sessions AS session
    JOIN public.tables AS old_table ON old_table.id = session.table_id
   WHERE session.id = p_scan_session_id
     AND session.device_key = p_device_key
   FOR UPDATE OF session;

  IF NOT FOUND OR v_closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'table_session_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders AS active_order
     WHERE active_order.scan_session_id = p_scan_session_id
       AND active_order.status IN ('open', 'served')
  ) THEN
    RAISE EXCEPTION 'table_session_has_no_active_orders';
  END IF;

  IF v_move_count >= 3 THEN
    RAISE EXCEPTION 'table_move_limit_reached';
  END IF;

  SELECT destination.name, destination.token
    INTO v_new_table_name, v_new_token
    FROM public.tables AS destination
    JOIN public.cafes AS cafe ON cafe.id = destination.cafe_id
    LEFT JOIN public.cafe_billing AS billing ON billing.cafe_id = cafe.id
   WHERE destination.id = p_new_table_id
     AND destination.cafe_id = v_cafe_id
     AND destination.active = true
     AND cafe.active = true
     AND (billing.active_until IS NULL OR billing.active_until >= CURRENT_DATE)
   FOR UPDATE OF destination;

  IF v_new_token IS NULL THEN
    RAISE EXCEPTION 'table_not_available';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.table_scan_sessions AS other_session
      JOIN public.orders AS active_order
        ON active_order.scan_session_id = other_session.id
       AND active_order.status IN ('open', 'served')
     WHERE other_session.table_id = p_new_table_id
       AND other_session.closed_at IS NULL
       AND other_session.id <> p_scan_session_id
  ) THEN
    RAISE EXCEPTION 'table_in_service';
  END IF;

  IF p_new_table_id = v_old_table_id THEN
    RETURN jsonb_build_object(
      'table_id', v_old_table_id,
      'table_name', v_old_table_name,
      'token', v_new_token
    );
  END IF;

  UPDATE public.table_scan_sessions
     SET table_id = p_new_table_id,
         move_count = move_count + 1
   WHERE id = p_scan_session_id;

  UPDATE public.orders
     SET moved_from_table_id = v_old_table_id,
         moved_from_table_name = v_old_table_name,
         moved_at = now(),
         table_id = p_new_table_id,
         table_name = v_new_table_name
   WHERE scan_session_id = p_scan_session_id
     AND status IN ('open', 'served');

  RETURN jsonb_build_object(
    'table_id', p_new_table_id,
    'table_name', v_new_table_name,
    'token', v_new_token
  );
END;
$$;

REVOKE ALL ON FUNCTION public.begin_table_scan_session(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_table_scan_session(text, uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_free_tables_for_scan_session(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_free_tables_for_scan_session(uuid, uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.move_scan_session_to_table(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_scan_session_to_table(uuid, uuid, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
