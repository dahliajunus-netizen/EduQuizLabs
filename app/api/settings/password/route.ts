import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/auth';
import { csrfResponse } from '@/lib/server/csrf';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  const blocked = csrfResponse(request);
  if (blocked) return blocked;
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const body = await request.json();
    const currentPassword = typeof body?.current_password === 'string' ? body.current_password : '';
    const newPassword = typeof body?.new_password === 'string' ? body.new_password : '';
    if (!currentPassword || newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: 'Invalid password.' }, { status: 400 });
    }
    if (!supabaseUrl || !publishableKey || !serviceKey) return NextResponse.json({ error: 'Server auth configuration is missing.' }, { status: 500 });

    const verify = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: currentPassword }),
      cache: 'no-store',
    });
    if (!verify.ok) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });

    const update = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
      method: 'PUT',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
      cache: 'no-store',
    });
    if (!update.ok) throw new Error(await update.text());
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Settings Password API] POST failed:', error);
    return NextResponse.json({ error: 'Unable to change password.' }, { status: 500 });
  }
}
