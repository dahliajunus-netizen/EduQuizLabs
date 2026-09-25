import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

function q(value: string) {
  return encodeURIComponent(value);
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

    for (const course of Array.isArray(courses) ? courses : []) {
      if (!course?.id) continue;
      const courseId = String(course.id);
      materials[courseId] = await supabaseDb(
        `course_materials?course_id=eq.${q(courseId)}&select=*`,
      ).catch(() => []);
      assignments[courseId] = await supabaseDb(
        `course_assignments?course_id=eq.${q(courseId)}&select=*&order=created_at.asc`,
      ).catch(() => []);

      for (const assignment of assignments[courseId]) {
        if (!assignment?.id) continue;
        submissions[String(assignment.id)] = await supabaseDb(
          `assignment_submissions?assignment_id=eq.${q(String(assignment.id))}&select=*`,
        ).catch(() => []);
      }

      tests[courseId] = await supabaseDb(
        `tests?course_id=eq.${q(courseId)}&select=*&order=created_at.asc`,
      ).catch(() => []);

      for (const test of tests[courseId]) {
        if (!test?.id) continue;
        questions[String(test.id)] = await supabaseDb(
          `test_questions?test_id=eq.${q(String(test.id))}&select=*&order=question_order.asc`,
        ).catch(() => []);
        attempts[String(test.id)] = await supabaseDb(
          `test_attempts?test_id=eq.${q(String(test.id))}&select=*`,
        ).catch(() => []);
        testSubmissions[String(test.id)] = await supabaseDb(
          `test_submissions?test_id=eq.${q(String(test.id))}&select=*`,
        ).catch(() => []);
      }
    }

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
