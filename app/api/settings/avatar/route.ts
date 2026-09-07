import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowed.has(file.type) || file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Use a JPG, PNG, WebP, or GIF image up to 2 MB.' }, { status: 400 });
    }
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Server storage configuration is missing.' }, { status: 500 });
    const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const path = `${user.id}/avatar.${ext}`;
    const bytes = await file.arrayBuffer();
    const upload = await fetch(`${supabaseUrl}/storage/v1/object/avatars/${encodeURIComponent(path)}`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'x-upsert': 'true', 'Content-Type': file.type },
      body: bytes,
    });
    if (!upload.ok) throw new Error(await upload.text());
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${path}?v=${Date.now()}`;
    await supabaseDb(`users?id=eq.${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ avatar_url: publicUrl }),
    });
    return NextResponse.json({ avatar_url: publicUrl });
  } catch (error) {
    console.error('[Settings Avatar API] POST failed:', error);
    return NextResponse.json({ error: 'Unable to upload profile picture.' }, { status: 500 });
  }
}
