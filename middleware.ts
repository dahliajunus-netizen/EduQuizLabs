import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/server/csrf';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenExpiresSoon,
  clearAuthCookies,
  setAuthCookies,
} from '@/lib/server/auth-cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

/**
 * Supabase refresh tokens are single-use. Refreshing here, once per request,
 * lets us both hand the new access token to the route handler and store the
 * rotated tokens in the browser's cookies. Routes under /api/auth/ manage the
 * cookies themselves.
 */
async function withFreshSession(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || '';
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value || '';
  if (!refreshToken || !supabaseUrl || !supabaseAnonKey) return NextResponse.next();
  if (accessToken && !accessTokenExpiresSoon(accessToken)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith('/api/auth/')) return NextResponse.next();

  try {
    const refreshed = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });
    const data = await refreshed.json().catch(() => null);
    if (!refreshed.ok || !data?.access_token || !data?.refresh_token) {
      // A rejected refresh token will never work again; stop retrying it on every request.
      if (refreshed.status === 400 || refreshed.status === 401) {
        const response = NextResponse.next();
        clearAuthCookies(response);
        return response;
      }
      return NextResponse.next();
    }

    request.cookies.set(ACCESS_TOKEN_COOKIE, String(data.access_token));
    request.cookies.set(REFRESH_TOKEN_COOKIE, String(data.refresh_token));
    const response = NextResponse.next({ request: { headers: request.headers } });
    setAuthCookies(response, String(data.access_token), String(data.refresh_token));
    return response;
  } catch (error) {
    console.error('[Middleware] Session refresh failed:', error);
    return NextResponse.next();
  }
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/') && !SAFE_METHODS.has(request.method)) {
    if (!sameOrigin(request)) {
      return NextResponse.json({ error: 'Cross-site request blocked.' }, { status: 403 });
    }
  }
  return withFreshSession(request);
}

export const config = {
  matcher: ['/api/:path*'],
};
