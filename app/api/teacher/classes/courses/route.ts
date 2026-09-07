import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireTeacher, requireTeacherClassOwnership } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

export async function GET(request: NextRequest) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const classCode = request.nextUrl.searchParams.get('class_code')?.trim().toUpperCase() || '';
  if (!classCode) return NextResponse.json({ error: 'Class code is required.' }, { status: 400 });

  try {
    const rows = await supabaseDb(
      `class_courses?class_code=eq.${encodeURIComponent(classCode)}&select=*&order=created_at.asc,id.asc`,
    );
    return NextResponse.json(Array.isArray(rows) ? rows : []);
  } catch (error) {
    console.error('[Class Courses API] GET failed:', error);
    return NextResponse.json({ error: 'Unable to load courses.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireTeacher(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await request.json();
    const classCode = typeof body?.class_code === 'string' ? body.class_code.trim().toUpperCase() : '';
    const courseName = typeof body?.course_name === 'string' ? body.course_name.trim() : '';
    if (!classCode || !courseName || courseName.length > 160) {
      return NextResponse.json({ error: 'Invalid course details.' }, { status: 400 });
    }
    if (!(await requireTeacherClassOwnership(user.id, classCode))) {
      return NextResponse.json({ error: 'You do not own this class.' }, { status: 403 });
    }

    const rows = await supabaseDb('class_courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ course_name: courseName, class_code: classCode }),
    });
    return NextResponse.json(Array.isArray(rows) ? rows : [], { status: 201 });
  } catch (error) {
    console.error('[Class Courses API] POST failed:', error);
    return NextResponse.json({ error: 'Unable to create course.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireTeacher(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id')?.trim() || '';
  if (!id) return NextResponse.json({ error: 'Course ID is required.' }, { status: 400 });

  try {
    const courses = await supabaseDb(`class_courses?id=eq.${encodeURIComponent(id)}&select=id,class_code&limit=1`);
    const course = Array.isArray(courses) ? courses[0] : null;
    if (!course?.class_code || !(await requireTeacherClassOwnership(user.id, String(course.class_code)))) {
      return NextResponse.json({ error: 'You do not own this course.' }, { status: 403 });
    }
    await supabaseDb(`class_courses?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[Class Courses API] DELETE failed:', error);
    return NextResponse.json({ error: 'Unable to delete course.' }, { status: 500 });
  }
}
