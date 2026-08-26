import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase public environment variables are missing.' }, { status: 500 });
    }
    if (!supabaseAdminKey) {
      return NextResponse.json({ error: 'Supabase admin key is missing. Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY to Vercel Environment Variables, then redeploy.' }, { status: 500 });
    }

    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    const fullName = String(body?.full_name ?? '').trim();
    const age = Number(body?.age);
    const birthday = String(body?.birthday ?? '').trim();
    const country = String(body?.country ?? '').trim();
    const role = body?.role === 'teacher' ? 'teacher' : 'student';

    if (!email || !password || !fullName || !birthday || !country || !Number.isInteger(age)) {
      return NextResponse.json({ error: 'Missing required signup information.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (role === 'teacher' && age < 21) {
      return NextResponse.json({ error: 'Teachers must be at least 21 years old.' }, { status: 400 });
    }

    // Admin-created users are confirmed immediately, so signup does not send a confirmation email.
    const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: supabaseAdminKey,
        Authorization: `Bearer ${supabaseAdminKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, age, birthday, country, role },
      }),
      cache: 'no-store',
    });

    const createData = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok || !createData?.id) {
      const message = String(createData?.msg || createData?.message || createData?.error_description || '').trim();
      const lower = message.toLowerCase();
      if (createResponse.status === 422 || lower.includes('already') || lower.includes('registered')) {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
      }
      console.error('[Signup API] Auth user creation failed:', createResponse.status, createData);
      return NextResponse.json({ error: message || 'Unable to create account.' }, { status: createResponse.status || 500 });
    }

    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok || !tokenData?.access_token || !tokenData?.user?.id) {
      console.error('[Signup API] User created but session creation failed:', tokenResponse.status, tokenData);
      return NextResponse.json({ error: 'Account was created, but automatic sign-in failed. Please sign in normally.' }, { status: 500 });
    }

    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      user: tokenData.user,
    });
  } catch (error) {
    console.error('[Signup API] Unexpected error:', error);
    return NextResponse.json({ error: 'Unable to connect to the authentication service.' }, { status: 500 });
  }
}
