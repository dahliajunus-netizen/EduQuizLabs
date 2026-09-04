import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

function adminHeaders(json = false) {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, ...(json ? { 'Content-Type': 'application/json' } : {}) };
}

async function authenticatedUser(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ') || !supabaseUrl || !anonKey) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: auth }, cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}

async function supabase(path: string, init: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers: { ...adminHeaders(), ...(init.headers || {}) }, cache: 'no-store' });
  const text = await response.text();
  let data: any = null; try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(text || `Supabase request failed (${response.status}).`);
  return data;
}

export async function PATCH(request: NextRequest) {
  try {
    if (!supabaseUrl || !anonKey || !serviceKey) return NextResponse.json({ error: 'Server configuration is missing.' }, { status: 500 });
    const user = await authenticatedUser(request);
    if (!user?.id) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { testId, title, description, dueDate, testPassword, maxAttempts, allowReview } = body || {};
    if (!testId) return NextResponse.json({ error: 'Test ID is required.' }, { status: 400 });

    const tests = await supabase(`tests?id=eq.${encodeURIComponent(String(testId))}&select=id,class_code,course_id`);
    const test = Array.isArray(tests) ? tests[0] : null;
    if (!test) return NextResponse.json({ error: 'Test not found.' }, { status: 404 });

    const classCode = String(test.class_code || '').trim();
    if (!classCode) return NextResponse.json({ error: 'This test is not linked to a class.' }, { status: 400 });
    const classes = await supabase(`teacher_classes?code=eq.${encodeURIComponent(classCode)}&teacher_id=eq.${encodeURIComponent(String(user.id))}&select=id&limit=1`);
    if (!Array.isArray(classes) || !classes[0]) return NextResponse.json({ error: 'You are not authorized to edit this test.' }, { status: 403 });

    const cleanTitle = String(title ?? '').trim();
    if (!cleanTitle) return NextResponse.json({ error: 'Test title is required.' }, { status: 400 });
    const attempts = Number(maxAttempts);
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 100) return NextResponse.json({ error: 'Maximum attempts must be a whole number from 1 to 100.' }, { status: 400 });

    const update = {
      title: cleanTitle,
      description: String(description ?? '').trim() || null,
      due_date: dueDate ? String(dueDate) : null,
      test_password: String(testPassword ?? '').trim() || null,
      max_attempts: attempts,
      allow_review: allowReview !== false,
    };
    const updated = await supabase(`tests?id=eq.${encodeURIComponent(String(testId))}`, {
      method: 'PATCH',
      headers: { ...adminHeaders(true), Prefer: 'return=representation' },
      body: JSON.stringify(update),
    });
    if (!Array.isArray(updated) || !updated[0]) return NextResponse.json({ error: 'Test update returned no updated row.' }, { status: 500 });
    return NextResponse.json({ test: updated[0] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update test.' }, { status: 500 });
  }
}
