import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, requireTeacherClassOwnership } from '@/lib/server/auth';
import { csrfResponse } from '@/lib/server/csrf';
import { serverConfigOk, supabaseDb } from '@/lib/server/supabase';

async function ownedTest(userId: string, testId: string) {
  const rows = await supabaseDb(
    `tests?id=eq.${encodeURIComponent(testId)}&select=id,class_code&limit=1`,
  );
  const test = Array.isArray(rows) ? rows[0] : null;
  if (!test?.id || !test?.class_code) return null;
  return (await requireTeacherClassOwnership(userId, String(test.class_code))) ? test : null;
}

async function ownedQuestion(userId: string, questionId: string) {
  const rows = await supabaseDb(
    `test_questions?id=eq.${encodeURIComponent(questionId)}&select=id,test_id&limit=1`,
  );
  const question = Array.isArray(rows) ? rows[0] : null;
  if (!question?.id || !question?.test_id) return null;
  const test = await ownedTest(userId, String(question.test_id));
  return test ? question : null;
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
      const classes = await supabaseDb(
        `teacher_classes?teacher_id=eq.${encodeURIComponent(auth.user!.id)}&select=code`,
      );
      const codes = Array.isArray(classes)
        ? classes.map((row: any) => String(row.code || '').trim()).filter(Boolean)
        : [];
      if (!codes.length) return NextResponse.json([]);
      const encodedCodes = codes.map(code => `"${code.replace(/"/g, '\\"')}"`).join(',');
      const data = await supabaseDb(`tests?class_code=in.(${encodedCodes})&select=*&order=created_at.desc`);
      return NextResponse.json(data || []);
    }

    const testId = request.nextUrl.searchParams.get('test_id');
    if (!testId) return NextResponse.json({ error: 'test_id is required.' }, { status: 400 });
    if (!(await ownedTest(auth.user!.id, testId))) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    const data = await supabaseDb(`test_questions?test_id=eq.${encodeURIComponent(testId)}&select=*&order=question_order.asc`);
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
      if (!classCode || !(await requireTeacherClassOwnership(auth.user!.id, classCode))) {
        return NextResponse.json({ error: 'You are not authorized to create a test for this class.' }, { status: 403 });
      }
      const data = await supabaseDb('tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ ...body, class_code: classCode }),
      });
      return NextResponse.json(data || []);
    }

    if (table === 'test_questions') {
      const testId = String(body?.test_id || '').trim();
      if (!testId || !(await ownedTest(auth.user!.id, testId))) {
        return NextResponse.json({ error: 'You are not authorized to add a question to this test.' }, { status: 403 });
      }
      const data = await supabaseDb('test_questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(body),
      });
      return NextResponse.json(data || []);
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
      const data = await supabaseDb(`tests?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(body),
      });
      return NextResponse.json(data || []);
    }

    if (table === 'test_questions') {
      if (!(await ownedQuestion(auth.user!.id, id))) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
      const data = await supabaseDb(`test_questions?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(body),
      });
      return NextResponse.json(data || []);
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
      await supabaseDb(`tests?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return NextResponse.json({ ok: true });
    }

    if (table === 'test_questions') {
      if (!(await ownedQuestion(auth.user!.id, id))) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
      await supabaseDb(`test_questions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unsupported resource.' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete.' }, { status: 500 });
  }
}
