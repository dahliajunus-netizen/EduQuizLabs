import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, requireTeacherClassOwnership } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

const ALLOWED = new Set([
  'class_courses',
  'course_materials',
  'course_assignments',
  'assignment_submissions',
  'tests',
  'test_questions',
  'test_submissions',
  'test_attempts',
]);

function value(request: NextRequest, key: string) {
  const raw = request.nextUrl.searchParams.get(key)?.trim() || '';
  const match = raw.match(/^eq\.([A-Za-z0-9-]+)$/);
  return (match?.[1] || raw).trim();
}

async function courseForResource(resource: string, request: NextRequest) {
  const id = value(request, 'id');
  const courseId = value(request, 'course_id');
  const assignmentId = value(request, 'assignment_id');
  const testId = value(request, 'test_id');

  if (resource === 'class_courses') {
    if (!id) return null;
    const rows = await supabaseDb(`class_courses?id=eq.${encodeURIComponent(id)}&select=id,class_code&limit=1`);
    const row = Array.isArray(rows) ? rows[0] : null;
    return row?.class_code ? { classCode: String(row.class_code) } : null;
  }

  if (resource === 'course_materials' || resource === 'course_assignments' || resource === 'tests') {
    if (!courseId) return null;
    const rows = await supabaseDb(`class_courses?id=eq.${encodeURIComponent(courseId)}&select=id,class_code&limit=1`);
    const row = Array.isArray(rows) ? rows[0] : null;
    return row?.class_code ? { classCode: String(row.class_code) } : null;
  }

  if (resource === 'assignment_submissions') {
    if (!assignmentId) return null;
    const rows = await supabaseDb(`course_assignments?id=eq.${encodeURIComponent(assignmentId)}&select=id,course_id&limit=1`);
    const assignment = Array.isArray(rows) ? rows[0] : null;
    if (!assignment?.course_id) return null;
    const courses = await supabaseDb(`class_courses?id=eq.${encodeURIComponent(String(assignment.course_id))}&select=id,class_code&limit=1`);
    const course = Array.isArray(courses) ? courses[0] : null;
    return course?.class_code ? { classCode: String(course.class_code) } : null;
  }

  if (resource === 'test_questions' || resource === 'test_submissions' || resource === 'test_attempts') {
    if (!testId) return null;
    const rows = await supabaseDb(`tests?id=eq.${encodeURIComponent(testId)}&select=id,course_id,class_code&limit=1`);
    const test = Array.isArray(rows) ? rows[0] : null;
    if (test?.class_code) return { classCode: String(test.class_code) };
    if (!test?.course_id) return null;
    const courses = await supabaseDb(`class_courses?id=eq.${encodeURIComponent(String(test.course_id))}&select=id,class_code&limit=1`);
    const course = Array.isArray(courses) ? courses[0] : null;
    return course?.class_code ? { classCode: String(course.class_code) } : null;
  }

  return null;
}

export async function DELETE(request: NextRequest) {
  const user = await requireTeacher(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const resource = request.nextUrl.searchParams.get('_resource')?.trim() || '';
  if (!ALLOWED.has(resource)) return NextResponse.json({ error: 'Invalid resource.' }, { status: 400 });

  try {
    const owner = await courseForResource(resource, request);
    if (!owner || !(await requireTeacherClassOwnership(user.id, owner.classCode))) {
      return NextResponse.json({ error: 'You do not own this class resource.' }, { status: 403 });
    }

    const filterKeys = ['id', 'course_id', 'assignment_id', 'test_id'];
    const filters = filterKeys
      .map((key) => [key, value(request, key)] as const)
      .filter(([, val]) => Boolean(val));
    if (filters.length !== 1) return NextResponse.json({ error: 'A single resource filter is required.' }, { status: 400 });

    const [key, val] = filters[0];
    await supabaseDb(`${resource}?${key}=eq.${encodeURIComponent(val)}`, { method: 'DELETE' });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[Class Resource Delete API] failed:', error);
    return NextResponse.json({ error: 'Unable to delete class resource.' }, { status: 500 });
  }
}
