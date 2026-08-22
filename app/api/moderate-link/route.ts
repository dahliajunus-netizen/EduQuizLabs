import { NextResponse } from 'next/server';

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

    // Only permit normal web URLs.
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
    // Get OpenAI API key
    // ------------------------------------------------------------

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error(
        '[moderate-link] OPENAI_API_KEY is missing'
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
    // Ask OpenAI Moderation API
    // ------------------------------------------------------------

    const moderationResponse =
      await fetch(
        'https://api.openai.com/v1/moderations',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${apiKey}`,
          },

          body: JSON.stringify({
            model:
              'omni-moderation-latest',

            input:
              `This URL is being submitted as educational material for a school classroom.

Assess the URL string for signs that it represents inappropriate, adult, or sexually explicit material.

URL:
${url.href}

Educational resources such as school websites, documentation, articles, videos, reference pages, and learning platforms should be allowed.`,
          }),

          // Don't let a hanging OpenAI request
          // keep the Vercel function running forever.
          signal: AbortSignal.timeout(15000),
        }
      );

    // ------------------------------------------------------------
    // Handle OpenAI errors
    // ------------------------------------------------------------

    if (!moderationResponse.ok) {
      const errorText =
        await moderationResponse.text();

      console.error(
        '[moderate-link] OpenAI API error:',
        {
          status:
            moderationResponse.status,
          statusText:
            moderationResponse.statusText,
          body: errorText,
        }
      );

      // Rate limit / quota problem
      if (
        moderationResponse.status ===
          429
      ) {
        return NextResponse.json(
          {
            safe: false,
            reason:
              'The link safety checker is temporarily unavailable because the API rate limit was reached. Please try again later.',
          },
          { status: 503 }
        );
      }

      // Authentication problem
      if (
        moderationResponse.status ===
          401
      ) {
        return NextResponse.json(
          {
            safe: false,
            reason:
              'The link safety checker is not configured correctly.',
          },
          { status: 500 }
        );
      }

      // Other OpenAI error
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
    // Parse moderation response
    // ------------------------------------------------------------

    let moderationData: any;

    try {
      moderationData =
        await moderationResponse.json();
    } catch {
      console.error(
        '[moderate-link] Could not parse OpenAI response.'
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

    const result =
      moderationData?.results?.[0];

    if (!result) {
      console.error(
        '[moderate-link] No moderation result:',
        moderationData
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
    // Check moderation categories
    // ------------------------------------------------------------

    const categories =
      result.categories || {};

    const isSexual =
      categories.sexual === true;

    const isSexualMinors =
      categories['sexual/minors'] === true;

    // Reject sexual/adult content.
    if (
      isSexual ||
      isSexualMinors
    ) {
      console.log(
        '[moderate-link] Link rejected by moderation.'
      );

      return NextResponse.json({
        safe: false,
        reason:
          'This link appears to contain inappropriate content and cannot be added as classroom material.',
      });
    }

    // ------------------------------------------------------------
    // Link passed moderation
    // ------------------------------------------------------------

    console.log(
      '[moderate-link] Link passed moderation.'
    );

    return NextResponse.json({
      safe: true,
      reason:
        'Link passed the safety check.',
    });
  } catch (error) {
    // ------------------------------------------------------------
    // Unexpected error
    // ------------------------------------------------------------

    console.error(
      '[moderate-link] Unexpected error:',
      error
    );

    if (
      error instanceof Error &&
      error.name === 'TimeoutError'
    ) {
      return NextResponse.json(
        {
          safe: false,
          reason:
            'The link safety check timed out. Please try again.',
        },
        { status: 504 }
      );
    }

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
