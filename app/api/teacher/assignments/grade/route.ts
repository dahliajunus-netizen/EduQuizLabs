import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, requireTeacherClassOwnership } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

const q = (value: string) => encodeURIComponent(value);

export async function PATCH(request: NextRequest) {
  const teacher = await requireTeacher(request);
  if (!teacher) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const submissionId = String(body?.submission_id || '').trim();
  const rawGrade = Number(body?.grade);

  if (!submissionId || !Number.isFinite(rawGrade)) {
    return NextResponse.json({ error: 'Submission and grade are required.' }, { status: 400 });
  }

  const grade = Math.max(0, Math.min(100, rawGrade));

  try {
    const rows = await supabaseDb(
      `assignment_submissions?id=eq.${q(submissionId)}&select=id,assignment_id,grade&limit=1`,
    );
    const submission = Array.isArray(rows) ? rows[0] : null;
    if (!submission?.id || !submission.assignment_id) {
      return NextResponse.json({ error: 'Assignment submission not found.' }, { status: 404 });
    }

    const assignments = await supabaseDb(
      `course_assignments?id=eq.${q(String(submission.assignment_id))}&select=id,course_id&limit=1`,
    );
    const assignment = Array.isArray(assignments) ? assignments[0] : null;
    if (!assignment?.course_id) {
      return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    }

    const courses = await supabaseDb(
      `class_courses?id=eq.${q(String(assignment.course_id))}&select=id,class_code&limit=1`,
    );
    const course = Array.isArray(courses) ? courses[0] : null;
    if (!course?.class_code || !(await requireTeacherClassOwnership(teacher.id, String(course.class_code)))) {
      return NextResponse.json({ error: 'You do not own this assignment.' }, { status: 403 });
    }

    const updated = await supabaseDb(
      `assignment_submissions?id=eq.${q(submissionId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ grade }),
      },
    );

    return NextResponse.json(Array.isArray(updated) ? updated[0] || null : updated);
  } catch (error) {
    console.error('[Teacher Assignment Grade API] PATCH failed:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unable to save assignment grade.',
    }, { status: 500 });
  }
}
