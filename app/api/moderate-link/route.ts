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

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are checking a URL submitted as classroom material.

Decide whether the URL appears appropriate for students.

Allow:
- educational websites
- school websites
- academic resources
- documentation
- normal news websites
- normal video platforms
- normal productivity websites
- general websites that are not clearly inappropriate

Reject URLs that clearly indicate:
- pornography or sexually explicit content
- adult sexual services
- sexual content involving minors
- gambling or betting
- illegal drug sales
- obvious phishing, malware, or scam domains

Judge the URL/domain itself. Do not assume a normal website is inappropriate merely because user-generated content could exist on it.

Return ONLY JSON:

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
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        '[moderate-link] Gemini API error:',
        {
          status: response.status,
          statusText: response.statusText,
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

    const data =
      await response.json();

    const text =
      data?.candidates?.[0]
        ?.content?.parts?.[0]?.text;

    if (!text) {
      console.error(
        '[moderate-link] No Gemini response:',
        data
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

    let result: {
      safe?: boolean;
      reason?: string;
    };

    try {
      result = JSON.parse(text);
    } catch {
      console.error(
        '[moderate-link] Gemini returned invalid JSON:',
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

    if (
      typeof result.safe !== 'boolean'
    ) {
      console.error(
        '[moderate-link] Invalid moderation result:',
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
