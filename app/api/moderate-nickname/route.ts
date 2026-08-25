import { NextResponse } from 'next/server';

const MODEL = 'gemini-2.5-flash';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { allowed: false, error: 'Nickname moderation is not configured. Ask the site administrator to set GEMINI_API_KEY.' },
        { status: 503 },
      );
    }

    const body = await request.json();
    const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : '';

    if (!nickname) {
      return NextResponse.json({ allowed: false, reason: 'Enter a nickname.' }, { status: 400 });
    }

    if (nickname.length > 15) {
      return NextResponse.json({ allowed: false, reason: 'Nicknames can be at most 15 characters.' }, { status: 400 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You moderate nicknames for a school live quiz used by minors. Decide whether this nickname is appropriate for a classroom. Reject profanity, sexual/explicit content, slurs or hateful language, threats, harassment, graphic violence, or deliberately offensive/obscene names. Ordinary names, harmless jokes, gaming-style names, numbers, and non-English names are okay. Return ONLY valid JSON in exactly this shape: {"allowed":true} or {"allowed":false,"reason":"brief classroom-safe reason"}. Nickname: ${JSON.stringify(nickname)}`,
            }],
          }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('Gemini nickname moderation failed:', text);
      return NextResponse.json(
        { allowed: false, error: 'Nickname could not be checked right now. Please try again.' },
        { status: 502 },
      );
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof raw !== 'string') {
      return NextResponse.json(
        { allowed: false, error: 'Nickname could not be checked right now. Please try again.' },
        { status: 502 },
      );
    }

    let result: { allowed?: boolean; reason?: string };
    try {
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { allowed: false, error: 'Nickname could not be checked right now. Please try again.' },
        { status: 502 },
      );
    }

    if (result.allowed === true) return NextResponse.json({ allowed: true });
    return NextResponse.json({
      allowed: false,
      reason: result.reason || 'Choose a different nickname for the classroom.',
    });
  } catch (error) {
    console.error('Nickname moderation error:', error);
    return NextResponse.json(
      { allowed: false, error: 'Nickname could not be checked right now. Please try again.' },
      { status: 500 },
    );
  }
}
