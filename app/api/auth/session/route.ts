import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function setCookie(response: NextResponse, name: string, value: string, maxAge: number) {
  response.cookies.set(name, value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge });
}

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ ok: false }, { status: 500 });
  const accessToken = request.cookies.get('eduquiz_access_token')?.value || '';
  const refreshToken = request.cookies.get('eduquiz_refresh_token')?.value || '';
  if (!accessToken && !refreshToken) return NextResponse.json({ ok: false }, { status: 401 });
  if (accessToken) {
    const check = await fetch(supabaseUrl + '/auth/v1/user', { headers: { apikey: supabaseKey, Authorization: 'Bearer ' + accessToken }, cache: 'no-store' });
    if (check.ok) return NextResponse.json({ ok: true });
  }
  if (!refreshToken) return NextResponse.json({ ok: false }, { status: 401 });
  const refreshed = await fetch(supabaseUrl + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refreshToken }), cache: 'no-store' });
  if (!refreshed.ok) return NextResponse.json({ ok: false }, { status: 401 });
  const data = await refreshed.json().catch(() => null);
  if (!data?.access_token || !data?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  const tenYears = 60 * 60 * 24 * 365 * 10;
  setCookie(response, 'eduquiz_access_token', String(data.access_token), tenYears);
  if (data.refresh_token) setCookie(response, 'eduquiz_refresh_token', String(data.refresh_token), tenYears);
  return response;
}