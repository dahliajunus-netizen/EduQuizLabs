import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';
import { liveQuizQuestions, ownedLiveQuiz } from '@/lib/server/live-quiz';

const q = (value: string) => encodeURIComponent(value);

/**
 * Everything the teacher's host and analytics screens show for one quiz:
 * the quiz, its questions with answers, players, and every submitted answer.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher(request);
  if (!teacher) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { id } = await params;

  try {
    const quiz = await ownedLiveQuiz(teacher.id, String(id || ''));
    if (!quiz) return NextResponse.json({ error: 'Live quiz not found.' }, { status: 404 });

    const [questions, players, answers] = await Promise.all([
      liveQuizQuestions(quiz.id),
      supabaseDb(`live_quiz_players?quiz_id=eq.${q(quiz.id)}&select=id,nickname,score,total_response_time_ms,correct_answers&order=created_at.asc`),
      supabaseDb(`live_quiz_answers?quiz_id=eq.${q(quiz.id)}&select=player_id,question_id,answer,correct,response_time_ms,points_earned,answered_at&order=answered_at.asc`),
    ]);
    return NextResponse.json(
      { quiz, questions, players: Array.isArray(players) ? players : [], answers: Array.isArray(answers) ? answers : [], server_now: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[Teacher Live Quiz API] GET by id failed:', error);
    return NextResponse.json({ error: 'Could not load live quiz.' }, { status: 500 });
  }
}
