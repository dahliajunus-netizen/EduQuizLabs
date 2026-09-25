import { NextRequest, NextResponse } from 'next/server';
import { requireStudent } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

const q = (value: string) => encodeURIComponent(value);

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await requireStudent(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { code: rawCode } = await params;
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Class code is required.' }, { status: 400 });

  try {
    const membership = await supabaseDb(
      `student_classes?student_id=eq.${q(user.id)}&code=eq.${q(code)}&select=*&limit=1`,
    );
    if (!Array.isArray(membership) || !membership[0]) {
      return NextResponse.json({ error: 'You are not a member of this class.' }, { status: 403 });
    }

    const classes = await supabaseDb(
      `teacher_classes?code=eq.${q(code)}&select=*&limit=1`,
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
          `assignment_submissions?assignment_id=eq.${q(String(assignment.id))}&student_id=eq.${q(user.id)}&select=*`,
        ).catch(() => []);
      }

      tests[courseId] = await supabaseDb(
        `tests?course_id=eq.${q(courseId)}&published=eq.true&select=*&order=created_at.asc`,
      ).catch(() => []);

      for (const test of tests[courseId]) {
        if (!test?.id) continue;
        questions[String(test.id)] = await supabaseDb(
          `test_questions?test_id=eq.${q(String(test.id))}&select=*&order=question_order.asc`,
        ).catch(() => []);
      }
    }

    return NextResponse.json({
      class: classRow,
      courses: Array.isArray(courses) ? courses : [],
      materials,
      assignments,
      submissions,
      tests,
      questions,
    });
  } catch (error) {
    console.error('[Student Class API] GET failed:', error);
    return NextResponse.json({ error: 'Unable to load class data.' }, { status: 500 });
  }
}
