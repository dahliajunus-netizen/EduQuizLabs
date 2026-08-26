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

    const metadata = { full_name: fullName, age, birthday, country, role };

    // Admin-created users are confirmed immediately, so normal signup does not
    // depend on confirmation emails or Supabase's email signup rate limit.
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
        user_metadata: metadata,
      }),
      cache: 'no-store',
    });

    const createData = await createResponse.json().catch(() => ({}));

    if (!createResponse.ok || !createData?.id) {
      const message = String(createData?.msg || createData?.message || createData?.error_description || '').trim();
      const lower = message.toLowerCase();

      // An older account may have been created before this endpoint started
      // confirming users automatically. If the person knows the password for
      // that existing account, confirm it and continue the normal login flow.
      if (createResponse.status === 422 || lower.includes('already') || lower.includes('registered') || lower.includes('exists')) {
        const usersResponse = await fetch(
          `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
          {
            method: 'GET',
            headers: {
              apikey: supabaseAdminKey,
              Authorization: `Bearer ${supabaseAdminKey}`,
            },
            cache: 'no-store',
          }
        );
        const usersData = await usersResponse.json().catch(() => ({}));
        const existingUser = Array.isArray(usersData?.users)
          ? usersData.users.find((user: any) => String(user?.email || '').toLowerCase() === email)
          : null;

        if (existingUser?.id) {
          // First verify that the submitted password belongs to the existing account.
          const session = await createSession(email, password);

          if (session.response.ok && session.data?.access_token && session.data?.user?.id) {
            // The password is correct, so this is the user's existing account.
            // Confirm it and refresh its profile metadata without creating a duplicate.
            const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existingUser.id}`, {
              method: 'PUT',
              headers: {
                apikey: supabaseAdminKey,
                Authorization: `Bearer ${supabaseAdminKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email_confirm: true,
                user_metadata: metadata,
              }),
              cache: 'no-store',
            });

            if (!updateResponse.ok) {
              console.error('[Signup API] Existing user confirmation/update failed:', await updateResponse.text());
            }

            return NextResponse.json({
              access_token: session.data.access_token,
              refresh_token: session.data.refresh_token,
              user: session.data.user,
              existing_account: true,
            });
          }

          return NextResponse.json({
            error: 'An account with this email already exists. The password you entered does not match that account. Please sign in with the existing password or use Forgot password.',
          }, { status: 409 });
        }

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
