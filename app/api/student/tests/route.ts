import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser, serverConfigOk, supabaseDb } from '@/lib/server/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!serverConfigOk()) return NextResponse.json({ error: 'Server configuration is missing.' }, { status: 500 });
    const user = await authenticatedUser(request);
    if (!user?.id) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const classes = await supabaseDb(`student_classes?student_id=eq.${encodeURIComponent(user.id)}&select=code`);
    const codes = [...new Set(
      (Array.isArray(classes) ? classes : [])
        .map((row: any) => String(row.code || '').trim())
        .filter(Boolean),
    )];

    if (!codes.length) return NextResponse.json({ tests: [], submissions: [] });

    const filter = codes.map(code => `"${code.replace(/"/g, '\\"')}"`).join(',');
    const tests = await supabaseDb(
      `tests?published=eq.true&class_code=in.(${filter})&select=id,class_code,title,description,published,created_at,due_date,time_limit_minutes,max_attempts,allow_review&order=created_at.desc`
    );
    const submissions = await supabaseDb(
      `test_submissions?student_id=eq.${encodeURIComponent(user.id)}&select=id,test_id,student_id,score&order=id.desc`
    );

    return NextResponse.json({
      tests: Array.isArray(tests) ? tests : [],
      submissions: Array.isArray(submissions) ? submissions : [],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load tests.' }, { status: 500 });
  }
}
