import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/server/csrf';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/') && !SAFE_METHODS.has(request.method)) {
    if (!sameOrigin(request)) {
      return NextResponse.json({ error: 'Cross-site request blocked.' }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
