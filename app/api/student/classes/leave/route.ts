import { NextRequest, NextResponse } from 'next/server';
import { requireStudent } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';
import { csrfResponse } from '@/lib/server/csrf';

export async function DELETE(request: NextRequest) {
  const auth = await requireStudent(request);
  if (!auth.ok) return auth.response;
  const csrf = csrfResponse(request);
  if (csrf) return csrf;

  const code = String(request.nextUrl.searchParams.get('code') || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Class code is required.' }, { status: 400 });

  const membership = await supabaseDb(
    `student_classes?student_id=eq.${encodeURIComponent(auth.user.id)}&code=eq.${encodeURIComponent(code)}&select=id&limit=1`
  );
  if (!Array.isArray(membership) || !membership[0]?.id) {
    return NextResponse.json({ error: 'You are not a member of this class.' }, { status: 404 });
  }

  await supabaseDb(
    `student_classes?id=eq.${encodeURIComponent(membership[0].id)}&student_id=eq.${encodeURIComponent(auth.user.id)}`,
    { method: 'DELETE' }
  );

  return NextResponse.json({ ok: true });
}
