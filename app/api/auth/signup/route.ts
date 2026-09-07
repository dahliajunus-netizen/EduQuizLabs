import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

async function createSession(email: string, password: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: supabaseAnonKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function consumeRateLimit(key: string, limit: number, windowSeconds = 3600) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_signup_rate_limit`, {
    method: 'POST',
    headers: { apikey: supabaseAdminKey!, Authorization: `Bearer ${supabaseAdminKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: windowSeconds }),
    cache: 'no-store',
  });
  if (!response.ok) return false;
  return (await response.json().catch(() => false)) === true;
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 100);
  return (request.headers.get('x-real-ip') || 'unknown').trim().slice(0, 100);
}

function calculateExactAge(birthday: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const birthDate = new Date(year, month - 1, day);
  if (!Number.isFinite(birthDate.getTime()) || birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age--;
  if (age < 0 || age > 120) return null;
  return age;
}

function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  response.cookies.set('eduquiz_access_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 });
  if (refreshToken) response.cookies.set('eduquiz_refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) return NextResponse.json({ error: 'Supabase public environment variables are missing.' }, { status: 500 });
    if (!supabaseAdminKey) return NextResponse.json({ error: 'Supabase admin key is missing.' }, { status: 500 });
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 16_384) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });

    const clientIp = getClientIp(request);
    if (!(await consumeRateLimit(`ip:${clientIp || 'unknown'}`, 10))) return NextResponse.json({ error: 'Too many signup attempts. Please try again later.' }, { status: 429 });

    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    const fullName = String(body?.full_name ?? '').trim();
    const birthday = String(body?.birthday ?? '').trim();
    const country = String(body?.country ?? '').trim();
    const role = body?.role === 'teacher' ? 'teacher' : 'student';

    if (!email || !password || !fullName || !birthday || !country) return NextResponse.json({ error: 'Missing required signup information.' }, { status: 400 });
    if (email.length > 254 || fullName.length > 120 || country.length > 100) return NextResponse.json({ error: 'One or more signup fields are too long.' }, { status: 400 });
    if (password.length < 8 || password.length > 128) return NextResponse.json({ error: 'Password must be between 8 and 128 characters long.' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    if (!(await consumeRateLimit(`email:${email}`, 5))) return NextResponse.json({ error: 'Too many signup attempts for this email. Please try again later.' }, { status: 429 });

    const age = calculateExactAge(birthday);
    if (age === null) return NextResponse.json({ error: 'Please enter a valid birthday.' }, { status: 400 });
    if (role === 'teacher' && age < 21) return NextResponse.json({ error: 'Teachers must be at least 21 years old.' }, { status: 400 });

    const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { apikey: supabaseAdminKey, Authorization: `Bearer ${supabaseAdminKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName, age, birthday, country, role } }),
      cache: 'no-store',
    });
    const createData = await createResponse.json().catch(() => ({}));

    if (!createResponse.ok || !createData?.id) {
      const message = String(createData?.msg || createData?.message || createData?.error_description || '').trim();
      const lower = message.toLowerCase();
      if (createResponse.status === 422 || lower.includes('already') || lower.includes('registered') || lower.includes('exists')) return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 });
      console.error('[Signup API] Auth user creation failed:', createResponse.status, createData);
      return NextResponse.json({ error: message || 'Unable to create account.' }, { status: createResponse.status || 500 });
    }

    const tokenSession = await createSession(email, password);
    if (!tokenSession.response.ok || !tokenSession.data?.access_token || !tokenSession.data?.user?.id) {
      console.error('[Signup API] User created but session creation failed:', tokenSession.response.status, tokenSession.data);
      return NextResponse.json({ error: 'Account was created, but automatic sign-in failed. Please sign in normally.' }, { status: 500 });
    }

    const response = NextResponse.json({
      // Legacy signup UI still checks this property. It is deliberately NOT
      // the real token; the real credential is only delivered as an HttpOnly cookie.
      access_token: 'cookie-managed',
      user: tokenSession.data.user,
    });
    setAuthCookies(response, String(tokenSession.data.access_token), String(tokenSession.data.refresh_token || ''));
    return response;
  } catch (error) {
    console.error('[Signup API] Unexpected error:', error);
    return NextResponse.json({ error: 'Unable to connect to the authentication service.' }, { status: 500 });
  }
}
