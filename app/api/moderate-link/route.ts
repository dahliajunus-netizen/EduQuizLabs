import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // page.tsx sends { url: "..." }
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
     *
     * This uses the REST API directly, so
     * @google/genai is NOT required.
     */
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
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
                  text: `You are a safety checker for an educational classroom platform.

A teacher is submitting this URL as classroom material for students.

Evaluate the URL/domain and determine whether it appears appropriate for a school educational platform.

ALLOW normal:
- educational websites
- school websites
- academic resources
- documentation
- reference websites
- normal news websites
- normal video platforms
- normal productivity websites
- general-purpose websites that are not clearly inappropriate

REJECT links that clearly indicate:
- pornography or sexually explicit content
- adult sexual services
- sexual content involving minors
- gambling or betting
- illegal drug sales
- obvious phishing websites
- obvious malware websites
- obvious scam websites

Judge the URL itself. Do not reject a normal website merely because it could theoretically contain inappropriate user-generated content.

Return ONLY valid JSON.

If the link is appropriate:

{
  "safe": true,
  "reason": "Short explanation"
}

If the link is inappropriate:

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

    /*
     * Gemini returned an error.
     */
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

    /*
     * Read Gemini response.
     */
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
     * Parse Gemini JSON.
     */
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

    /*
     * Validate Gemini's result.
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
     * Return exactly what page.tsx expects:
     *
     * {
     *   safe: boolean,
     *   reason?: string
     * }
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
