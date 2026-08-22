import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const link =
      typeof body.url === 'string'
        ? body.url.trim()
        : '';

    if (!link) {
      return NextResponse.json(
        {
          safe: false,
          reason: 'Please enter a link.',
        },
        { status: 400 }
      );
    }

    // Validate URL
    let url: URL;

    try {
      url = new URL(link);
    } catch {
      return NextResponse.json(
        {
          safe: false,
          reason: 'Please enter a valid URL.',
        },
        { status: 400 }
      );
    }

    // Only allow normal web links
    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:'
    ) {
      return NextResponse.json(
        {
          safe: false,
          reason:
            'Only HTTP and HTTPS links are allowed.',
        },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        '[moderate-link] GEMINI_API_KEY is missing.'
      );

      return NextResponse.json(
        {
          safe: false,
          reason:
            'Link safety checking is currently unavailable.',
        },
        { status: 500 }
      );
    }

    /*
     * Ask Gemini to classify the URL.
     */
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a safety checker for an educational classroom platform.

Evaluate the following URL based ONLY on the URL/domain information provided.

The link is being submitted by a teacher as classroom material for students.

ALLOW normal educational, school, academic, reference, documentation, news, productivity, video, and general-purpose websites.

REJECT links that clearly indicate:
- pornography or sexually explicit content
- sexual services
- adult-only sexual content
- websites primarily intended for sexual content
- links involving sexual content involving minors
- obvious gambling/betting
- obvious illegal drug sales
- malware/phishing/scam websites when clearly identifiable from the URL

Do NOT reject a normal website merely because it could theoretically contain inappropriate content.

Return ONLY valid JSON in exactly this format:

{
  "safe": true,
  "reason": "Short explanation"
}

or

{
  "safe": false,
  "reason": "Short explanation"
}

URL:
${url.href}`,
                },
              ],
            },
          ],

          generationConfig: {
            temperature: 0,
            responseMimeType:
              'application/json',
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText =
        await geminiResponse.text();

      console.error(
        '[moderate-link] Gemini API error:',
        {
          status: geminiResponse.status,
          statusText:
            geminiResponse.statusText,
          body: errorText,
        }
      );

      return NextResponse.json(
        {
          safe: false,
          reason:
            'The link could not be checked. Please try again.',
        },
        { status: 503 }
      );
    }

    const geminiData =
      await geminiResponse.json();

    const text =
      geminiData?.candidates?.[0]
        ?.content?.parts?.[0]?.text;

    if (!text) {
      console.error(
        '[moderate-link] Gemini returned no text:',
        geminiData
      );

      return NextResponse.json(
        {
          safe: false,
          reason:
            'The link could not be checked. Please try again.',
        },
        { status: 503 }
      );
    }

    /*
     * Parse Gemini's JSON response.
     */
    let result: {
      safe?: boolean;
      reason?: string;
    };

    try {
      result = JSON.parse(text);
    } catch {
      console.error(
        '[moderate-link] Invalid Gemini JSON:',
        text
      );

      return NextResponse.json(
        {
          safe: false,
          reason:
            'The link could not be checked. Please try again.',
        },
        { status: 503 }
      );
    }

    /*
     * Make sure "safe" is actually a boolean.
     */
    if (
      typeof result.safe !== 'boolean'
    ) {
      console.error(
        '[moderate-link] Invalid Gemini result:',
        result
      );

      return NextResponse.json(
        {
          safe: false,
          reason:
            'The link could not be checked. Please try again.',
        },
        { status: 503 }
      );
    }

    /*
     * Return the exact format expected
     * by your page.tsx.
     */
    return NextResponse.json({
      safe: result.safe,
      reason:
        result.reason ||
        (result.safe
          ? 'Link passed the safety check.'
          : 'This link is not allowed as classroom material.'),
    });
  } catch (error) {
    console.error(
      '[moderate-link] Route error:',
      error
    );

    return NextResponse.json(
      {
        safe: false,
        reason:
          'Something went wrong while checking the link.',
      },
      { status: 500 }
    );
  }
}
