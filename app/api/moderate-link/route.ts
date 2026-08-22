import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    // ------------------------------------------------------------
    // Read request
    // ------------------------------------------------------------

    const body = await request.json();

    const link =
      typeof body?.url === 'string'
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

    // ------------------------------------------------------------
    // Validate URL
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // Gemini API key
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // Create Gemini client
    // ------------------------------------------------------------

    const ai = new GoogleGenAI({
      apiKey,
    });

    // ------------------------------------------------------------
    // Ask Gemini to classify the URL
    // ------------------------------------------------------------

    const prompt = `
You are a safety checker for an educational platform used by
middle-school and high-school students.

Evaluate this URL as a proposed classroom learning resource.

URL:
${url.href}

Your job is to determine whether the URL appears to point to
inappropriate material.

Reject URLs that clearly indicate:
- sexually explicit or adult material
- sexual services
- pornography
- content intended primarily for sexual purposes

Normal educational and general-purpose websites should be allowed,
including:
- school websites
- universities
- Wikipedia
- documentation
- educational articles
- news websites
- YouTube
- Google Drive
- Microsoft resources
- coding websites
- science resources
- mathematics resources
- reference websites

IMPORTANT:
Judge the URL/domain itself. Do not assume that an unfamiliar
website is unsafe merely because you do not recognize it.

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
`;

    const response =
      await ai.models.generateContent({
        model: 'gemini-3-flash-preview',

        contents: prompt,

        config: {
          temperature: 0,
          maxOutputTokens: 150,

          responseMimeType:
            'application/json',

          safetySettings: [
            {
              category:
                'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold:
                'BLOCK_LOW_AND_ABOVE',
            },
            {
              category:
                'HARM_CATEGORY_HATE_SPEECH',
              threshold:
                'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category:
                'HARM_CATEGORY_HARASSMENT',
              threshold:
                'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category:
                'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold:
                'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
        },
      });

    // ------------------------------------------------------------
    // Read Gemini response
    // ------------------------------------------------------------

    const text =
      response.text?.trim();

    if (!text) {
      console.error(
        '[moderate-link] Gemini returned no text.'
      );

      return NextResponse.json(
        {
          safe: false,
          reason:
            'The link could not be checked right now. Please try again.',
        },
        { status: 503 }
      );
    }

    // ------------------------------------------------------------
    // Parse JSON
    // ------------------------------------------------------------

    let result: {
      safe?: boolean;
      reason?: string;
    };

    try {
      result = JSON.parse(text);
    } catch (error) {
      console.error(
        '[moderate-link] Invalid Gemini JSON:',
        text,
        error
      );

      return NextResponse.json(
        {
          safe: false,
          reason:
            'The link could not be checked right now. Please try again.',
        },
        { status: 503 }
      );
    }

    // ------------------------------------------------------------
    // Validate Gemini result
    // ------------------------------------------------------------

    if (typeof result.safe !== 'boolean') {
      console.error(
        '[moderate-link] Gemini returned invalid result:',
        result
      );

      return NextResponse.json(
        {
          safe: false,
          reason:
            'The link could not be checked right now. Please try again.',
        },
        { status: 503 }
      );
    }

    // ------------------------------------------------------------
    // Unsafe
    // ------------------------------------------------------------

    if (!result.safe) {
      return NextResponse.json({
        safe: false,

        reason:
          result.reason ||
          'This link appears to contain inappropriate content and cannot be added as classroom material.',
      });
    }

    // ------------------------------------------------------------
    // Safe
    // ------------------------------------------------------------

    return NextResponse.json({
      safe: true,

      reason:
        result.reason ||
        'Link passed the safety check.',
    });
  } catch (error) {
    console.error(
      '[moderate-link] Gemini error:',
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
