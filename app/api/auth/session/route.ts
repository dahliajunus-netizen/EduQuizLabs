import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies } from '@/lib/server/auth-cookies';
import { supabaseDb } from '@/lib/server/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ ok: false }, { status: 500 });

  const accessToken = request.cookies.get('eduquiz_access_token')?.value || '';
  const refreshToken = request.cookies.get('eduquiz_refresh_token')?.value || '';
  if (!accessToken && !refreshToken) return NextResponse.json({ ok: false }, { status: 401 });

  let authUser: any = null;
  let newAccessToken = '';
  let newRefreshToken = '';

  if (accessToken) {
    const check = await fetch(supabaseUrl + '/auth/v1/user', {
      headers: { apikey: supabaseKey, Authorization: 'Bearer ' + accessToken },
      cache: 'no-store',
    });
    if (check.ok) {
      authUser = await check.json().catch(() => null);
    }
  }

  if (!authUser?.id) {
    if (!refreshToken) return NextResponse.json({ ok: false }, { status: 401 });

    const refreshed = await fetch(supabaseUrl + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });
    if (!refreshed.ok) return NextResponse.json({ ok: false }, { status: 401 });

    const data = await refreshed.json().catch(() => null);
    if (!data?.access_token || !data?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
    authUser = data.user;
    newAccessToken = String(data.access_token);
    newRefreshToken = data.refresh_token ? String(data.refresh_token) : '';
  }

  let profile: any = null;
  try {
    const rows = await supabaseDb('users?id=eq.' + encodeURIComponent(String(authUser.id)) + '&select=id,email,role,full_name,avatar_url,country&limit=1');
    profile = Array.isArray(rows) ? rows[0] : null;
  } catch {}

  if (!profile?.role) return NextResponse.json({ ok: false }, { status: 401 });

  const response = NextResponse.json({ ok: true, user: { ...profile, fullName: profile.full_name } });
  if (newAccessToken) setAuthCookies(response, newAccessToken, newRefreshToken || undefined);
  return response;
}
