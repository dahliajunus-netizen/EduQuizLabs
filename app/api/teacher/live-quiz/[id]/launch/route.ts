import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';
import { QUESTION_FIELDS, insertLiveQuiz, liveQuizQuestions, ownedLiveQuiz } from '@/lib/server/live-quiz';

/** Starts a live session (lobby) from a draft template by copying its questions. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher(request);
  if (!teacher) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { id } = await params;

  try {
    const template = await ownedLiveQuiz(teacher.id, String(id || ''));
    if (!template || !template.is_template) return NextResponse.json({ error: 'Live quiz not found.' }, { status: 404 });
    const source = await liveQuizQuestions(template.id);
    if (!source.length) return NextResponse.json({ error: 'Add at least one question first.' }, { status: 400 });

    const quiz = await insertLiveQuiz({
      title: template.title, class_code: template.class_code, teacher_id: teacher.id, status: 'lobby', current_question: -1, is_template: false,
    });
    let created: any;
    try {
      created = await supabaseDb(`live_quiz_questions?select=${QUESTION_FIELDS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(source.map((row: any, index: number) => ({
          quiz_id: quiz.id,
          question_order: index,
          question: row.question,
          option_a: row.option_a,
          option_b: row.option_b,
          option_c: row.option_c,
          option_d: row.option_d,
          correct_answer: row.correct_answer,
          time_limit_seconds: row.time_limit_seconds,
        }))),
      });
    } catch (error) {
      // Don't leave an empty lobby behind that students could join.
      await supabaseDb(`live_quizzes?id=eq.${encodeURIComponent(String(quiz.id))}`, { method: 'DELETE' }).catch(() => null);
      throw error;
    }
    const questions = (Array.isArray(created) ? created : []).sort((a: any, b: any) => Number(a.question_order) - Number(b.question_order));
    return NextResponse.json({ quiz, questions }, { status: 201 });
  } catch (error) {
    console.error('[Teacher Live Quiz Launch API] POST failed:', error);
    return NextResponse.json({ error: 'Could not launch quiz.' }, { status: 500 });
  }
}
