import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser, supabaseDb } from '@/lib/server/supabase';
import { setPlayerCookie } from '@/lib/server/live-quiz-player';

const q = (value: string) => encodeURIComponent(value);

const PLAYER_FIELDS = 'id,nickname,score,total_response_time_ms,correct_answers';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = String(body?.code || '').trim().toUpperCase();
  const nickname = String(body?.nickname || '').trim().replace(/\s+/g, ' ');
  if (!code || code.length > 32) return NextResponse.json({ error: 'A valid game code is required.' }, { status: 400 });
  if (!nickname || nickname.length > 40) return NextResponse.json({ error: 'Nickname must be 1 to 40 characters.' }, { status: 400 });

  try {
    const quizzes = await supabaseDb(`live_quizzes?game_code=eq.${q(code)}&select=id,status&limit=1`);
    const quiz = Array.isArray(quizzes) ? quizzes[0] : null;
    if (!quiz?.id || quiz.status === 'draft') return NextResponse.json({ error: 'Game not found.' }, { status: 404 });

    // The player's identity comes from the session cookie, never from the request body.
    const user = await authenticatedUser(request).catch(() => null);
    const studentId = user?.id ? String(user.id) : null;

    if (studentId) {
      const existing = await supabaseDb(`live_quiz_players?quiz_id=eq.${q(quiz.id)}&student_id=eq.${q(studentId)}&select=${PLAYER_FIELDS}&limit=1`);
      if (Array.isArray(existing) && existing[0]) {
        const response = NextResponse.json({ player: existing[0] });
        setPlayerCookie(response, String(quiz.id), String(existing[0].id));
        return response;
      }
    }

    if (quiz.status !== 'lobby') return NextResponse.json({ error: 'This game has already started.' }, { status: 409 });

    let created: any;
    try {
      created = await supabaseDb(`live_quiz_players?select=${PLAYER_FIELDS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ quiz_id: quiz.id, student_id: studentId, nickname }),
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : '';
      if (text.includes('23505') || text.toLowerCase().includes('duplicate')) {
        return NextResponse.json({ error: 'That nickname is already taken in this game.' }, { status: 409 });
      }
      if (text.includes('LIVE_QUIZ_NOT_JOINABLE')) return NextResponse.json({ error: 'This game has already started.' }, { status: 409 });
      if (text.includes('INVALID_NICKNAME')) return NextResponse.json({ error: 'Nickname must be 1 to 40 characters.' }, { status: 400 });
      throw error;
    }

    const player = Array.isArray(created) ? created[0] : created;
    if (!player?.id) throw new Error('Player was not returned after joining.');
    const response = NextResponse.json({ player }, { status: 201 });
    setPlayerCookie(response, String(quiz.id), String(player.id));
    return response;
  } catch (error) {
    console.error('[Student Live Quiz Join API] POST failed:', error);
    return NextResponse.json({ error: 'Could not join lobby.' }, { status: 500 });
  }
}
