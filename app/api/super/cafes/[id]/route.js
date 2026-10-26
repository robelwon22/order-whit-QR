import { NextResponse } from 'next/server';
import { verifyStaffSession, getServiceRoleClient } from '../../../../../lib/supabaseServer';

const RESERVED_SLUGS = ['admin', 'login', 'bartender', 'super', 'api'];
const BUSINESS_TYPES = ['coffee_house', 'restaurant', 'other'];
const BUSINESS_CATEGORIES = ['bakery', 'catering', 'juice_bar', 'fast_food', 'dessert', 'bar', 'custom'];

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    await verifyStaffSession(req, ['super_admin']);
    const supabaseAdmin = getServiceRoleClient();

    const body = await req.json();
    const {
      name,
      slug,
      active,
      max_tables,
      languages,
      default_language,
      currency,
      active_until,
      business_type,
      business_category,
      business_what,
    } = body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (active !== undefined) updates.active = Boolean(active);
    if (max_tables !== undefined) updates.max_tables = max_tables ? Number(max_tables) : null;
    if (languages !== undefined) updates.languages = languages;
    if (default_language !== undefined) updates.default_language = default_language;
    if (currency !== undefined) updates.currency = currency;

    if (business_type !== undefined && !BUSINESS_TYPES.includes(business_type)) {
      return NextResponse.json({ success: false, error: 'Business type is invalid' }, { status: 400 });
    }
    if (business_category !== undefined && !BUSINESS_CATEGORIES.includes(business_category)) {
      return NextResponse.json({ success: false, error: 'Business category is invalid' }, { status: 400 });
    }
    if (business_what !== undefined && (typeof business_what !== 'string' || business_what.length > 120)) {
      return NextResponse.json({ success: false, error: 'Custom business description is invalid' }, { status: 400 });
    }

    if (business_type !== undefined || business_category !== undefined || business_what !== undefined) {
      const { data: cafe, error: settingsError } = await supabaseAdmin
        .from('cafes')
        .select('settings')
        .eq('id', id)
        .single();
      if (settingsError) {
        return NextResponse.json({ success: false, error: settingsError.message }, { status: 400 });
      }
      updates.settings = {
        ...(cafe?.settings || {}),
        ...(business_type !== undefined ? { business_type } : {}),
        ...(business_category !== undefined ? { business_category } : {}),
        ...(business_what !== undefined ? { business_what: business_what.trim() } : {}),
      };
    }

    if (slug !== undefined) {
      const cleanSlug = slug.toLowerCase().trim();
      if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
        return NextResponse.json({ success: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' }, { status: 400 });
      }
      if (RESERVED_SLUGS.includes(cleanSlug)) {
        return NextResponse.json({ success: false, error: `The slug "${cleanSlug}" is reserved` }, { status: 400 });
      }

      // Check uniqueness if slug changed
      const { data: existing } = await supabaseAdmin
        .from('cafes')
        .select('id')
        .eq('slug', cleanSlug)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ success: false, error: 'A cafe with this slug already exists' }, { status: 400 });
      }
      updates.slug = cleanSlug;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('cafes')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
      }
    }

    // Update billing active_until if provided
    if (active_until !== undefined) {
      const { error: billError } = await supabaseAdmin
        .from('cafe_billing')
        .upsert({
          cafe_id: id,
          active_until: new Date(active_until).toISOString(),
        });

      if (billError) {
        return NextResponse.json({ success: false, error: billError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, message: 'Cafe updated successfully' });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: err.status || 500 }
    );
  }
}
