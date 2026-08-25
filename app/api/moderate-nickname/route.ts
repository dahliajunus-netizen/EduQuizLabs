import { NextResponse } from 'next/server';

const MODEL = 'gemini-2.5-flash';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      console.error('GEMINI_API_KEY is missing');
      return NextResponse.json({ allowed: false, error: 'Nickname moderation is not configured.' }, { status: 503 });
    }

    const body = await request.json();
    const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : '';
    if (!nickname) return NextResponse.json({ allowed: false, reason: 'Enter a nickname.' }, { status: 400 });
    if (nickname.length > 15) return NextResponse.json({ allowed: false, reason: 'Nicknames can be at most 15 characters.' }, { status: 400 });

    const prompt = `You moderate nicknames for a school live quiz used by students. Reject profanity, sexual or explicit content, slurs, hateful language, threats, harassment, obscene or deliberately offensive names, and graphic or disturbing references. Allow normal names, harmless nicknames, gaming names, numbers, jokes, non-English names, fictional character names, and harmless abbreviations. Return a JSON object with allowed as true or false and, when false, a brief classroom-safe reason. Nickname: ${JSON.stringify(nickname)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                allowed: { type: 'BOOLEAN' },
                reason: { type: 'STRING' },
              },
              required: ['allowed'],
            },
          },
        }),
        cache: 'no-store',
      },
    );

    const responseText = await response.text();
    if (!response.ok) {
      console.error('Gemini API error:', response.status, responseText);
      return NextResponse.json({ allowed: false, error: 'Nickname moderation is temporarily unavailable.' }, { status: 502 });
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Gemini API returned invalid JSON:', responseText);
      return NextResponse.json({ allowed: false, error: 'Nickname moderation returned an invalid response.' }, { status: 502 });
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof raw !== 'string') {
      console.error('Gemini generated no text:', JSON.stringify(data));
      return NextResponse.json({ allowed: false, error: 'Nickname moderation returned no result.' }, { status: 502 });
    }

    let result: { allowed?: boolean; reason?: string };
    try {
      result = JSON.parse(raw);
    } catch {
      console.error('Gemini moderation result was not JSON:', raw);
      return NextResponse.json({ allowed: false, error: 'Nickname moderation returned an invalid result.' }, { status: 502 });
    }

    if (result.allowed === true) return NextResponse.json({ allowed: true });
    return NextResponse.json({
      allowed: false,
      reason: result.reason || 'Choose a different nickname for the classroom.',
    });
  } catch (error) {
    console.error('Nickname moderation exception:', error);
    return NextResponse.json({ allowed: false, error: 'Nickname moderation is temporarily unavailable.' }, { status: 500 });
  }
}
