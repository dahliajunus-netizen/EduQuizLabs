import { NextRequest, NextResponse } from 'next/server';
import { requireStudent } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';
import { csrfResponse } from '@/lib/server/csrf';

export async function POST(request: NextRequest) {
  const auth = await requireStudent(request);
  if (!auth.ok) return auth.response;
  const csrf = csrfResponse(request);
  if (csrf) return csrf;

  const body = await request.json().catch(() => null);
  const assignmentId = String(body?.assignment_id || '').trim();
  const className = String(body?.class || '').trim();
  const link = String(body?.link || '').trim();

  if (!assignmentId || !className || !link) {
    return NextResponse.json({ error: 'Assignment, class, and submission link are required.' }, { status: 400 });
  }

  try {
    const parsed = new URL(link);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Submission link must use http or https.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Enter a valid submission link.' }, { status: 400 });
  }

  const assignments = await supabaseDb(
    `course_assignments?id=eq.${encodeURIComponent(assignmentId)}&select=id,course_id&limit=1`
  );
  const assignment = Array.isArray(assignments) ? assignments[0] : null;
  if (!assignment?.id || !assignment.course_id) {
    return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
  }

  const courses = await supabaseDb(
    `class_courses?id=eq.${encodeURIComponent(assignment.course_id)}&select=id,class_code&limit=1`
  );
  const course = Array.isArray(courses) ? courses[0] : null;
  if (!course?.class_code) {
    return NextResponse.json({ error: 'The assignment class could not be found.' }, { status: 404 });
  }

  const membership = await supabaseDb(
    `student_classes?student_id=eq.${encodeURIComponent(auth.user.id)}&code=eq.${encodeURIComponent(course.class_code)}&select=id&limit=1`
  );
  if (!Array.isArray(membership) || !membership[0]?.id) {
    return NextResponse.json({ error: 'You are not a member of this class.' }, { status: 403 });
  }

  const users = await supabaseDb(
    `users?id=eq.${encodeURIComponent(auth.user.id)}&select=full_name,name&limit=1`
  ).catch(() => []);
  const user = Array.isArray(users) ? users[0] : null;
  const nickname = String(body?.nickname || user?.full_name || user?.name || 'Student').trim() || 'Student';

  const existing = await supabaseDb(
    `assignment_submissions?assignment_id=eq.${encodeURIComponent(assignmentId)}&student_id=eq.${encodeURIComponent(auth.user.id)}&select=id&limit=1`
  );
  if (Array.isArray(existing) && existing[0]?.id) {
    return NextResponse.json({ error: 'You have already submitted this assignment.' }, { status: 409 });
  }

  const created = await supabaseDb('assignment_submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      assignment_id: assignmentId,
      student_id: auth.user.id,
      nickname,
      class: className,
      link,
    }),
  });

  return NextResponse.json(Array.isArray(created) ? created[0] || null : created, { status: 201 });
}
