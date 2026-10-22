import { NextRequest, NextResponse } from 'next/server';
import { csrfResponse } from '@/lib/server/csrf';
import { clearAuthCookies } from '@/lib/server/auth-cookies';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function POST(request: NextRequest) {
  const blocked = csrfResponse(request);
  if (blocked) return blocked;

  const response = NextResponse.json({ ok: true });
  const accessToken = request.cookies.get('eduquiz_access_token')?.value || '';

  if (accessToken && supabaseUrl && supabaseAnonKey) {
    try {
      await fetch(`${supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
    } catch (error) {
      console.error('[Logout API] Supabase logout failed:', error);
    }
  }

  clearAuthCookies(response);
  return response;
}
