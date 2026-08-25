import { NextResponse } from 'next/server';

const MODEL = 'gemini-2.5-flash';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      console.error('[nickname moderation] GEMINI_API_KEY is missing');
      return NextResponse.json({ allowed: false, error: 'GEMINI_API_KEY is missing on the deployed server.' }, { status: 503 });
    }

    const body = await request.json();
    const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : '';
    if (!nickname) return NextResponse.json({ allowed: false, reason: 'Enter a nickname.' }, { status: 400 });
    if (nickname.length > 15) return NextResponse.json({ allowed: false, reason: 'Nicknames can be at most 15 characters.' }, { status: 400 });

    const prompt = `You moderate a school live-quiz nickname for students. Reject profanity, sexual/explicit content, slurs, hate speech, threats, bullying, harassment, obscene insults, or graphic violence. Allow ordinary names, harmless jokes, gaming names, numbers, fictional names, non-English names, abbreviations, and silly non-offensive names. Return ONLY JSON: {"allowed":true} or {"allowed":false,"reason":"Choose a different classroom nickname."}. Nickname: ${JSON.stringify(nickname)}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0 } }),
      cache: 'no-store',
    });

    const responseText = await response.text();
    if (!response.ok) {
      let detail = responseText;
      try {
        const parsed = JSON.parse(responseText);
        detail = parsed?.error?.message || parsed?.error?.status || responseText;
      } catch {}
      console.error(`[nickname moderation] Gemini HTTP ${response.status}: ${detail}`);
      return NextResponse.json({ allowed: false, error: `Gemini rejected the moderation request (${response.status}): ${detail}` }, { status: 502 });
    }

    let data: any;
    try { data = JSON.parse(responseText); } catch { return NextResponse.json({ allowed: false, error: 'Gemini returned invalid JSON.' }, { status: 502 }); }
    const raw = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('').trim();
    if (!raw) return NextResponse.json({ allowed: false, error: 'Gemini returned no moderation result.' }, { status: 502 });

    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    let result: { allowed?: boolean; reason?: string };
    try { result = JSON.parse(cleaned); }
    catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return NextResponse.json({ allowed: false, error: `Gemini returned an invalid moderation result: ${raw}` }, { status: 502 });
      try { result = JSON.parse(match[0]); } catch { return NextResponse.json({ allowed: false, error: `Gemini returned an invalid moderation result: ${raw}` }, { status: 502 }); }
    }

    if (result.allowed === true) return NextResponse.json({ allowed: true });
    return NextResponse.json({ allowed: false, reason: result.reason || 'Choose a different nickname for the classroom.' });
  } catch (error) {
    console.error('[nickname moderation] Exception:', error);
    return NextResponse.json({ allowed: false, error: error instanceof Error ? error.message : 'Nickname moderation is temporarily unavailable.' }, { status: 500 });
  }
}
