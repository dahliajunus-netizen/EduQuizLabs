import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

export async function GET(request: NextRequest) {
  const user = await requireTeacher(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  try {
    const rows = await supabaseDb(
      `teacher_classes?teacher_id=eq.${encodeURIComponent(user.id)}&select=id,class_name,school_name,code,teacher_id&order=class_name.asc`,
    );
    return NextResponse.json(Array.isArray(rows) ? rows : []);
  } catch (error) {
    console.error('[Teacher Classes API] GET failed:', error);
    return NextResponse.json({ error: 'Unable to load classes.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireTeacher(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await request.json();
    const className = typeof body?.class_name === 'string' ? body.class_name.trim() : '';
    const schoolName = typeof body?.school_name === 'string' ? body.school_name.trim() : '';
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';

    if (!className || !schoolName || !/^[A-Z0-9]{5}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid class details.' }, { status: 400 });
    }

    const rows = await supabaseDb('teacher_classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        class_name: className,
        school_name: schoolName,
        code,
        teacher_id: user.id,
      }),
    });

    return NextResponse.json(Array.isArray(rows) ? rows : [], { status: 201 });
  } catch (error) {
    console.error('[Teacher Classes API] POST failed:', error);
    return NextResponse.json({ error: 'Unable to create class.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireTeacher(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase() || '';
  if (!code) return NextResponse.json({ error: 'Class code is required.' }, { status: 400 });

  try {
    await supabaseDb(
      `teacher_classes?code=eq.${encodeURIComponent(code)}&teacher_id=eq.${encodeURIComponent(user.id)}`,
      { method: 'DELETE' },
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[Teacher Classes API] DELETE failed:', error);
    return NextResponse.json({ error: 'Unable to delete class.' }, { status: 500 });
  }
}
