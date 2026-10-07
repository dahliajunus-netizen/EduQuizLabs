import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser, supabaseDb } from '@/lib/server/supabase';

const MAX_LENGTH = 500;

// Moderation terms are intentionally kept server-side so the client cannot bypass the filter.
// The matcher also catches common obfuscation (spacing, punctuation, repeated letters, and
// simple leetspeak) instead of relying on exact substring matches.
const BLOCKED_TERMS = [
  // Profanity / sexual insults
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'piss', 'cunt', 'slut', 'whore',
  'motherfucker', 'bullshit', 'dumbass', 'jackass', 'dipshit', 'douchebag',
  // Common identity-targeting slurs
  'nigger', 'nigga', 'faggot', 'fag', 'dyke', 'tranny', 'retard', 'spic', 'wetback',
  'chink', 'gook', 'kike', 'raghead', 'beaner', 'cracker', 'coon', 'sandnigger',
];

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
};

const BLOCKED_SET = new Set(BLOCKED_TERMS.filter((term) => term.length >= 4));

function normalizeForModeration(value: string) {
  return [...value.toLowerCase()]
    .map((char) => LEET_MAP[char] || char)
    .join('');
}

function filterMessage(input: string) {
  const cleaned = input
    .normalize('NFKC')
    .replace(/[\\u200B-\\u200D\\uFEFF]/g, '')
    .trim()
    .replace(/\\s+/g, ' ');

  // Only replace complete tokens. This prevents innocent words such as
  // "whattup" or "guys" from being partially modified.
  return cleaned.replace(/[A-Za-z0-9@$]+/g, (token) => {
    const normalized = normalizeForModeration(token);
    if (!BLOCKED_SET.has(normalized)) return token;
    return '*'.repeat(Math.max(3, [...token].length));
  });
}

async function getProfile(userId: string) {
  const rows = await supabaseDb(
    'users?id=eq.' + encodeURIComponent(userId) + '&select=id,full_name,role,country&limit=1',
  );
  return Array.isArray(rows) ? rows[0] : null;
}

export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 100);
    const rows = await supabaseDb(
      'community_messages?select=id,user_id,full_name,role,country,message,created_at&order=created_at.desc&limit=' + limit,
    );
    return NextResponse.json(Array.isArray(rows) ? rows.reverse() : [], {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[Community Chat] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load community messages.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    const raw = typeof body?.message === 'string' ? body.message : '';
    const message = filterMessage(raw);

    if (!message) return NextResponse.json({ error: 'Please keep the community chat appropriate and respectful.' }, { status: 400 });
    if (message.length > MAX_LENGTH) {
      return NextResponse.json({ error: 'Message must be ' + MAX_LENGTH + ' characters or fewer.' }, { status: 400 });
    }

    const profile = await getProfile(String(user.id));
    if (!profile?.id || !profile?.role) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 403 });
    }

    const role = String(profile.role).toLowerCase();
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'This account cannot use community chat.' }, { status: 403 });
    }

    const country = String(profile.country || '').trim() || 'Unknown';
    const rows = await supabaseDb('community_messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        user_id: String(profile.id),
        full_name: String(profile.full_name || user.email || 'EduQuizLabs User').slice(0, 120),
        role,
        country: country.slice(0, 80),
        message,
      }),
    });

    const created = Array.isArray(rows) ? rows[0] : null;
    return NextResponse.json(created || { message }, { status: 201 });
  } catch (error) {
    console.error('[Community Chat] POST failed:', error);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}
