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

    if (!nickname) {
      return NextResponse.json({ allowed: false, reason: 'Enter a nickname.' }, { status: 400 });
    }

    if (nickname.length > 15) {
      return NextResponse.json({ allowed: false, reason: 'Nicknames can be at most 15 characters.' }, { status: 400 });
    }

    const prompt = [
      'You are a strict but fair classroom nickname moderator for a school live quiz used by minors.',
      'Reject nicknames containing or clearly implying profanity, sexual/explicit content, sexual solicitation, slurs, hate speech, threats, bullying, harassment, obscene insults, or graphic violence.',
      'Allow ordinary names, harmless jokes, gaming nicknames, numbers, fictional names, non-English names, abbreviations, and silly but non-offensive names.',
      'Return ONLY one JSON object and nothing else.',
      'The JSON must be exactly either {"allowed":true} or {"allowed":false,"reason":"Choose a different classroom nickname."}.',
      `Nickname to moderate: ${JSON.stringify(nickname)}`,
    ].join('\n');

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
          generationConfig: { temperature: 0 },
        }),
        cache: 'no-store',
      },
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Gemini API error:', response.status, responseText);
      return NextResponse.json(
        { allowed: false, error: 'Nickname moderation is temporarily unavailable.' },
        { status: 502 },
      );
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Gemini HTTP response was not JSON:', responseText);
      return NextResponse.json(
        { allowed: false, error: 'Nickname moderation returned an invalid response.' },
        { status: 502 },
      );
    }

    const raw = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('').trim();
    if (!raw) {
      console.error('Gemini returned no generated text:', JSON.stringify(data));
      return NextResponse.json(
        { allowed: false, error: 'Nickname moderation returned no result.' },
        { status: 502 },
      );
    }

    // Gemini can occasionally wrap JSON in markdown even when asked not to.
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let result: { allowed?: boolean; reason?: string };
    try {
      result = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error('Gemini moderation result was not JSON:', raw);
        return NextResponse.json(
          { allowed: false, error: 'Nickname moderation returned an invalid result.' },
          { status: 502 },
        );
      }
      try {
        result = JSON.parse(match[0]);
      } catch {
        console.error('Could not parse Gemini moderation JSON:', raw);
        return NextResponse.json(
          { allowed: false, error: 'Nickname moderation returned an invalid result.' },
          { status: 502 },
        );
      }
    }

    if (result.allowed === true) {
      return NextResponse.json({ allowed: true });
    }

    return NextResponse.json({
      allowed: false,
      reason: result.reason || 'Choose a different nickname for the classroom.',
    });
  } catch (error) {
    console.error('Nickname moderation exception:', error);
    return NextResponse.json(
      { allowed: false, error: 'Nickname moderation is temporarily unavailable.' },
      { status: 500 },
    );
  }
}
