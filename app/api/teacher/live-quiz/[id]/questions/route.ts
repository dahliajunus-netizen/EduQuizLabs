import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';
import { QUESTION_FIELDS, liveQuizQuestions, ownedLiveQuiz } from '@/lib/server/live-quiz';

const q = (value: string) => encodeURIComponent(value);
const ANSWERS = new Set(['A', 'B', 'C', 'D']);

// Questions are edited on draft templates only; a launched session keeps the
// copy it was started with.
async function ownedDraft(request: NextRequest, params: Promise<{ id: string }>) {
  const teacher = await requireTeacher(request);
  if (!teacher) return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) };
  const { id } = await params;
  const quiz = await ownedLiveQuiz(teacher.id, String(id || ''));
  if (!quiz) return { error: NextResponse.json({ error: 'Live quiz not found.' }, { status: 404 }) };
  if (quiz.status !== 'draft') return { error: NextResponse.json({ error: 'Only draft quizzes can be edited.' }, { status: 409 }) };
  return { quiz };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owned = await ownedDraft(request, params);
    if (owned.error) return owned.error;

    const body = await request.json().catch(() => null);
    const text = (key: string) => String(body?.[key] || '').trim();
    const question = text('question');
    const choices = { option_a: text('option_a'), option_b: text('option_b'), option_c: text('option_c'), option_d: text('option_d') };
    const correct = text('correct_answer').toUpperCase();
    const limit = Number(body?.time_limit_seconds ?? 30);
    if (!question || question.length > 500 || Object.values(choices).some(v => !v || v.length > 200)) {
      return NextResponse.json({ error: 'Fill the question and all four answers.' }, { status: 400 });
    }
    if (!ANSWERS.has(correct)) return NextResponse.json({ error: 'Choose the correct answer.' }, { status: 400 });
    if (!Number.isInteger(limit) || limit < 5 || limit > 300) return NextResponse.json({ error: 'Time limit must be 5 to 300 seconds.' }, { status: 400 });

    const existing = await liveQuizQuestions(owned.quiz.id);
    const rows = await supabaseDb(`live_quiz_questions?select=${QUESTION_FIELDS}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        quiz_id: owned.quiz.id, question_order: existing.length, question, ...choices, correct_answer: correct, time_limit_seconds: limit,
      }),
    });
    return NextResponse.json(Array.isArray(rows) ? rows[0] : rows, { status: 201 });
  } catch (error) {
    console.error('[Teacher Live Quiz Questions API] POST failed:', error);
    return NextResponse.json({ error: 'Could not add question.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owned = await ownedDraft(request, params);
    if (owned.error) return owned.error;
    const questionId = String(request.nextUrl.searchParams.get('question_id') || '').trim();
    if (!questionId) return NextResponse.json({ error: 'Question ID is required.' }, { status: 400 });

    await supabaseDb(`live_quiz_questions?id=eq.${q(questionId)}&quiz_id=eq.${q(owned.quiz.id)}`, { method: 'DELETE' });

    // Keep question_order contiguous from 0: players and the host index questions by it.
    const remaining = await liveQuizQuestions(owned.quiz.id);
    await Promise.all(remaining.map((row: any, index: number) => Number(row.question_order) === index
      ? null
      : supabaseDb(`live_quiz_questions?id=eq.${q(String(row.id))}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ question_order: index }),
      })));
    return NextResponse.json(await liveQuizQuestions(owned.quiz.id));
  } catch (error) {
    console.error('[Teacher Live Quiz Questions API] DELETE failed:', error);
    return NextResponse.json({ error: 'Could not delete question.' }, { status: 500 });
  }
}
