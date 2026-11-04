import { NextResponse } from 'next/server';
import { verifyStaffSession } from '../../../../../../lib/supabaseServer';

/**
 * Closes every open scan session for a staff-authorized table to free it immediately.
 */
export async function POST(req, { params }) {
  try {
    const { staff, supabaseAdmin } = await verifyStaffSession(req, [
      'cafe_admin',
      'super_admin',
      'bartender',
    ]);
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, cafe_id, name')
      .eq('id', params.id)
      .maybeSingle();

    if (tableError) {
      return NextResponse.json({ success: false, error: tableError.message }, { status: 500 });
    }
    if (!table) {
      return NextResponse.json({ success: false, error: 'Table not found.' }, { status: 404 });
    }
    if (staff.role !== 'super_admin' && table.cafe_id !== staff.cafe_id) {
      return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
    }

    const { error: closeError } = await supabaseAdmin
      .from('table_scan_sessions')
      .update({ closed_at: new Date().toISOString() })
      .eq('table_id', table.id)
      .is('closed_at', null);

    if (closeError) {
      return NextResponse.json({ success: false, error: closeError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, table: { id: table.id, name: table.name } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 },
    );
  }
}
