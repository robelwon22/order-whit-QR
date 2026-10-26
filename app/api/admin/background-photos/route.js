import { NextResponse } from 'next/server';
import { verifyStaffSession } from '../../../../lib/supabaseServer';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorizeCafe(req, cafeId) {
  if (!UUID_PATTERN.test(cafeId || '')) {
    const error = new Error('Cafe ID is invalid.');
    error.status = 400;
    throw error;
  }
  const { staff, supabaseAdmin } = await verifyStaffSession(req, ['cafe_admin', 'super_admin']);
  if (staff.role !== 'super_admin' && staff.cafe_id !== cafeId) {
    const error = new Error('You can only manage photos for your own cafe.');
    error.status = 403;
    throw error;
  }
  return supabaseAdmin;
}

export async function POST(req) {
  try {
    const cafeId = new URL(req.url).searchParams.get('cafeId');
    const supabaseAdmin = await authorizeCafe(req, cafeId);
    if (req.headers.get('content-type') !== 'image/webp') {
      return NextResponse.json({ error: 'Only processed WebP images can be uploaded.' }, { status: 415 });
    }
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (!contentLength || contentLength >= 300 * 1024) {
      return NextResponse.json({ error: 'Photo must be smaller than 300 KB.' }, { status: 413 });
    }
    const uploadId = req.headers.get('x-upload-id') || '';
    if (!UUID_PATTERN.test(uploadId)) {
      return NextResponse.json({ error: 'Photo upload ID is invalid.' }, { status: 400 });
    }
    const contents = Buffer.from(await req.arrayBuffer());
    if (!contents.length || contents.length >= 300 * 1024) {
      return NextResponse.json({ error: 'Photo must be smaller than 300 KB.' }, { status: 413 });
    }
    const path = `${cafeId}/bg/${uploadId}.webp`;
    const { error } = await supabaseAdmin.storage.from('cafe-assets').upload(path, contents, {
      cacheControl: '3600',
      contentType: 'image/webp',
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabaseAdmin.storage.from('cafe-assets').getPublicUrl(path);
    return NextResponse.json({ publicUrl: data.publicUrl });
  } catch (error) {
    console.error('Background photo upload request failed:', error);
    return NextResponse.json({ error: error.message || 'Photo upload failed.' }, { status: error.status || 500 });
  }
}

export async function DELETE(req) {
  try {
    const cafeId = new URL(req.url).searchParams.get('cafeId');
    const supabaseAdmin = await authorizeCafe(req, cafeId);
    const { path } = await req.json();
    if (typeof path !== 'string' || !path.startsWith(`${cafeId}/bg/`)
        || !UUID_PATTERN.test(path.slice(`${cafeId}/bg/`.length).replace(/\.webp$/, ''))
        || !path.endsWith('.webp')) {
      return NextResponse.json({ error: 'Photo path is invalid for this cafe.' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.storage.from('cafe-assets').remove([path]);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Background photo delete request failed:', error);
    return NextResponse.json({ error: error.message || 'Photo delete failed.' }, { status: error.status || 500 });
  }
}
