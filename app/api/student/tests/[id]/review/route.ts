import { NextRequest, NextResponse } from 'next/server';

const base = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const admin = () => ({ apikey: service, Authorization: `Bearer ${service}` });

async function user(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ') || !base || !anon) return null;
  const r = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: authorization }, cache: 'no-store' });
  return r.ok ? r.json() : null;
}
async function db(path: string) {
  const r = await fetch(`${base}/rest/v1/${path}`, { headers: admin(), cache: 'no-store' });
  const text = await r.text();
  if (!r.ok) throw new Error(text || `Database request failed (${r.status}).`);
  return text ? JSON.parse(text) : [];
}
function safeQuestions(rows: any[]) { return rows.map(q => ({ id:q.id, question_order:q.question_order, question:q.question, question_type:q.question_type, option_a:q.option_a, option_b:q.option_b, option_c:q.option_c, option_d:q.option_d, correct_answer:q.correct_answer, points:q.points })); }

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await user(request);
    if (!current?.id) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { id } = await params;
    const tests = await db(`tests?id=eq.${encodeURIComponent(id)}&published=eq.true&select=id,title,class_code,max_attempts,allow_review&limit=1`);
    const test = Array.isArray(tests) ? tests[0] : null;
    if (!test) return NextResponse.json({ error: 'Test not found or not published.' }, { status: 404 });
    if (test.allow_review === false) return NextResponse.json({ error: 'Review is not permitted for this test.' }, { status: 403 });
    const classes = await db(`student_classes?student_id=eq.${encodeURIComponent(current.id)}&code=eq.${encodeURIComponent(String(test.class_code || ''))}&select=code&limit=1`);
    if (!classes?.length) return NextResponse.json({ error: 'You are not enrolled in this class.' }, { status: 403 });
    const submissions = await db(`test_submissions?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(current.id)}&select=id,test_id,student_id,answers,score&order=id.desc`);
    if (!submissions?.length) return NextResponse.json({ error: 'No completed attempt was found.' }, { status: 404 });
    const questions = await db(`test_questions?test_id=eq.${encodeURIComponent(id)}&select=*&order=question_order.asc,id.asc`);
    return NextResponse.json({ test: { id:test.id, title:test.title, max_attempts:test.max_attempts, allow_review:test.allow_review }, submission: submissions[0], attempts_used: submissions.length, questions: safeQuestions(questions) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load review.' }, { status: 500 }); }
}
