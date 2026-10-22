import type { NextResponse } from 'next/server';

export const ACCESS_TOKEN_COOKIE = 'eduquiz_access_token';
export const REFRESH_TOKEN_COOKIE = 'eduquiz_refresh_token';

// One lifetime for both cookies. The access token inside expires after about an
// hour; the middleware swaps it using the refresh token. Browsers cap cookie
// lifetimes at 400 days.
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
  };
}

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken?: string) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions());
  if (refreshToken) response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions());
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
}

/** True when the JWT is unreadable or expires within `skewSeconds`. Does not verify the signature. */
export function accessTokenExpiresSoon(token: string, skewSeconds = 60) {
  try {
    const part = token.split('.')[1] || '';
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const exp = Number(JSON.parse(atob(base64))?.exp);
    return !Number.isFinite(exp) || exp * 1000 - Date.now() < skewSeconds * 1000;
  } catch {
    return true;
  }
}
