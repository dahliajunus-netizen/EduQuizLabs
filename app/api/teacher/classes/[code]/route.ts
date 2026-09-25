import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

function q(value: string) {
  return encodeURIComponent(value);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await requireTeacher(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { code: rawCode } = await params;
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Class code is required.' }, { status: 400 });

  try {
    const body = await request.json();
    const courseName = typeof body?.course_name === 'string' ? body.course_name.trim() : '';
    const itemType = body?.type === 'material' || body?.type === 'assignment' ? body.type : 'course';

    const classes = await supabaseDb(
      `teacher_classes?code=eq.${q(code)}&teacher_id=eq.${q(user.id)}&select=id,code`,
    );
    if (!Array.isArray(classes) || !classes[0]) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    }

    if (itemType === 'material') {
      const courseId = typeof body?.course_id === 'string' ? body.course_id.trim() : '';
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const link = typeof body?.link === 'string' ? body.link.trim() : '';
      if (!courseId || !name || !link) return NextResponse.json({ error: 'Material details are required.' }, { status: 400 });
      const courses = await supabaseDb(`class_courses?id=eq.${q(courseId)}&class_code=eq.${q(code)}&select=id`);
      if (!Array.isArray(courses) || !courses[0]) return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
      const rows = await supabaseDb('course_materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ course_id: courseId, name, link }),
      });
      return NextResponse.json(Array.isArray(rows) ? rows : [], { status: 201 });
    }

    if (itemType === 'assignment') {
      const courseId = typeof body?.course_id === 'string' ? body.course_id.trim() : '';
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const description = typeof body?.description === 'string' ? body.description.trim() : '';
      const dueDate = typeof body?.due_date === 'string' ? body.due_date : '';
      if (!courseId || !name || !description || !dueDate) return NextResponse.json({ error: 'Assignment details are required.' }, { status: 400 });
      const courses = await supabaseDb(`class_courses?id=eq.${q(courseId)}&class_code=eq.${q(code)}&select=id`);
      if (!Array.isArray(courses) || !courses[0]) return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
      const rows = await supabaseDb('course_assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ course_id: courseId, name, description, due_date: dueDate }),
      });
      return NextResponse.json(Array.isArray(rows) ? rows : [], { status: 201 });
    }

    if (!courseName || courseName.length > 120) {
      return NextResponse.json({ error: 'Invalid course name.' }, { status: 400 });
    }

    const rows = await supabaseDb('class_courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ course_name: courseName, class_code: code }),
    });

    return NextResponse.json(Array.isArray(rows) ? rows : [], { status: 201 });
  } catch (error) {
    console.error('[Teacher Class Course API] POST failed:', error);
    return NextResponse.json({ error: 'Unable to create course.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await requireTeacher(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { code: rawCode } = await params;
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Class code is required.' }, { status: 400 });

  try {
    const url = new URL(request.url);
    const table = String(url.searchParams.get('table') || '').trim();
    const id = String(url.searchParams.get('id') || '').trim();
    if (table !== 'course_materials' && table !== 'course_assignments' && table !== 'tests') {
      return NextResponse.json({ error: 'Unsupported resource.' }, { status: 400 });
    }
    if (!id) return NextResponse.json({ error: 'Resource id is required.' }, { status: 400 });

    const classes = await supabaseDb(
      `teacher_classes?code=eq.${q(code)}&teacher_id=eq.${q(user.id)}&select=id,code`,
    );
    if (!Array.isArray(classes) || !classes[0]) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    }

    const rows = await supabaseDb(
      `${table}?id=eq.${q(id)}&select=*`,
    );
    const resource = Array.isArray(rows) ? rows[0] : null;
    if (!resource) return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });

    if (table === 'course_materials' || table === 'course_assignments' || table === 'tests') {
      const courseId = String(resource.course_id || '').trim();
      if (!courseId) return NextResponse.json({ error: 'Resource course was not found.' }, { status: 404 });
      const courses = await supabaseDb(
        `class_courses?id=eq.${q(courseId)}&class_code=eq.${q(code)}&select=id`,
      );
      if (!Array.isArray(courses) || !courses[0]) {
        return NextResponse.json({ error: 'You do not own this class resource.' }, { status: 403 });
      }
    }

    await supabaseDb(`${table}?id=eq.${q(id)}`, { method: 'DELETE' });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Teacher Class Course API] DELETE failed:', error);
    return NextResponse.json({ error: 'Unable to delete resource.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await requireTeacher(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { code: rawCode } = await params;
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Class code is required.' }, { status: 400 });

  try {
    const classes = await supabaseDb(
      `teacher_classes?code=eq.${q(code)}&teacher_id=eq.${q(user.id)}&select=*`,
    );
    const classRow = Array.isArray(classes) ? classes[0] : null;
    if (!classRow) return NextResponse.json({ error: 'Class not found.' }, { status: 404 });

    const courses = await supabaseDb(
      `class_courses?class_code=eq.${q(code)}&select=*&order=created_at.asc,id.asc`,
    ) as any[];

    const materials: Record<string, any[]> = {};
    const assignments: Record<string, any[]> = {};
    const submissions: Record<string, any[]> = {};
    const tests: Record<string, any[]> = {};
    const questions: Record<string, any[]> = {};
    const attempts: Record<string, any[]> = {};
    const testSubmissions: Record<string, any[]> = {};

    await Promise.all((Array.isArray(courses) ? courses : []).map(async (course) => {
      if (!course?.id) return;
      const courseId = String(course.id);

      const [courseMaterials, courseAssignments, courseTests] = await Promise.all([
        supabaseDb(`course_materials?course_id=eq.${q(courseId)}&select=*`).catch(() => []),
        supabaseDb(`course_assignments?course_id=eq.${q(courseId)}&select=*&order=created_at.asc`).catch(() => []),
        supabaseDb(`tests?course_id=eq.${q(courseId)}&select=*&order=created_at.asc`).catch(() => []),
      ]);

      materials[courseId] = Array.isArray(courseMaterials) ? courseMaterials : [];
      assignments[courseId] = Array.isArray(courseAssignments) ? courseAssignments : [];
      tests[courseId] = Array.isArray(courseTests) ? courseTests : [];

      await Promise.all([
        ...assignments[courseId].filter((assignment: any) => assignment?.id).map(async (assignment: any) => {
          const id = String(assignment.id);
          submissions[id] = await supabaseDb(
            `assignment_submissions?assignment_id=eq.${q(id)}&select=*`,
          ).catch(() => []);
        }),
        ...tests[courseId].filter((test: any) => test?.id).map(async (test: any) => {
          const id = String(test.id);
          const [testQuestions, testAttempts, testSubmissionRows] = await Promise.all([
            supabaseDb(`test_questions?test_id=eq.${q(id)}&select=*&order=question_order.asc`).catch(() => []),
            supabaseDb(`test_attempts?test_id=eq.${q(id)}&select=*`).catch(() => []),
            supabaseDb(`test_submissions?test_id=eq.${q(id)}&select=*`).catch(() => []),
          ]);
          questions[id] = Array.isArray(testQuestions) ? testQuestions : [];
          attempts[id] = Array.isArray(testAttempts) ? testAttempts : [];
          testSubmissions[id] = Array.isArray(testSubmissionRows) ? testSubmissionRows : [];
        }),
      ]);
    }));
    const students = await supabaseDb(
      `student_classes?code=eq.${q(code)}&select=student_id`,
    ).catch(() => []) as any[];
    const ids = Array.from(new Set(
      (Array.isArray(students) ? students : [])
        .map(row => String(row?.student_id || '').trim())
        .filter(Boolean),
    ));

    let participants: any[] = [];
    if (ids.length) {
      const users = await supabaseDb(
        `users?id=in.(${ids.map(q).join(',')})&select=id,full_name,avatar_url`,
      ).catch(() => []) as any[];
      const byId = new Map((Array.isArray(users) ? users : []).map(row => [String(row.id), row]));
      participants = ids.map(studentId => {
        const profile = byId.get(studentId);
        return {
          student_id: studentId,
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        };
      });
    }

    return NextResponse.json({
      class: classRow,
      courses: Array.isArray(courses) ? courses : [],
      materials,
      assignments,
      submissions,
      tests,
      questions,
      attempts,
      testSubmissions,
      participants,
    });
  } catch (error) {
    console.error('[Teacher Class API] GET failed:', error);
    return NextResponse.json({ error: 'Unable to load teacher class data.' }, { status: 500 });
  }
}

