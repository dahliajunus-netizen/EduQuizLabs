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

function calculateExactAge(birthday: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birthDate = new Date(year, month - 1, day);

  if (
    !Number.isFinite(birthDate.getTime()) ||
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age--;
  if (age < 0 || age > 120) return null;
  return age;
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase public environment variables are missing.' }, { status: 500 });
    }
    if (!supabaseAdminKey) {
      return NextResponse.json({ error: 'Supabase admin key is missing.' }, { status: 500 });
    }

    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    const fullName = String(body?.full_name ?? '').trim();
    const birthday = String(body?.birthday ?? '').trim();
    const country = String(body?.country ?? '').trim();
    const role = body?.role === 'teacher' ? 'teacher' : 'student';

    if (!email || !password || !fullName || !birthday || !country) {
      return NextResponse.json({ error: 'Missing required signup information.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const age = calculateExactAge(birthday);
    if (age === null) {
      return NextResponse.json({ error: 'Please enter a valid birthday.' }, { status: 400 });
    }
    if (role === 'teacher' && age < 21) {
      return NextResponse.json({ error: 'Teachers must be at least 21 years old.' }, { status: 400 });
    }

    const metadata = { full_name: fullName, age, birthday, country, role };

    const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: supabaseAdminKey,
        Authorization: `Bearer ${supabaseAdminKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: metadata }),
      cache: 'no-store',
    });

    const createData = await createResponse.json().catch(() => ({}));

    if (!createResponse.ok || !createData?.id) {
      const message = String(createData?.msg || createData?.message || createData?.error_description || '').trim();
      const lower = message.toLowerCase();

      if (createResponse.status === 422 || lower.includes('already') || lower.includes('registered') || lower.includes('exists')) {
        // Do not enumerate existing accounts or temporarily modify their
        // verification state to test a password. Existing users should sign in
        // or use the normal password-recovery flow.
        return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 });
      }

      console.error('[Signup API] Auth user creation failed:', createResponse.status, createData);
      return NextResponse.json({ error: message || 'Unable to create account.' }, { status: createResponse.status || 500 });
    }

    const tokenSession = await createSession(email, password);
    if (!tokenSession.response.ok || !tokenSession.data?.access_token || !tokenSession.data?.user?.id) {
      console.error('[Signup API] User created but session creation failed:', tokenSession.response.status, tokenSession.data);
      return NextResponse.json({ error: 'Account was created, but automatic sign-in failed. Please sign in normally.' }, { status: 500 });
    }

    return NextResponse.json({
      access_token: tokenSession.data.access_token,
      refresh_token: tokenSession.data.refresh_token,
      user: tokenSession.data.user,
    });
  } catch (error) {
    console.error('[Signup API] Unexpected error:', error);
    return NextResponse.json({ error: 'Unable to connect to the authentication service.' }, { status: 500 });
  }
}
