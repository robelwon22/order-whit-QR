import { NextResponse } from 'next/server';
import { verifyStaffSession } from '../../../../../../lib/supabaseServer';

/**
 * Resets a staff password for the caller's cafe while preserving the cafe-admin workflow.
 */
export async function POST(req, { params }) {
  try {
    const { id: targetUserId } = params;
    const { staff, supabaseAdmin } = await verifyStaffSession(req, ['cafe_admin', 'super_admin']);
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
    }

    if (typeof body?.password !== 'string' || body.password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters.' },
        { status: 400 },
      );
    }

    const { data: targetStaff, error: targetError } = await supabaseAdmin
      .from('staff')
      .select('user_id, cafe_id, role, full_name, email')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (targetError || !targetStaff) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    if (
      staff.role !== 'super_admin' &&
      (targetStaff.cafe_id !== staff.cafe_id || targetStaff.role === 'super_admin')
    ) {
      return NextResponse.json({ success: false, error: "You cannot reset this staff member's password." }, { status: 403 });
    }

    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: body.password,
    });
    if (resetError) {
      return NextResponse.json({ success: false, error: resetError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      full_name: targetStaff.full_name,
      email: targetStaff.email,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 },
    );
  }
}
