import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser, serverConfigOk, supabaseDb } from '@/lib/server/supabase';
import { hashAssessmentPassword } from '@/lib/server/password';

export async function PATCH(request: NextRequest) {
  try {
    if (!serverConfigOk()) return NextResponse.json({ error: 'Server configuration is missing.' }, { status: 500 });
    const user = await authenticatedUser(request);
    if (!user?.id) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { testId, title, description, dueDate, testPassword, maxAttempts, allowReview } = body || {};
    if (!testId) return NextResponse.json({ error: 'Test ID is required.' }, { status: 400 });

    const tests = await supabaseDb(`tests?id=eq.${encodeURIComponent(String(testId))}&select=id,class_code&limit=1`);
    const test = Array.isArray(tests) ? tests[0] : null;
    if (!test) return NextResponse.json({ error: 'Test not found.' }, { status: 404 });

    const classCode = String(test.class_code || '').trim();
    if (!classCode) return NextResponse.json({ error: 'This test is not linked to a class.' }, { status: 400 });
    const classes = await supabaseDb(`teacher_classes?code=eq.${encodeURIComponent(classCode)}&teacher_id=eq.${encodeURIComponent(String(user.id))}&select=id&limit=1`);
    if (!Array.isArray(classes) || !classes[0]) return NextResponse.json({ error: 'You are not authorized to edit this test.' }, { status: 403 });

    const cleanTitle = String(title ?? '').trim();
    if (!cleanTitle) return NextResponse.json({ error: 'Test title is required.' }, { status: 400 });
    const attempts = Number(maxAttempts);
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 100) return NextResponse.json({ error: 'Maximum attempts must be a whole number from 1 to 100.' }, { status: 400 });

    const cleanPassword = String(testPassword ?? '').trim();
    const update = {
      title: cleanTitle,
      description: String(description ?? '').trim() || null,
      due_date: dueDate ? String(dueDate) : null,
      test_password: cleanPassword ? await hashAssessmentPassword(cleanPassword) : null,
      max_attempts: attempts,
      allow_review: allowReview !== false,
    };
    await supabaseDb(`tests?id=eq.${encodeURIComponent(String(testId))}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(update),
    });
    return NextResponse.json({ ok: true, test: { id: String(testId), ...update, test_password: undefined, requires_password: Boolean(cleanPassword) } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update test.' }, { status: 500 });
  }
}
