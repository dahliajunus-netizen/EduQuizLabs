import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const link = typeof body.link === 'string' ? body.link.trim() : '';

    if (!link) {
      return NextResponse.json(
        {
          allowed: false,
          message: 'Please enter a link.',
        },
        { status: 400 }
      );
    }

    // Validate the URL
    let url: URL;

    try {
      url = new URL(link);
    } catch {
      return NextResponse.json(
        {
          allowed: false,
          message: 'Please enter a valid URL.',
        },
        { status: 400 }
      );
    }

    // Only allow normal web links
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return NextResponse.json({
        allowed: false,
        message: 'Only HTTP and HTTPS links are allowed.',
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('OPENAI_API_KEY is missing.');

      return NextResponse.json(
        {
          allowed: false,
          message: 'Link safety checking is currently unavailable.',
        },
        { status: 500 }
      );
    }

    /*
     * Ask OpenAI's moderation system to check the URL.
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

Determine whether the URL appears to indicate inappropriate or adult content.

URL:
${url.href}

Educational resources should be allowed.
Adult or sexually explicit websites should be rejected.`,
        }),
      }
    );

    if (!moderationResponse.ok) {
      const errorText = await moderationResponse.text();

      console.error('OpenAI moderation error:', errorText);

      return NextResponse.json(
        {
          allowed: false,
          message:
            'The link could not be checked. Please try again.',
        },
        { status: 500 }
      );
    }

    const moderationData = await moderationResponse.json();

    const result = moderationData?.results?.[0];

    if (!result) {
      return NextResponse.json(
        {
          allowed: false,
          message:
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
        allowed: false,
        message:
          'This link appears to contain inappropriate content and cannot be added as classroom material.',
      });
    }

    /*
     * Link passed the moderation check.
     */
    return NextResponse.json({
      allowed: true,
      message: 'Link passed the safety check.',
    });
  } catch (error) {
    console.error('Moderation route error:', error);

    return NextResponse.json(
      {
        allowed: false,
        message:
          'Something went wrong while checking the link.',
      },
      { status: 500 }
    );
  }
}
