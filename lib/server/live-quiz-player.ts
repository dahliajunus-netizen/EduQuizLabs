import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

// Guests can play live quizzes without an account, so a player row alone does
// not prove who is answering. The join API hands the browser an HttpOnly cookie
// signed with a server-only secret; answer and state requests must present it.
const secret = process.env.LIVE_QUIZ_PLAYER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

function cookieName(quizId: string) {
  return `eduquiz_lq_${quizId.replace(/[^A-Za-z0-9-]/g, '')}`;
}

function sign(quizId: string, playerId: string) {
  return createHmac('sha256', secret).update(`${quizId}:${playerId}`).digest('base64url');
}

export function setPlayerCookie(response: NextResponse, quizId: string, playerId: string) {
  if (!secret) return;
  response.cookies.set(cookieName(quizId), `${playerId}.${sign(quizId, playerId)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

export function playerIdFromCookie(request: NextRequest, quizId: string): string | null {
  if (!secret) return null;
  const raw = request.cookies.get(cookieName(quizId))?.value || '';
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  const playerId = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(quizId, playerId));
  return given.length === expected.length && timingSafeEqual(given, expected) ? playerId : null;
}
