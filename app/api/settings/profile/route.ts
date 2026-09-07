import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

export async function GET(request: NextRequest) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const rows = await supabaseDb(`users?id=eq.${encodeURIComponent(user.id)}&select=id,full_name,email,role,country,avatar_url&limit=1`);
    return NextResponse.json(Array.isArray(rows) ? rows[0] ?? null : null);
  } catch (error) {
    console.error('[Settings Profile API] GET failed:', error);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const body = await request.json();
    const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : '';
    const country = typeof body?.country === 'string' ? body.country.trim() : '';
    if (!fullName || fullName.length > 100 || country.length > 100) {
      return NextResponse.json({ error: 'Invalid profile details.' }, { status: 400 });
    }
    const rows = await supabaseDb(`users?id=eq.${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ full_name: fullName, country: country || null }),
    });
    return NextResponse.json(Array.isArray(rows) ? rows[0] ?? null : null);
  } catch (error) {
    console.error('[Settings Profile API] PATCH failed:', error);
    return NextResponse.json({ error: 'Unable to save profile.' }, { status: 500 });
  }
}
