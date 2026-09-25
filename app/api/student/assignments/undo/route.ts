import { NextRequest, NextResponse } from 'next/server';
import { requireStudent } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';
import { csrfResponse } from '@/lib/server/csrf';

export async function DELETE(request: NextRequest) {
  const user = await requireStudent(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const csrf = csrfResponse(request);
  if (csrf) return csrf;

  const assignmentId = String(request.nextUrl.searchParams.get('assignment_id') || '').trim();
  if (!assignmentId) {
    return NextResponse.json({ error: 'Assignment ID is required.' }, { status: 400 });
  }

  const existing = await supabaseDb(
    `assignment_submissions?assignment_id=eq.${encodeURIComponent(assignmentId)}&student_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`,
  );
  const submission = Array.isArray(existing) ? existing[0] : null;
  if (!submission?.id) {
    return NextResponse.json({ error: 'No submission found.' }, { status: 404 });
  }

  await supabaseDb(
    `assignment_submissions?id=eq.${encodeURIComponent(submission.id)}&student_id=eq.${encodeURIComponent(user.id)}`,
    { method: 'DELETE' },
  );

  return NextResponse.json({ ok: true });
}
