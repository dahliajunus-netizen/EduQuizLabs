import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, requireTeacherClassOwnership } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';
import { QUIZ_FIELDS, insertLiveQuiz } from '@/lib/server/live-quiz';

/** The teacher's live quiz templates (drafts that live sessions are launched from). */
export async function GET(request: NextRequest) {
  const teacher = await requireTeacher(request);
  if (!teacher) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const rows = await supabaseDb(
      `live_quizzes?teacher_id=eq.${encodeURIComponent(teacher.id)}&is_template=eq.true&status=eq.draft&select=${QUIZ_FIELDS}&order=created_at.desc`,
    );
    return NextResponse.json(Array.isArray(rows) ? rows : []);
  } catch (error) {
    console.error('[Teacher Live Quiz API] GET failed:', error);
    return NextResponse.json({ error: 'Could not load live quizzes.' }, { status: 500 });
  }
}

/** Creates a new template for one of the teacher's classes. */
export async function POST(request: NextRequest) {
  const teacher = await requireTeacher(request);
  if (!teacher) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const title = String(body?.title || '').trim();
  const classCode = String(body?.class_code || '').trim().toUpperCase();
  if (!title || title.length > 120 || !classCode) return NextResponse.json({ error: 'Choose a class and enter a title.' }, { status: 400 });

  try {
    if (!(await requireTeacherClassOwnership(teacher.id, classCode))) {
      return NextResponse.json({ error: 'You do not own this class.' }, { status: 403 });
    }
    const quiz = await insertLiveQuiz({
      title, class_code: classCode, teacher_id: teacher.id, status: 'draft', current_question: -1, is_template: true,
    }, 'TEMPLATE-');
    return NextResponse.json(quiz, { status: 201 });
  } catch (error) {
    console.error('[Teacher Live Quiz API] POST failed:', error);
    return NextResponse.json({ error: 'Could not create quiz.' }, { status: 500 });
  }
}
