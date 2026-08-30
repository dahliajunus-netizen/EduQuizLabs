import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function PATCH(request: NextRequest) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase server configuration is missing.' }, { status: 500 });
    }

    const body = await request.json();
    const {
      testId,
      teacherId,
      title,
      description,
      dueDate,
      testPassword,
      maxAttempts,
      allowReview,
    } = body || {};

    if (!testId || !teacherId) {
      return NextResponse.json({ error: 'Test ID and teacher ID are required.' }, { status: 400 });
    }

    const adminHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    const testResponse = await fetch(
      `${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(String(testId))}&select=id,class_code,course_id`,
      { headers: adminHeaders, cache: 'no-store' }
    );
    if (!testResponse.ok) {
      return NextResponse.json({ error: await testResponse.text() }, { status: testResponse.status });
    }

    const tests = await testResponse.json();
    const test = Array.isArray(tests) ? tests[0] : null;
    if (!test) return NextResponse.json({ error: 'Test not found.' }, { status: 404 });

    const classCode = String(test.class_code || '').trim();
    if (!classCode) return NextResponse.json({ error: 'This test is not linked to a class.' }, { status: 400 });

    const classResponse = await fetch(
      `${supabaseUrl}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(classCode)}&teacher_id=eq.${encodeURIComponent(String(teacherId))}&select=id&limit=1`,
      { headers: adminHeaders, cache: 'no-store' }
    );
    if (!classResponse.ok) {
      return NextResponse.json({ error: await classResponse.text() }, { status: classResponse.status });
    }

    const classes = await classResponse.json();
    if (!Array.isArray(classes) || !classes[0]) {
      return NextResponse.json({ error: 'You are not authorized to edit this test.' }, { status: 403 });
    }

    const cleanTitle = String(title ?? '').trim();
    if (!cleanTitle) return NextResponse.json({ error: 'Test title is required.' }, { status: 400 });

    const attempts = Number(maxAttempts);
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 100) {
      return NextResponse.json({ error: 'Maximum attempts must be a whole number from 1 to 100.' }, { status: 400 });
    }

    const update = {
      title: cleanTitle,
      description: String(description ?? '').trim() || null,
      due_date: dueDate ? String(dueDate) : null,
      test_password: String(testPassword ?? '').trim() || null,
      max_attempts: attempts,
      allow_review: allowReview !== false,
    };

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(String(testId))}`,
      {
        method: 'PATCH',
        headers: { ...adminHeaders, Prefer: 'return=representation' },
        body: JSON.stringify(update),
        cache: 'no-store',
      }
    );

    const text = await updateResponse.text();
    if (!updateResponse.ok) {
      return NextResponse.json({ error: text || `Failed to update test (${updateResponse.status}).` }, { status: updateResponse.status });
    }

    let updated = null;
    try { updated = text ? JSON.parse(text) : null; } catch { updated = null; }
    if (!Array.isArray(updated) || !updated[0]) {
      return NextResponse.json({ error: 'Test update returned no updated row.' }, { status: 500 });
    }

    return NextResponse.json({ test: updated[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update test.' },
      { status: 500 }
    );
  }
}
