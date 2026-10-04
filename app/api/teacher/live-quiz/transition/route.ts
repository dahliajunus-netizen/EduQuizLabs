import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, requireTeacherClassOwnership } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

const q = (value: string) => encodeURIComponent(value);

const transitions: Record<string, { status: string; allowed: string[] }> = {
  live_quiz_begin_answering: { status: 'answering', allowed: ['question_reveal'] },
  live_quiz_begin_results: { status: 'results', allowed: ['answering'] },
  live_quiz_begin_intermission: { status: 'intermission', allowed: ['results'] },
  live_quiz_finish_quiz: { status: 'finished', allowed: ['results', 'intermission', 'answering', 'question_reveal'] },
};

export async function POST(request: NextRequest) {
  const teacher = await requireTeacher(request);
  if (!teacher) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const action = String(body?.action || '').trim();
  const quizId = String(body?.quiz_id || '').trim();
  const questionIndex = Number(body?.question_index);

  if (!action || !quizId) {
    return NextResponse.json({ error: 'Action and quiz ID are required.' }, { status: 400 });
  }

  try {
    const rows = await supabaseDb(
      `live_quizzes?id=eq.${q(quizId)}&select=*&limit=1`,
    );
    const quiz = Array.isArray(rows) ? rows[0] : null;
    if (!quiz?.id) return NextResponse.json({ error: 'Live quiz not found.' }, { status: 404 });

    if (!(await requireTeacherClassOwnership(teacher.id, String(quiz.class_code || '')))) {
      return NextResponse.json({ error: 'You do not own this live quiz.' }, { status: 403 });
    }

    if (action === 'live_quiz_begin_reveal') {
      if (!Number.isInteger(questionIndex) || questionIndex < 0) {
        return NextResponse.json({ error: 'A valid question index is required.' }, { status: 400 });
      }

      const questions = await supabaseDb(
        `live_quiz_questions?quiz_id=eq.${q(quizId)}&question_order=eq.${questionIndex}&select=id&limit=1`,
      );
      if (!Array.isArray(questions) || !questions[0]?.id) {
        return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
      }

      if (!['lobby', 'intermission'].includes(String(quiz.status))) {
        return NextResponse.json({ error: `Cannot reveal a question from status "${quiz.status}".` }, { status: 409 });
      }

      const updated = await supabaseDb(
        `live_quizzes?id=eq.${q(quizId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify({
            status: 'question_reveal',
            current_question: questionIndex,
            question_started_at: new Date().toISOString(),
          }),
        },
      );
      return NextResponse.json(Array.isArray(updated) ? updated[0] || null : updated);
    }

    const transition = transitions[action];
    if (!transition) return NextResponse.json({ error: 'Unknown live quiz transition.' }, { status: 400 });

    if (!transition.allowed.includes(String(quiz.status))) {
      return NextResponse.json({
        error: `Cannot change live quiz from "${quiz.status}" to "${transition.status}".`,
      }, { status: 409 });
    }

    const updated = await supabaseDb(
      `live_quizzes?id=eq.${q(quizId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({
          status: transition.status,
          question_started_at: transition.status === 'finished' || transition.status === 'results' || transition.status === 'intermission'
            ? null
            : new Date().toISOString(),
        }),
      },
    );

    return NextResponse.json(Array.isArray(updated) ? updated[0] || null : updated);
  } catch (error) {
    console.error('[Teacher Live Quiz Transition API] POST failed:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unable to transition live quiz.',
    }, { status: 500 });
  }
}
