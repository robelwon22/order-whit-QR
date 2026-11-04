BEGIN;

CREATE TABLE IF NOT EXISTS public.table_scan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS scan_session_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_scan_session_id_fkey'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_scan_session_id_fkey
      FOREIGN KEY (scan_session_id)
      REFERENCES public.table_scan_sessions(id)
      ON DELETE SET NULL;
  END IF;

  IF to_regprocedure('public.place_order_v2(text,jsonb,text,text)') IS NULL THEN
    RAISE EXCEPTION
      'Expected public.place_order_v2(text,jsonb,text,text). Confirm its argument types before applying this migration.';
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS table_scan_sessions_open_table_idx
  ON public.table_scan_sessions(table_id)
  WHERE closed_at IS NULL;

CREATE INDEX IF NOT EXISTS orders_scan_session_id_idx
  ON public.orders(scan_session_id);

ALTER TABLE public.table_scan_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.table_scan_sessions FROM PUBLIC, anon, authenticated;

-- Starts a server-owned session for a valid, active table QR token.
CREATE OR REPLACE FUNCTION public.begin_table_scan_session(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table_id uuid;
  v_session_id uuid;
BEGIN
  SELECT tbl.id
    INTO v_table_id
    FROM public.tables AS tbl
    JOIN public.cafes AS cafe ON cafe.id = tbl.cafe_id
   WHERE tbl.token = p_token
     AND tbl.active = true
     AND cafe.active = true
     AND (cafe.active_until IS NULL OR cafe.active_until > now())
   LIMIT 1;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'table_inactive';
  END IF;

  INSERT INTO public.table_scan_sessions(table_id)
  VALUES (v_table_id)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- Associates every new order with the open scan session passed through its guarded RPC.
CREATE OR REPLACE FUNCTION public.require_open_table_scan_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session_id uuid;
  v_session_table_id uuid;
  v_closed_at timestamptz;
BEGIN
  v_session_id := nullif(current_setting('app.scan_session_id', true), '')::uuid;
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'table_session_missing';
  END IF;

  SELECT session.table_id, session.closed_at
    INTO v_session_table_id, v_closed_at
    FROM public.table_scan_sessions AS session
   WHERE session.id = v_session_id
   FOR UPDATE;

  IF NOT FOUND OR v_closed_at IS NOT NULL OR v_session_table_id IS DISTINCT FROM NEW.table_id THEN
    RAISE EXCEPTION 'table_session_closed';
  END IF;

  NEW.scan_session_id := v_session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_require_open_table_scan_session ON public.orders;
CREATE TRIGGER orders_require_open_table_scan_session
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.require_open_table_scan_session();

-- Closes the order's scan session as soon as its status becomes paid.
CREATE OR REPLACE FUNCTION public.close_table_scan_session_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.scan_session_id IS NOT NULL THEN
      UPDATE public.table_scan_sessions
         SET closed_at = COALESCE(closed_at, now())
       WHERE id = NEW.scan_session_id;
    ELSE
      UPDATE public.table_scan_sessions
         SET closed_at = COALESCE(closed_at, now())
       WHERE table_id = NEW.table_id
         AND closed_at IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_close_table_scan_session_on_paid ON public.orders;
CREATE TRIGGER orders_close_table_scan_session_on_paid
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.close_table_scan_session_on_paid();

-- Validates an open session and runs the existing order implementation in that session's context.
CREATE OR REPLACE FUNCTION public.place_order_v2(
  p_token text,
  p_items jsonb,
  p_note text,
  p_device_key text,
  p_scan_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table_id uuid;
  v_session_table_id uuid;
  v_closed_at timestamptz;
  v_result jsonb;
BEGIN
  SELECT id
    INTO v_table_id
    FROM public.tables
   WHERE token = p_token
     AND active = true
   LIMIT 1;

  IF v_table_id IS NULL THEN
    RAISE EXCEPTION 'table_inactive';
  END IF;

  SELECT table_id, closed_at
    INTO v_session_table_id, v_closed_at
    FROM public.table_scan_sessions
   WHERE id = p_scan_session_id
   FOR UPDATE;

  IF NOT FOUND OR v_closed_at IS NOT NULL OR v_session_table_id IS DISTINCT FROM v_table_id THEN
    RAISE EXCEPTION 'table_session_closed';
  END IF;

  PERFORM set_config('app.scan_session_id', p_scan_session_id::text, true);

  EXECUTE 'SELECT public.place_order_v2($1, $2, $3, $4)'
     INTO v_result
    USING p_token, p_items, p_note, p_device_key;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.place_order_v2(text,jsonb,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_table_scan_session(text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order_v2(text,jsonb,text,text,uuid)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
