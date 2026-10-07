import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser, supabaseDb } from '@/lib/server/supabase';

const MAX_LENGTH = 500;

const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'piss',
  'cunt', 'slut', 'whore',
];

function filterMessage(input: string) {
  let output = input.trim().replace(/\s+/g, ' ');
  for (const word of BLOCKED_WORDS) {
    const pattern = new RegExp(word.replace(/[.*+?^{}()|[\]\\]/g, '\\$&'), 'gi');
    output = output.replace(pattern, (match) => '*'.repeat(Math.max(3, match.length)));
  }
  return output;
}

async function getProfile(userId: string) {
  const rows = await supabaseDb(
    'users?id=eq.' + encodeURIComponent(userId) + '&select=id,full_name,role&limit=1',
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
      'community_messages?select=id,user_id,full_name,role,message,created_at&order=created_at.desc&limit=' + limit,
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

    if (!message) return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
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
