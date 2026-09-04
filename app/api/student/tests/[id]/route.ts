import { NextRequest, NextResponse } from 'next/server';
import { calculateScore } from '@/lib/quiz/scoring';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

function adminHeaders(json = false) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function userToken(request: NextRequest) {
  const value = request.headers.get('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

async function authenticatedUser(request: NextRequest) {
  const token = userToken(request);
  if (!token || !supabaseUrl || !anonKey) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchJson(path: string, init: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init.headers || {}) },
    cache: 'no-store',
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw new Error(text || `Supabase request failed (${response.status}).`);
  return data;
}

const safeTest = (test: any) => ({
  id: test.id,
  class_code: test.class_code,
  course_id: test.course_id,
  title: test.title,
  description: test.description,
  published: test.published,
  due_date: test.due_date,
  time_limit_minutes: test.time_limit_minutes,
  max_attempts: test.max_attempts,
  allow_review: test.allow_review,
  requires_password: Boolean(String(test.test_password || '').trim()),
});

const safeQuestions = (rows: any[]) => rows.map(q => ({
  id: q.id,
  test_id: q.test_id,
  question_order: q.question_order,
  question: q.question,
  question_type: q.question_type,
  option_a: q.option_a,
  option_b: q.option_b,
  option_c: q.option_c,
  option_d: q.option_d,
  points: q.points,
}));

async function authorizeStudent(userId: string, test: any) {
  const code = String(test.class_code || '').trim();
  if (!code) return false;
  const rows = await fetchJson(`student_classes?student_id=eq.${encodeURIComponent(userId)}&code=eq.${encodeURIComponent(code)}&select=code&limit=1`);
  return Array.isArray(rows) && rows.length > 0;
}

async function getTest(id: string) {
  const rows = await fetchJson(`tests?id=eq.${encodeURIComponent(id)}&select=id,class_code,course_id,title,description,published,due_date,time_limit_minutes,max_attempts,allow_review,test_password&limit=1`);
  return Array.isArray(rows) ? rows[0] : null;
}

async function getQuestions(id: string) {
  return await fetchJson(`test_questions?test_id=eq.${encodeURIComponent(id)}&select=id,test_id,question_order,question,question_type,option_a,option_b,option_c,option_d,correct_answer,points&order=question_order.asc,id.asc`);
}

async function getSubmissions(id: string, userId: string) {
  return await fetchJson(`test_submissions?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(userId)}&select=id,test_id,student_id,answers,score&order=id.desc`);
}

async function getAttempt(id: string, userId: string) {
  const rows = await fetchJson(`test_attempts?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(userId)}&status=eq.in_progress&select=id,test_id,student_id,status,answers,started_at,updated_at&order=started_at.desc&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function ensureAttempt(id: string, userId: string, existing: any) {
  if (existing) return existing;
  const now = new Date().toISOString();
  const rows = await fetchJson('test_attempts', {
    method: 'POST',
    headers: { ...adminHeaders(true), Prefer: 'return=representation' },
    body: JSON.stringify({ test_id: id, student_id: userId, status: 'in_progress', answers: {}, started_at: now, updated_at: now }),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

function expired(attempt: any, test: any) {
  if (!attempt?.started_at || !test?.time_limit_minutes) return false;
  return Date.now() >= new Date(attempt.started_at).getTime() + Number(test.time_limit_minutes) * 60000;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticatedUser(request);
    if (!user?.id) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { id } = await params;
    const test = await getTest(id);
    if (!test || test.published === false) return NextResponse.json({ error: 'Test not found or not published.' }, { status: 404 });
    if (!(await authorizeStudent(user.id, test))) return NextResponse.json({ error: 'You are not enrolled in this class.' }, { status: 403 });
    const submissions = await getSubmissions(id, user.id);
    const maxAttempts = Math.max(1, Number(test.max_attempts) || 1);
    const attempt = submissions.length < maxAttempts ? await getAttempt(id, user.id) : null;
    const questions = String(test.test_password || '').trim() ? [] : safeQuestions(await getQuestions(id));
    return NextResponse.json({ test: safeTest(test), submissions, attempt, questions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load test.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticatedUser(request);
    if (!user?.id) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { id } = await params;
    const test = await getTest(id);
    if (!test || test.published === false) return NextResponse.json({ error: 'Test not found or not published.' }, { status: 404 });
    if (!(await authorizeStudent(user.id, test))) return NextResponse.json({ error: 'You are not enrolled in this class.' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || 'access');
    const submissions = await getSubmissions(id, user.id);
    const maxAttempts = Math.max(1, Number(test.max_attempts) || 1);

    if (action === 'access') {
      const expected = String(test.test_password || '').trim();
      if (expected && String(body?.password || '') !== expected) return NextResponse.json({ error: 'Incorrect assessment password.' }, { status: 401 });
      if (submissions.length >= maxAttempts) return NextResponse.json({ error: 'You have used all available attempts.' }, { status: 409 });
      const attempt = await ensureAttempt(id, user.id, await getAttempt(id, user.id));
      if (expired(attempt, test)) return NextResponse.json({ error: 'This test attempt has expired.' }, { status: 409 });
      return NextResponse.json({ test: safeTest(test), questions: safeQuestions(await getQuestions(id)), submissions, attempt });
    }

    const attempt = await getAttempt(id, user.id);
    if (!attempt) return NextResponse.json({ error: 'No active test attempt was found.' }, { status: 409 });

    if (action === 'save') {
      const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {};
      if (expired(attempt, test)) {
        const questions = await getQuestions(id);
        const score = calculateScore(questions, answers);
        const created = await fetchJson('test_submissions', {
          method: 'POST',
          headers: { ...adminHeaders(true), Prefer: 'return=representation' },
          body: JSON.stringify({ test_id: id, student_id: user.id, answers, score }),
        });
        const now = new Date().toISOString();
        await fetchJson(`test_attempts?id=eq.${encodeURIComponent(attempt.id)}`, {
          method: 'PATCH',
          headers: { ...adminHeaders(true), Prefer: 'return=minimal' },
          body: JSON.stringify({ answers, status: 'completed', updated_at: now, completed_at: now }),
        });
        return NextResponse.json({ ok: true, auto_submitted: true, submission: Array.isArray(created) ? created[0] : created, score });
      }
      const now = new Date().toISOString();
      await fetchJson(`test_attempts?id=eq.${encodeURIComponent(attempt.id)}`, {
        method: 'PATCH',
        headers: { ...adminHeaders(true), Prefer: 'return=minimal' },
        body: JSON.stringify({ answers, status: 'in_progress', updated_at: now }),
      });
      return NextResponse.json({ ok: true, saved_at: now });
    }

    if (action === 'submit') {
      if (submissions.length >= maxAttempts) return NextResponse.json({ error: 'You have used all available attempts.' }, { status: 409 });
      const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {};
      const questions = await getQuestions(id);
      const score = calculateScore(questions, answers);
      const created = await fetchJson('test_submissions', {
        method: 'POST',
        headers: { ...adminHeaders(true), Prefer: 'return=representation' },
        body: JSON.stringify({ test_id: id, student_id: user.id, answers, score }),
      });
      const now = new Date().toISOString();
      await fetchJson(`test_attempts?id=eq.${encodeURIComponent(attempt.id)}`, {
        method: 'PATCH',
        headers: { ...adminHeaders(true), Prefer: 'return=minimal' },
        body: JSON.stringify({ answers, status: 'completed', updated_at: now, completed_at: now }),
      });
      return NextResponse.json({ submission: Array.isArray(created) ? created[0] : created, score });
    }

    return NextResponse.json({ error: 'Unknown test action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Test operation failed.' }, { status: 500 });
  }
}
