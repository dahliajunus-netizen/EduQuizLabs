import { NextRequest, NextResponse } from 'next/server';
import { csrfResponse } from '@/lib/server/csrf';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function setCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  response.cookies.set('eduquiz_access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  });
  response.cookies.set('eduquiz_refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function POST(request: NextRequest) {
  const blocked = csrfResponse(request);
  if (blocked) return blocked;
  try {
    if (!supabaseUrl || !supabaseAnonKey) return NextResponse.json({ error: 'Authentication configuration is missing.' }, { status: 500 });
    const refreshToken = request.cookies.get('eduquiz_refresh_token')?.value || '';
    if (!refreshToken) return NextResponse.json({ error: 'Refresh session not found.' }, { status: 401 });

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });
    const data = await authResponse.json().catch(() => ({}));
    if (!authResponse.ok || !data?.access_token || !data?.refresh_token) {
      const response = NextResponse.json({ error: 'Refresh session expired. Please sign in again.' }, { status: 401 });
      response.cookies.delete('eduquiz_access_token');
      response.cookies.delete('eduquiz_refresh_token');
      return response;
    }

    const response = NextResponse.json({ ok: true });
    setCookies(response, String(data.access_token), String(data.refresh_token));
    return response;
  } catch (error) {
    console.error('[Refresh API] Unexpected error:', error);
    return NextResponse.json({ error: 'Unable to refresh session.' }, { status: 500 });
  }
}
