import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/server/auth';
import { csrfResponse } from '@/lib/server/csrf';
import { serverConfigOk, supabaseDb } from '@/lib/server/supabase';

async function dbQuery(path: string, init: RequestInit = {}) {
  return supabaseDb(path, init);
}

async function ownsClass(userId: string, classCode: string) {
  const rows = await dbQuery(`teacher_classes?teacher_id=eq.${encodeURIComponent(userId)}&code=eq.${encodeURIComponent(classCode)}&select=id&limit=1`);
  return Array.isArray(rows) && Boolean(rows[0]);
}

async function courseForClass(userId: string, classCode: string, requestedCourseId?: string) {
  if (requestedCourseId) {
    const rows = await dbQuery(
      `class_courses?id=eq.${encodeURIComponent(requestedCourseId)}&class_code=eq.${encodeURIComponent(classCode)}&select=id&limit=1`,
    );
    return Array.isArray(rows) && rows[0] ? String(rows[0].id) : null;
  }
  const rows = await dbQuery(
    `class_courses?class_code=eq.${encodeURIComponent(classCode)}&select=id&order=created_at.asc,id.asc&limit=1`,
  );
  return Array.isArray(rows) && rows[0]?.id ? String(rows[0].id) : null;
}

async function getOwnedTest(userId: string, testId: string) {
  const tests = await dbQuery(`tests?id=eq.${encodeURIComponent(testId)}&select=*&limit=1`);
  const test = Array.isArray(tests) ? tests[0] : null;
  if (!test) return null;
  return await ownsClass(userId, String(test.class_code)) ? test : null;
}

async function getOwnedQuestion(userId: string, questionId: string) {
  const questions = await dbQuery(`test_questions?id=eq.${encodeURIComponent(questionId)}&select=*&limit=1`);
  const question = Array.isArray(questions) ? questions[0] : null;
  if (!question) return null;
  return await getOwnedTest(userId, String(question.test_id)) ? question : null;
}

async function ownedTest(userId: string, testId: string) {
  return getOwnedTest(userId, testId);
}

async function ownedQuestion(userId: string, questionId: string) {
  return getOwnedQuestion(userId, questionId);
}

async function authorize(request: NextRequest) {
  if (!serverConfigOk()) return { error: NextResponse.json({ error: 'Server configuration is missing.' }, { status: 500 }) };
  const user = await requireTeacher(request);
  if (!user) return { error: NextResponse.json({ error: 'Teacher authentication required.' }, { status: 401 }) };
  return { user };
}

function tableFromPath(request: NextRequest) {
  const parts = request.nextUrl.pathname.split('/').filter(Boolean);
  const table = parts[parts.length - 1];
  return table === 'tests' || table === 'test_questions' ? table : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const table = tableFromPath(request);
    if (!table) return NextResponse.json({ error: 'Unsupported resource.' }, { status: 404 });

    if (table === 'tests') {
      const data = await dbQuery(`tests?select=*&order=created_at.desc`);
      const owned = Array.isArray(data) ? data.filter((t: any) => t?.class_code && true) : [];
      const teacherClasses = await dbQuery(`teacher_classes?teacher_id=eq.${encodeURIComponent(auth.user!.id)}&select=code`);
      const codes = new Set((Array.isArray(teacherClasses) ? teacherClasses : []).map((c: any) => String(c.code)));
      return NextResponse.json(owned.filter((t: any) => codes.has(String(t.class_code))));
      return NextResponse.json(data || []);
    }

    const testId = request.nextUrl.searchParams.get('test_id');
    if (!testId) return NextResponse.json({ error: 'test_id is required.' }, { status: 400 });
    if (!(await ownedTest(auth.user!.id, testId))) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    const data = await dbQuery(`test_questions?test_id=eq.${encodeURIComponent(testId)}&select=*&order=question_order.asc`);
    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load tests.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const blocked = csrfResponse(request);
  if (blocked) return blocked;
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const table = tableFromPath(request);
    const body = await request.json().catch(() => ({}));

    if (table === 'tests') {
      const classCode = String(body?.class_code || '').trim().toUpperCase();
      if (!classCode || !(await ownsClass(auth.user!.id, classCode))) {
        return NextResponse.json({ error: 'You are not authorized to create a test for this class.' }, { status: 403 });
      }
      const courseId = await courseForClass(auth.user!.id, classCode, typeof body?.course_id === 'string' ? body.course_id.trim() : '');
      if (!courseId) return NextResponse.json({ error: 'This class has no course yet. Create a course for the class before creating a test.' }, { status: 400 });
      const data = await dbQuery(`tests`, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ course_id: courseId, class_code: classCode, title: String(body?.title || '').trim(), description: body?.description ?? null, due_date: body?.due_date ?? null, time_limit_minutes: body?.time_limit_minutes ?? null, published: body?.published === true }) });
      return NextResponse.json(data);
    }

    if (table === 'test_questions') {
      const testId = String(body?.test_id || '').trim();
      if (!testId || !(await ownedTest(auth.user!.id, testId))) {
        return NextResponse.json({ error: 'You are not authorized to add a question to this test.' }, { status: 403 });
      }
      const data = await dbQuery(`test_questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ test_id: testId, question_order: body?.question_order, question: body?.question || '', image_url: body?.image_url ?? null, option_a: body?.option_a || '', option_b: body?.option_b || '', option_c: body?.option_c || '', option_d: body?.option_d || '', correct_answer: body?.correct_answer || 'A', question_type: body?.question_type || 'multiple_choice' }) });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unsupported resource.' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const blocked = csrfResponse(request);
  if (blocked) return blocked;
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const table = tableFromPath(request);
    const body = await request.json().catch(() => ({}));
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

    if (table === 'tests') {
      if (!(await ownedTest(auth.user!.id, id))) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
      const patch: Record<string, unknown> = {};
      if (typeof body?.class_code === 'string') patch.class_code = body.class_code.trim().toUpperCase();
      if (typeof body?.title === 'string') patch.title = body.title.trim();
      if (Object.prototype.hasOwnProperty.call(body || {}, 'description')) patch.description = body.description ?? null;
      if (Object.prototype.hasOwnProperty.call(body || {}, 'due_date')) patch.due_date = body.due_date ?? null;
      if (Object.prototype.hasOwnProperty.call(body || {}, 'time_limit_minutes')) patch.time_limit_minutes = body.time_limit_minutes ?? null;
      if (typeof body?.published === 'boolean') patch.published = body.published;
      if (!Object.keys(patch).length) return NextResponse.json({ error: 'No test fields to update.' }, { status: 400 });
      const data = await dbQuery(`tests?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(patch) });
      return NextResponse.json(data);
    }

    if (table === 'test_questions') {
      if (!(await ownedQuestion(auth.user!.id, id))) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
      const data = await dbQuery(`test_questions?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ question_order: body?.question_order, question: body?.question || '', image_url: body?.image_url ?? null, option_a: body?.option_a || '', option_b: body?.option_b || '', option_c: body?.option_c || '', option_d: body?.option_d || '', correct_answer: body?.correct_answer || 'A', question_type: body?.question_type || 'multiple_choice', points: body?.points ?? null }) });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unsupported resource.' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const blocked = csrfResponse(request);
  if (blocked) return blocked;
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const table = tableFromPath(request);
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

    if (table === 'tests') {
      if (!(await ownedTest(auth.user!.id, id))) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
      await dbQuery(`tests?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return NextResponse.json({ ok: true });
    }

    if (table === 'test_questions') {
      if (!(await ownedQuestion(auth.user!.id, id))) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
      await dbQuery(`test_questions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unsupported resource.' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete.' }, { status: 500 });
  }
}
