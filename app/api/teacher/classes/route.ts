import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { requireTeacher } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

const LEGACY_TEACHER_ID = '32b60aea-9c8f-4100-9999-999999999999';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  return Array.from({ length: 5 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
}

export async function GET(request: NextRequest) {
  const user = await requireTeacher(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  try {
    let rows = await supabaseDb(
      `teacher_classes?teacher_id=eq.${encodeURIComponent(user.id)}&select=id,class_name,school_name,code,teacher_id&order=class_name.asc`,
    );

    if (Array.isArray(rows) && rows.length === 0 && user.id !== LEGACY_TEACHER_ID) {
      const legacyRows = await supabaseDb(
        `teacher_classes?teacher_id=eq.${LEGACY_TEACHER_ID}&select=id,class_name,school_name,code,teacher_id&order=class_name.asc`,
      );
      if (Array.isArray(legacyRows) && legacyRows.length > 0) {
        await supabaseDb(`teacher_classes?teacher_id=eq.${LEGACY_TEACHER_ID}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ teacher_id: user.id }),
        });
        rows = legacyRows.map((row) => ({ ...row, teacher_id: user.id }));
      }
    }

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

    if (!className || !schoolName || className.length > 120 || schoolName.length > 160) {
      return NextResponse.json({ error: 'Invalid class details.' }, { status: 400 });
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = generateCode();
      try {
        const rows = await supabaseDb('teacher_classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify({ class_name: className, school_name: schoolName, code, teacher_id: user.id }),
        });
        return NextResponse.json(Array.isArray(rows) ? rows : [], { status: 201 });
      } catch (error) {
        if (attempt === 7) throw error;
      }
    }

    return NextResponse.json({ error: 'Unable to generate a unique class code.' }, { status: 500 });
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
