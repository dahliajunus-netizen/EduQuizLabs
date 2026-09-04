import { NextRequest, NextResponse } from 'next/server';

const base = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

function adminHeaders() {
  return { apikey: service, Authorization: `Bearer ${service}` };
}

async function authenticatedUser(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ') || !base || !anon) return null;
  const response = await fetch(`${base}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: authorization },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return response.json();
}

async function db(path: string) {
  const response = await fetch(`${base}/rest/v1/${path}`, {
    headers: adminHeaders(),
    cache: 'no-store',
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Database request failed (${response.status}).`);
  return text ? JSON.parse(text) : [];
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticatedUser(request);
    if (!user?.id) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    if (!base || !service) return NextResponse.json({ error: 'Server configuration is missing.' }, { status: 500 });

    const classes = await db(
      `student_classes?student_id=eq.${encodeURIComponent(user.id)}&select=code`
    );
    const codes = [...new Set(
      (Array.isArray(classes) ? classes : [])
        .map((row: any) => String(row.code || '').trim())
        .filter(Boolean),
    )];

    if (!codes.length) return NextResponse.json({ tests: [], submissions: [] });

    const filter = codes.map(code => `"${code.replace(/"/g, '\\"')}"`).join(',');
    const tests = await db(
      `tests?published=eq.true&class_code=in.(${filter})&select=id,class_code,title,description,published,created_at,due_date,time_limit_minutes,max_attempts,allow_review&order=created_at.desc`
    );
    const submissions = await db(
      `test_submissions?student_id=eq.${encodeURIComponent(user.id)}&select=id,test_id,student_id,score&order=id.desc`
    );

    return NextResponse.json({ tests: Array.isArray(tests) ? tests : [], submissions: Array.isArray(submissions) ? submissions : [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load tests.' }, { status: 500 });
  }
}
