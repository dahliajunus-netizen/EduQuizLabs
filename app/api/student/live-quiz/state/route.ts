import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser, supabaseDb } from '@/lib/server/supabase';
import { playerIdFromCookie } from '@/lib/server/live-quiz-player';

const q = (value: string) => encodeURIComponent(value);

const PLAYER_FIELDS = 'id,nickname,score,total_response_time_ms,correct_answers';

/**
 * Everything a player's screen needs for a live quiz, read with the server key.
 * Questions never include correct_answer, and only questions the teacher has
 * already reached are returned, so the answer key cannot be read from the
 * browser before or during a question.
 */
export async function GET(request: NextRequest) {
  const code = String(request.nextUrl.searchParams.get('code') || '').trim().toUpperCase();
  if (!code || code.length > 32) return NextResponse.json({ error: 'No live quiz code was found in this link.' }, { status: 400 });

  try {
    const quizzes = await supabaseDb(
      `live_quizzes?game_code=eq.${q(code)}&select=id,title,status,current_question,question_started_at,game_code&limit=1`,
    );
    const quiz = Array.isArray(quizzes) ? quizzes[0] : null;
    if (!quiz?.id || quiz.status === 'draft') return NextResponse.json({ error: 'Game not found.' }, { status: 404 });

    const allQuestions = await supabaseDb(
      `live_quiz_questions?quiz_id=eq.${q(quiz.id)}&select=id,question_order,question,option_a,option_b,option_c,option_d,time_limit_seconds&order=question_order.asc,id.asc`,
    );
    const questionRows = Array.isArray(allQuestions) ? allQuestions : [];
    const current = Number.isInteger(Number(quiz.current_question)) ? Number(quiz.current_question) : -1;
    const questions = quiz.status === 'lobby' ? [] : questionRows.slice(0, Math.max(0, current + 1));

    const user = await authenticatedUser(request).catch(() => null);
    const guestPlayerId = playerIdFromCookie(request, String(quiz.id));
    let player: any = null;
    if (user?.id) {
      const rows = await supabaseDb(`live_quiz_players?quiz_id=eq.${q(quiz.id)}&student_id=eq.${q(String(user.id))}&select=${PLAYER_FIELDS}&limit=1`);
      player = Array.isArray(rows) ? rows[0] || null : null;
    }
    if (!player && guestPlayerId) {
      const rows = await supabaseDb(`live_quiz_players?id=eq.${q(guestPlayerId)}&quiz_id=eq.${q(quiz.id)}&select=${PLAYER_FIELDS}&limit=1`);
      player = Array.isArray(rows) ? rows[0] || null : null;
    }

    let myAnswer: any = null;
    const currentQuestion = questions[current];
    if (player && currentQuestion && ['results', 'intermission'].includes(String(quiz.status))) {
      const rows = await supabaseDb(
        `live_quiz_answers?quiz_id=eq.${q(quiz.id)}&question_id=eq.${q(String(currentQuestion.id))}&player_id=eq.${q(String(player.id))}&select=answer,correct,response_time_ms&limit=1`,
      );
      myAnswer = Array.isArray(rows) ? rows[0] || null : null;
    }

    let ranking: any[] = [];
    if (quiz.status === 'finished') {
      const rows = await supabaseDb(`live_quiz_players?quiz_id=eq.${q(quiz.id)}&select=${PLAYER_FIELDS}&order=correct_answers.desc,total_response_time_ms.asc`);
      ranking = Array.isArray(rows) ? rows : [];
    }

    return NextResponse.json(
      { quiz, questions, total_questions: questionRows.length, player, my_answer: myAnswer, ranking },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[Student Live Quiz State API] GET failed:', error);
    return NextResponse.json({ error: 'Could not load quiz.' }, { status: 500 });
  }
}
