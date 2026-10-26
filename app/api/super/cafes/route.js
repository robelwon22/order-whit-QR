import { NextResponse } from 'next/server';
import { verifyStaffSession, getServiceRoleClient } from '../../../../lib/supabaseServer';

const RESERVED_SLUGS = ['admin', 'login', 'bartender', 'super', 'api'];
const BUSINESS_TYPES = ['coffee_house', 'restaurant', 'other'];
const BUSINESS_CATEGORIES = ['bakery', 'catering', 'juice_bar', 'fast_food', 'dessert', 'bar', 'custom'];

// Calculates start of today in Africa/Addis_Ababa timezone (UTC+3)
function getAddisTodayStartISO() {
  const now = new Date();
  // Addis is UTC + 3 hours
  const addisMs = now.getTime() + (3 * 60 + now.getTimezoneOffset()) * 60 * 1000;
  const addisDate = new Date(addisMs);
  addisDate.setHours(0, 0, 0, 0);
  // Convert back to UTC date for Postgres query
  const utcStartMs = addisDate.getTime() - (3 * 60 + now.getTimezoneOffset()) * 60 * 1000;
  return new Date(utcStartMs).toISOString();
}

export async function GET(req) {
  try {
    await verifyStaffSession(req, ['super_admin']);
    const supabaseAdmin = getServiceRoleClient();

    // 1. Fetch all cafes
    const { data: cafes, error: cafesError } = await supabaseAdmin
      .from('cafes')
      .select('id, name, slug, active, max_tables, default_language, languages, currency, created_at, theme, settings')
      .order('created_at', { ascending: false });

    if (cafesError) {
      return NextResponse.json({ success: false, error: cafesError.message }, { status: 500 });
    }

    // 2. Fetch billing records
    const { data: billings } = await supabaseAdmin
      .from('cafe_billing')
      .select('cafe_id, active_until, notes');

    const billingMap = {};
    (billings || []).forEach((b) => {
      billingMap[b.cafe_id] = b;
    });

    // 3. Fetch table counts
    const { data: tables } = await supabaseAdmin
      .from('tables')
      .select('cafe_id');

    const tableCounts = {};
    (tables || []).forEach((t) => {
      tableCounts[t.cafe_id] = (tableCounts[t.cafe_id] || 0) + 1;
    });

    // 4. Fetch staff counts
    const { data: staffList } = await supabaseAdmin
      .from('staff')
      .select('cafe_id');

    const staffCounts = {};
    (staffList || []).forEach((s) => {
      if (s.cafe_id) {
        staffCounts[s.cafe_id] = (staffCounts[s.cafe_id] || 0) + 1;
      }
    });

    // 5. Fetch orders today
    const todayStart = getAddisTodayStartISO();
    const { data: todayOrders } = await supabaseAdmin
      .from('orders')
      .select('cafe_id')
      .gte('created_at', todayStart);

    const ordersTodayCounts = {};
    (todayOrders || []).forEach((o) => {
      ordersTodayCounts[o.cafe_id] = (ordersTodayCounts[o.cafe_id] || 0) + 1;
    });

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let totalActive = 0;
    let expiringIn7Days = 0;
    const totalOrdersToday = todayOrders?.length || 0;

    // Assemble rich cafe objects
    const enrichedCafes = cafes.map((c) => {
      const billing = billingMap[c.id];
      const activeUntil = billing?.active_until ? new Date(billing.active_until) : null;

      let status = 'active';
      if (!c.active) {
        status = 'suspended';
      } else if (activeUntil && activeUntil < now) {
        status = 'expired';
      } else {
        status = 'active';
        totalActive++;
      }

      const isExpiringSoon = status === 'active' && activeUntil && activeUntil <= in7Days;
      if (isExpiringSoon) {
        expiringIn7Days++;
      }

      return {
        ...c,
        status, // 'active' | 'suspended' | 'expired'
        active_until: billing?.active_until || null,
        billing_notes: billing?.notes || '',
        tables_count: tableCounts[c.id] || 0,
        staff_count: staffCounts[c.id] || 0,
        orders_today: ordersTodayCounts[c.id] || 0,
        is_expiring_soon: Boolean(isExpiringSoon),
      };
    });

    return NextResponse.json({
      success: true,
      cafes: enrichedCafes,
      overview: {
        total_cafes: cafes.length,
        active_cafes: totalActive,
        expiring_soon: expiringIn7Days,
        orders_today: totalOrdersToday,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: err.status || 500 }
    );
  }
}

export async function POST(req) {
  let createdCafeId = null;
  let createdAuthUserId = null;

  try {
    // Only super_admin can create cafes
    await verifyStaffSession(req, ['super_admin']);
    const supabaseAdmin = getServiceRoleClient();

    const body = await req.json();
    const {
      name,
      slug,
      languages = ['en', 'am'],
      default_language = 'en',
      currency = 'ETB',
      max_tables = null,
      active_until = null,
      business_type = 'coffee_house',
      business_category = 'bakery',
      business_what = '',
      admin_name,
      admin_email,
      admin_password,
    } = body;

    // Validate inputs
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Cafe name is required' }, { status: 400 });
    }
    if (!BUSINESS_TYPES.includes(business_type) || !BUSINESS_CATEGORIES.includes(business_category)
        || typeof business_what !== 'string' || business_what.length > 120) {
      return NextResponse.json({ success: false, error: 'Business type or category is invalid' }, { status: 400 });
    }

    const cleanSlug = (slug || '').toLowerCase().trim();
    if (!cleanSlug || !/^[a-z0-9-]+$/.test(cleanSlug)) {
      return NextResponse.json({ success: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' }, { status: 400 });
    }

    if (RESERVED_SLUGS.includes(cleanSlug)) {
      return NextResponse.json({ success: false, error: `The slug "${cleanSlug}" is reserved by the system` }, { status: 400 });
    }

    if (!admin_email?.trim() || !admin_password?.trim()) {
      return NextResponse.json({ success: false, error: 'Admin email and temporary password are required' }, { status: 400 });
    }

    // Check slug uniqueness
    const { data: existingSlug } = await supabaseAdmin
      .from('cafes')
      .select('id')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json({ success: false, error: `A cafe with slug "${cleanSlug}" already exists` }, { status: 400 });
    }

    // 1. Create Cafe
    const { data: cafe, error: cafeError } = await supabaseAdmin
      .from('cafes')
      .insert({
        name: name.trim(),
        slug: cleanSlug,
        languages: languages.length > 0 ? languages : ['en', 'am'],
        default_language: default_language || 'en',
        currency: currency || 'ETB',
        max_tables: max_tables ? Number(max_tables) : null,
        active: true,
        settings: {
          business_type,
          business_category,
          business_what: business_what.trim(),
          bg: { mode: 'auto', own_photos: [], intensity: 'soft' },
        },
      })
      .select()
      .single();

    if (cafeError || !cafe) {
      throw new Error(cafeError?.message || 'Failed to create cafe record');
    }
    createdCafeId = cafe.id;

    // 2. Create Billing row
    const billingUntil = active_until
      ? new Date(active_until).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: billError } = await supabaseAdmin
      .from('cafe_billing')
      .insert({
        cafe_id: cafe.id,
        active_until: billingUntil,
        notes: 'Initial registration',
      });

    if (billError) {
      throw new Error(billError.message || 'Failed to initialize cafe billing');
    }

    // 3. Create Admin Auth User
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: admin_email.trim(),
      password: admin_password.trim(),
      email_confirm: true,
      user_metadata: { full_name: admin_name?.trim() || 'Cafe Admin' },
    });

    if (authError || !authUser?.user) {
      throw new Error(authError?.message || 'Failed to create admin user');
    }
    createdAuthUserId = authUser.user.id;

    // 4. Create Staff row for the Cafe Admin
    const { data: staff, error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        user_id: authUser.user.id,
        cafe_id: cafe.id,
        role: 'cafe_admin',
        full_name: admin_name?.trim() || 'Cafe Admin',
        active: true,
      })
      .select()
      .single();

    if (staffError) {
      throw new Error(staffError.message || 'Failed to link staff profile');
    }

    return NextResponse.json({
      success: true,
      cafe,
      admin: {
        id: authUser.user.id,
        email: admin_email.trim(),
        full_name: admin_name?.trim() || 'Cafe Admin',
      },
    });
  } catch (err) {
    // ATOMIC ROLLBACK: clean up any partially created records
    const supabaseAdmin = getServiceRoleClient();
    try {
      if (createdAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      }
      if (createdCafeId) {
        await supabaseAdmin.from('cafe_billing').delete().eq('cafe_id', createdCafeId);
        await supabaseAdmin.from('staff').delete().eq('cafe_id', createdCafeId);
        await supabaseAdmin.from('cafes').delete().eq('id', createdCafeId);
      }
    } catch (cleanupErr) {
      console.error('Rollback cleanup encountered error:', cleanupErr);
    }

    return NextResponse.json(
      { success: false, error: err.message },
      { status: err.status || 400 }
    );
  }
}
