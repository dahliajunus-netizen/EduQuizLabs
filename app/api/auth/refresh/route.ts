import { NextRequest, NextResponse } from 'next/server';
import { csrfResponse } from '@/lib/server/csrf';
import { clearAuthCookies, setAuthCookies } from '@/lib/server/auth-cookies';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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
      clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, String(data.access_token), String(data.refresh_token));
    return response;
  } catch (error) {
    console.error('[Refresh API] Unexpected error:', error);
    return NextResponse.json({ error: 'Unable to refresh session.' }, { status: 500 });
  }
}
