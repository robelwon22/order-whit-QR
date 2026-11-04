import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { verifyStaffSession, getServiceRoleClient } from '../../../../lib/supabaseServer';

// GET /api/admin/tables?cafe_id=... — list tables for a cafe
export async function GET(req) {
  try {
    const { staff } = await verifyStaffSession(req, ['cafe_admin', 'super_admin']);
    const supabaseAdmin = getServiceRoleClient();

    const { searchParams } = new URL(req.url);
    const cafeId = searchParams.get('cafe_id') || staff.cafe_id;

    // Enforce boundary: cafe_admin can only see their own cafe's tables
    if (staff.role === 'cafe_admin' && cafeId !== staff.cafe_id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (!cafeId) {
      return NextResponse.json({ success: false, error: 'cafe_id is required' }, { status: 400 });
    }

    const { data: tables, error } = await supabaseAdmin
      .from('tables')
      .select('id, cafe_id, name, token, active, sort_order, created_at')
      .eq('cafe_id', cafeId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const tableRows = tables || [];
    let sessions = [];
    if (tableRows.length) {
      const { data: openSessions, error: sessionError } = await supabaseAdmin
        .from('table_scan_sessions')
        .select('id, table_id')
        .in('table_id', tableRows.map((table) => table.id))
        .is('closed_at', null);

      if (sessionError) {
        return NextResponse.json({ success: false, error: sessionError.message }, { status: 500 });
      }
      sessions = openSessions || [];
    }
    const sessionIds = sessions.map((scanSession) => scanSession.id);
    let activeSessionIds = new Set();
    if (sessionIds.length) {
      const { data: activeOrders, error: activeOrderError } = await supabaseAdmin
        .from('orders')
        .select('scan_session_id')
        .in('scan_session_id', sessionIds)
        .in('status', ['open', 'served']);

      if (activeOrderError) {
        return NextResponse.json({ success: false, error: activeOrderError.message }, { status: 500 });
      }
      activeSessionIds = new Set((activeOrders || []).map((order) => order.scan_session_id));
    }
    const inServiceTableIds = new Set(
      sessions
        .filter((scanSession) => activeSessionIds.has(scanSession.id))
        .map((scanSession) => scanSession.table_id),
    );

    return NextResponse.json({
      success: true,
      tables: tableRows.map((table) => ({
        ...table,
        in_service: inServiceTableIds.has(table.id),
      })),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

/**
 * Creates tables with independent, cryptographically random QR tokens.
 */
export async function POST(req) {
  try {
    const { staff } = await verifyStaffSession(req, ['cafe_admin', 'super_admin']);
    const supabaseAdmin = getServiceRoleClient();

    const body = await req.json();
    const { count = 1, prefix = 'Table ', start_number = 1, cafe_id } = body;

    const targetCafeId = staff.role === 'super_admin' ? (cafe_id || staff.cafe_id) : staff.cafe_id;

    if (!targetCafeId) {
      return NextResponse.json({ success: false, error: 'cafe_id is required' }, { status: 400 });
    }

    // Enforce boundary for cafe_admin
    if (staff.role === 'cafe_admin' && targetCafeId !== staff.cafe_id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const n = Math.min(Math.max(1, parseInt(count, 10) || 1), 50);

    // Determine current max sort_order so new tables go at the end
    const { data: existingTables } = await supabaseAdmin
      .from('tables')
      .select('sort_order, name')
      .eq('cafe_id', targetCafeId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const maxOrder = existingTables?.[0]?.sort_order ?? 0;

    // Get existing table names to avoid duplicates
    const { data: allTables } = await supabaseAdmin
      .from('tables')
      .select('name')
      .eq('cafe_id', targetCafeId);

    const existingNames = new Set((allTables || []).map((t) => t.name));

    const rows = [];
    let num = parseInt(start_number, 10) || 1;
    while (rows.length < n) {
      const name = `${prefix}${num}`;
      if (!existingNames.has(name)) {
        rows.push({
          cafe_id: targetCafeId,
          name,
          token: randomBytes(32).toString('base64url'),
          sort_order: maxOrder + rows.length + 1,
          active: true,
        });
      }
      num++;
      if (num > 9999) break; // safety
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'All generated table names already exist.' }, { status: 409 });
    }

    const { data: created, error: insertError } = await supabaseAdmin
      .from('tables')
      .insert(rows)
      .select();

    if (insertError) {
      // Handle the "table limit reached" trigger error
      const msg = insertError.message || '';
      if (msg.includes('table limit reached') || msg.includes('max_tables')) {
        return NextResponse.json({ success: false, error: 'Table limit reached for this cafe.' }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tables: created, count: created.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
