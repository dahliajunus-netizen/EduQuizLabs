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

    // Only allow HTTP/HTTPS
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

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error(
        'OPENAI_API_KEY is missing.'
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
     * Send the URL to OpenAI moderation.
     */
    const moderationResponse = await fetch(
      'https://api.openai.com/v1/moderations',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          model: 'omni-moderation-latest',

          input: `This URL is being submitted as educational material for a school classroom.

Determine whether the URL itself appears to indicate inappropriate or adult content.

URL:
${url.href}

Educational resources should be allowed.
Adult or sexually explicit content should be rejected.`,
        }),
      }
    );

    if (!moderationResponse.ok) {
      const errorText =
        await moderationResponse.text();

      console.error(
        'OpenAI moderation error:',
        errorText
      );

      return NextResponse.json(
        {
          safe: false,
          reason:
            'The link could not be checked. Please try again.',
        },
        { status: 500 }
      );
    }

    const moderationData =
      await moderationResponse.json();

    const result =
      moderationData?.results?.[0];

    if (!result) {
      console.error(
        'No moderation result returned:',
        moderationData
      );

      return NextResponse.json(
        {
          safe: false,
          reason:
            'The link could not be checked. Please try again.',
        },
        { status: 500 }
      );
    }

    /*
     * Reject sexual/adult content.
     */
    const isSexual =
      result.categories?.sexual === true ||
      result.categories?.['sexual/minors'] === true;

    if (isSexual) {
      return NextResponse.json({
        safe: false,
        reason:
          'This link appears to contain inappropriate content and cannot be added as classroom material.',
      });
    }

    /*
     * Link passed moderation.
     */
    return NextResponse.json({
      safe: true,
      reason:
        'Link passed the safety check.',
    });
  } catch (error) {
    console.error(
      'Moderation route error:',
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
