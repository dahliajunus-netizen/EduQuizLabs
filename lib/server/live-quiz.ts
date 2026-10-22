import { randomInt } from 'crypto';
import { requireTeacherClassOwnership } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

const q = (value: string) => encodeURIComponent(value);
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const QUIZ_FIELDS = 'id,title,class_code,teacher_id,game_code,status,current_question,is_template,question_started_at,created_at';
export const QUESTION_FIELDS = 'id,quiz_id,question_order,question,option_a,option_b,option_c,option_d,correct_answer,time_limit_seconds';

export function generateGameCode(length = 6) {
  return Array.from({ length }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
}

/** The live quiz, if this teacher created it or owns its class. */
export async function ownedLiveQuiz(teacherId: string, quizId: string) {
  if (!quizId) return null;
  const rows = await supabaseDb(`live_quizzes?id=eq.${q(quizId)}&select=${QUIZ_FIELDS}&limit=1`);
  const quiz = Array.isArray(rows) ? rows[0] : null;
  if (!quiz) return null;
  if (String(quiz.teacher_id || '') === teacherId) return quiz;
  return quiz.class_code && (await requireTeacherClassOwnership(teacherId, String(quiz.class_code))) ? quiz : null;
}

export async function liveQuizQuestions(quizId: string) {
  const rows = await supabaseDb(`live_quiz_questions?quiz_id=eq.${q(quizId)}&select=${QUESTION_FIELDS}&order=question_order.asc,id.asc`);
  return Array.isArray(rows) ? rows : [];
}

/** Inserts a live quiz, retrying with a new game code if the code is already taken. */
export async function insertLiveQuiz(fields: Record<string, unknown>, codePrefix = '') {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const rows = await supabaseDb(`live_quizzes?select=${QUIZ_FIELDS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ ...fields, game_code: `${codePrefix}${generateGameCode()}` }),
      });
      const quiz = Array.isArray(rows) ? rows[0] : rows;
      if (quiz?.id) return quiz;
      throw new Error('Live quiz was not returned after creation.');
    } catch (error) {
      const text = error instanceof Error ? error.message : '';
      const codeTaken = text.includes('23505') && text.includes('game_code');
      if (!codeTaken || attempt === 7) throw error;
    }
  }
  throw new Error('Unable to generate a unique game code.');
}
