import { NextRequest, NextResponse } from 'next/server';
import { requireStudent } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';
import { csrfResponse } from '@/lib/server/csrf';

const q = (value: string) => encodeURIComponent(value);

export async function POST(request: NextRequest) {
  const blocked = csrfResponse(request);
  if (blocked) return blocked;

  const user = await requireStudent(request);
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const code = String(body?.code ?? '').trim().toUpperCase();
    if (!code || code.length > 32) {
      return NextResponse.json({ error: 'A valid class code is required.' }, { status: 400 });
    }

    const classes = await supabaseDb(
      `teacher_classes?code=eq.${q(code)}&select=id,class_name,code,school_name&limit=1`,
    );
    const found = Array.isArray(classes) ? classes[0] : null;
    if (!found) return NextResponse.json({ error: 'Code is invalid.' }, { status: 404 });

    const actualCode = String(found.code || code).trim().toUpperCase();
    const existing = await supabaseDb(
      `student_classes?student_id=eq.${q(user.id)}&code=eq.${q(actualCode)}&select=id&limit=1`,
    );
    if (Array.isArray(existing) && existing[0]) {
      return NextResponse.json({ error: 'You have already joined this class.' }, { status: 409 });
    }

    const created = await supabaseDb('student_classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        class_name: found.class_name,
        code: actualCode,
        school: found.school_name ?? null,
        course_id: null,
        student_id: user.id,
      }),
    });

    return NextResponse.json({
      class: Array.isArray(created) ? created[0] : created,
    }, { status: 201 });
  } catch (error) {
    console.error('[Student Join Class API] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to join class.',
    }, { status: 500 });
  }
}
