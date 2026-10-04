import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireTeacher } from '@/lib/server/auth';
import { csrfResponse } from '@/lib/server/csrf';
import { serverConfigOk } from '@/lib/server/supabase';

const pool = new Pool({ connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL });

async function dbQuery<T = any>(text: string, values: any[] = []) {
  const result = await pool.query(text, values);
  return result.rows as T[];
}

async function ownsClass(userId: string, classCode: string) {
  const rows = await dbQuery(`SELECT 1 FROM teacher_classes WHERE teacher_id = $1 AND code = $2 LIMIT 1`, [userId, classCode]);
  return rows.length > 0;
}

async function getOwnedTest(userId: string, testId: string) {
  const rows = await dbQuery(`SELECT t.* FROM tests t JOIN teacher_classes c ON c.code = t.class_code WHERE t.id = $1 AND c.teacher_id = $2 LIMIT 1`, [testId, userId]);
  return rows[0] || null;
}

async function getOwnedQuestion(userId: string, questionId: string) {
  const rows = await dbQuery(`SELECT q.* FROM test_questions q JOIN tests t ON t.id = q.test_id JOIN teacher_classes c ON c.code = t.class_code WHERE q.id = $1 AND c.teacher_id = $2 LIMIT 1`, [questionId, userId]);
  return rows[0] || null;
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
      const data = await dbQuery(`SELECT * FROM tests WHERE class_code IN (SELECT code FROM teacher_classes WHERE teacher_id = $1) ORDER BY created_at DESC`, [auth.user!.id]);
      return NextResponse.json(data || []);
    }

    const testId = request.nextUrl.searchParams.get('test_id');
    if (!testId) return NextResponse.json({ error: 'test_id is required.' }, { status: 400 });
    if (!(await ownedTest(auth.user!.id, testId))) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    const data = await dbQuery(`SELECT * FROM test_questions WHERE test_id = $1 ORDER BY question_order ASC`, [testId]);
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
      const data = await dbQuery(`INSERT INTO tests (class_code, title, description, due_date, time_limit_minutes, published) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [classCode, String(body?.title || '').trim(), body?.description ?? null, body?.due_date ?? null, body?.time_limit_minutes ?? null, body?.published === true]);
      return NextResponse.json(data);
    }

    if (table === 'test_questions') {
      const testId = String(body?.test_id || '').trim();
      if (!testId || !(await ownedTest(auth.user!.id, testId))) {
        return NextResponse.json({ error: 'You are not authorized to add a question to this test.' }, { status: 403 });
      }
      const data = await dbQuery(`INSERT INTO test_questions (test_id, question_order, question, image_url, option_a, option_b, option_c, option_d, correct_answer, question_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [testId, body?.question_order, body?.question || '', body?.image_url ?? null, body?.option_a || '', body?.option_b || '', body?.option_c || '', body?.option_d || '', body?.correct_answer || 'A', body?.question_type || 'multiple_choice']);
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
      const data = await dbQuery(`UPDATE tests SET class_code=$1,title=$2,description=$3,due_date=$4,time_limit_minutes=$5 WHERE id=$6 RETURNING *`, [String(body?.class_code || '').trim().toUpperCase(), String(body?.title || '').trim(), body?.description ?? null, body?.due_date ?? null, body?.time_limit_minutes ?? null, id]);
      return NextResponse.json(data);
    }

    if (table === 'test_questions') {
      if (!(await ownedQuestion(auth.user!.id, id))) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
      const data = await dbQuery(`UPDATE test_questions SET question_order=$1,question=$2,image_url=$3,option_a=$4,option_b=$5,option_c=$6,option_d=$7,correct_answer=$8,question_type=$9,points=$10 WHERE id=$11 RETURNING *`, [body?.question_order, body?.question || '', body?.image_url ?? null, body?.option_a || '', body?.option_b || '', body?.option_c || '', body?.option_d || '', body?.correct_answer || 'A', body?.question_type || 'multiple_choice', body?.points ?? null, id]);
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
      await dbQuery(`DELETE FROM tests WHERE id = $1`, [id]);
      return NextResponse.json({ ok: true });
    }

    if (table === 'test_questions') {
      if (!(await ownedQuestion(auth.user!.id, id))) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
      await dbQuery(`DELETE FROM test_questions WHERE id = $1`, [id]);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unsupported resource.' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete.' }, { status: 500 });
  }
}
