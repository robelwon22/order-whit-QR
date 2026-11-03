import { NextResponse } from 'next/server';
import { verifyStaffSession, getServiceRoleClient } from '../../../../../lib/supabaseServer';

/**
 * Allows only a super admin to set a staff user's password, without returning it.
 */
export async function POST(req, { params }) {
  try {
    const { id: targetUserId } = params;
    await verifyStaffSession(req, ['super_admin']);
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
    const supabaseAdmin = getServiceRoleClient();

    // Fetch target staff
    const { data: targetStaff, error: targetError } = await supabaseAdmin
      .from('staff')
      .select('user_id, cafe_id, role, full_name')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (targetError || !targetStaff) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
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
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
