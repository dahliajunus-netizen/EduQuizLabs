import { NextRequest } from 'next/server';

/**
 * Cookie-authenticated state-changing requests must originate from this app.
 * Browsers set Origin/Referer themselves, so a cross-site page cannot forge
 * the expected value. This is defense-in-depth alongside SameSite cookies.
 */
export function sameOrigin(request: NextRequest): boolean {
  const targetOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  if (origin) return origin === targetOrigin;

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin === targetOrigin;
    } catch {
      return false;
    }
  }

  return false;
}

export function csrfResponse(request: NextRequest): Response | null {
  if (sameOrigin(request)) return null;
  return Response.json({ error: 'Cross-site request blocked.' }, { status: 403 });
}
