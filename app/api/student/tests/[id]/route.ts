import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser, serverConfigOk, supabaseDb, supabaseRpc } from '@/lib/server/supabase';
import { hashAssessmentPassword, verifyAssessmentPassword } from '@/lib/server/password';
import { assessmentPasswordRateLimited } from '@/lib/server/rate-limit';

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
}));

async function authorizeStudent(userId: string, test: any) {
  const code = String(test.class_code || '').trim();
  if (!code) return false;
  const rows = await supabaseDb(
    `student_classes?student_id=eq.${encodeURIComponent(userId)}&code=eq.${encodeURIComponent(code)}&select=code&limit=1`
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function getTest(id: string) {
  const rows = await supabaseDb(
    `tests?id=eq.${encodeURIComponent(id)}&select=id,class_code,course_id,title,description,published,due_date,time_limit_minutes,max_attempts,allow_review,test_password&limit=1`
  );
  return Array.isArray(rows) ? rows[0] : null;
}

async function getQuestions(id: string) {
  return supabaseDb(
    `test_questions?test_id=eq.${encodeURIComponent(id)}&select=id,test_id,question_order,question,question_type,option_a,option_b,option_c,option_d,correct_answer&order=question_order.asc,id.asc`
  );
}

async function getSubmissions(id: string, userId: string) {
  return supabaseDb(
    `test_submissions?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(userId)}&select=id,test_id,student_id,answers,score&order=id.desc`
  );
}

async function getAttempt(id: string, userId: string) {
  const rows = await supabaseDb(
    `test_attempts?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(userId)}&status=eq.in_progress&select=id,test_id,student_id,status,answers,started_at,updated_at&order=started_at.desc&limit=1`
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

function expired(attempt: any, test: any) {
  return Boolean(
    attempt?.started_at &&
    test?.time_limit_minutes &&
    Date.now() >= new Date(attempt.started_at).getTime() + Number(test.time_limit_minutes) * 60000
  );
}

function dueDatePassed(test: any) {
  return Boolean(test?.due_date && Date.now() >= new Date(test.due_date).getTime());
}

async function createAttempt(id: string, userId: string) {
  return supabaseRpc('start_test_attempt', { p_test_id: id, p_student_id: userId });
}

async function completeAttempt(attempt: any, answers: Record<string, unknown>) {
  return supabaseRpc('submit_test_attempt', {
    p_attempt_id: attempt.id,
    p_student_id: attempt.student_id,
    p_answers: answers,
  });
}

function rpcErrorCode(error: unknown) {
  const text = error instanceof Error ? error.message : String(error || '');
  if (text.includes('MAX_ATTEMPTS')) return 'MAX_ATTEMPTS';
  if (text.includes('ALREADY_SUBMITTED')) return 'ALREADY_SUBMITTED';
  if (text.includes('ATTEMPT_NOT_FOUND')) return 'ATTEMPT_NOT_FOUND';
  if (text.includes('TEST_NOT_FOUND')) return 'TEST_NOT_FOUND';
  if (text.includes('DUE_DATE_PASSED')) return 'DUE_DATE_PASSED';
  if (text.includes('TIME_LIMIT_EXPIRED')) return 'TIME_LIMIT_EXPIRED';
  return null;
}

function rpcErrorResponse(error: unknown) {
  const code = rpcErrorCode(error);
  if (code === 'MAX_ATTEMPTS') return NextResponse.json({ error: 'You have used all available attempts.' }, { status: 409 });
  if (code === 'DUE_DATE_PASSED') return NextResponse.json({ error: 'This test is past its due date.' }, { status: 409 });
  if (code === 'TIME_LIMIT_EXPIRED') return NextResponse.json({ error: 'This test attempt has expired.' }, { status: 409 });
  if (code === 'ALREADY_SUBMITTED') return NextResponse.json({ error: 'This attempt has already been submitted.' }, { status: 409 });
  if (code === 'ATTEMPT_NOT_FOUND') return NextResponse.json({ error: 'No active test attempt was found.' }, { status: 409 });
  return null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!serverConfigOk()) return NextResponse.json({ error: 'Server configuration is missing.' }, { status: 500 });
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
    if (!serverConfigOk()) return NextResponse.json({ error: 'Server configuration is missing.' }, { status: 500 });
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
      if (dueDatePassed(test)) return NextResponse.json({ error: 'This test is past its due date.' }, { status: 409 });

      const expected = String(test.test_password || '').trim();
      if (expected) {
        if (assessmentPasswordRateLimited(`${user.id}:${id}`)) {
          return NextResponse.json({ error: 'Too many password attempts. Please wait a minute and try again.' }, { status: 429 });
        }
        const result = await verifyAssessmentPassword(String(body?.password || ''), expected);
        if (!result.valid) return NextResponse.json({ error: 'Incorrect assessment password.' }, { status: 401 });
        if (result.legacy) {
          await supabaseDb(`tests?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test_password: await hashAssessmentPassword(expected) }),
          });
        }
      }

      if (submissions.length >= maxAttempts) return NextResponse.json({ error: 'You have used all available attempts.' }, { status: 409 });

      let attempt = await getAttempt(id, user.id);
      if (!attempt) {
        try {
          attempt = await createAttempt(id, user.id);
        } catch (error) {
          const response = rpcErrorResponse(error);
          if (response) return response;
          throw error;
        }
      }

      if (expired(attempt, test)) return NextResponse.json({ error: 'This test attempt has expired.' }, { status: 409 });
      return NextResponse.json({ test: safeTest(test), questions: safeQuestions(await getQuestions(id)), submissions, attempt });
    }

    const attempt = await getAttempt(id, user.id);
    if (!attempt) return NextResponse.json({ error: 'No active test attempt was found.' }, { status: 409 });
    const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {};

    if (action === 'save') {
      if (expired(attempt, test)) {
        try {
          const result = await completeAttempt(attempt, answers);
          return NextResponse.json({ ok: true, auto_submitted: true, ...result });
        } catch (error) {
          const response = rpcErrorResponse(error);
          if (response) return response;
          throw error;
        }
      }

      if (dueDatePassed(test)) return NextResponse.json({ error: 'This test is past its due date.' }, { status: 409 });

      const now = new Date().toISOString();
      await supabaseDb(
        `test_attempts?id=eq.${encodeURIComponent(attempt.id)}&student_id=eq.${encodeURIComponent(user.id)}&status=eq.in_progress`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, updated_at: now }),
        }
      );
      return NextResponse.json({ ok: true, saved_at: now });
    }

    if (action === 'submit') {
      try {
        const result = await completeAttempt(attempt, answers);
        return NextResponse.json(result);
      } catch (error) {
        const response = rpcErrorResponse(error);
        if (response) return response;
        throw error;
      }
    }

    return NextResponse.json({ error: 'Unknown test action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Test operation failed.' }, { status: 500 });
  }
}
