import { NextRequest, NextResponse } from 'next/server';
import { csrfResponse } from '@/lib/server/csrf';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  response.cookies.set('eduquiz_access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  });

  if (refreshToken) {
    response.cookies.set('eduquiz_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

export async function POST(request: NextRequest) {
  const blocked = csrfResponse(request);
  if (blocked) return blocked;
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase configuration is missing.' }, { status: 500 });
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 8_192) {
      return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    }

    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    if (email.length > 254 || password.length > 128) {
      return NextResponse.json({ error: 'Invalid login information.' }, { status: 400 });
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
    const authData = await authResponse.json().catch(() => ({}));

    if (!authResponse.ok || !authData?.access_token || !authData?.user?.id) {
      const message = String(authData?.error_description || authData?.message || authData?.msg || '').trim();
      const lower = message.toLowerCase();
      if (lower.includes('email not confirmed') || lower.includes('confirm your email')) {
        return NextResponse.json({ error: 'Please confirm your email before signing in.' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const userId = String(authData.user.id);
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=id,full_name,email,role`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${authData.access_token}`,
        },
        cache: 'no-store',
      },
    );
    const rows = await profileResponse.json().catch(() => []);
    const profile = Array.isArray(rows) ? rows[0] : null;

    if (!profile) {
      console.error('[Login API] Auth succeeded but public.users profile was not found.');
      return NextResponse.json({ error: 'Your profile could not be loaded. Please try again.' }, { status: 500 });
    }

    const role = String(profile.role || 'student').trim().toLowerCase();
    const validRole = role === 'teacher' || role === 'student' ? role : 'student';

    const response = NextResponse.json({
      user: {
        id: userId,
        user_id: userId,
        student_id: validRole === 'student' ? userId : undefined,
        fullName: profile.full_name || authData.user.user_metadata?.full_name || 'User',
        email: profile.email || authData.user.email || email,
        role: validRole,
      },
    });

    setAuthCookies(response, String(authData.access_token), String(authData.refresh_token || ''));
    return response;
  } catch (error) {
    console.error('[Login API] Unexpected error:', error);
    return NextResponse.json({ error: 'Unable to connect to the authentication service.' }, { status: 500 });
  }
}
