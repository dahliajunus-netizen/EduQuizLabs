import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser, serverConfigOk, supabaseDb } from '@/lib/server/supabase';

function safeQuestions(rows: any[]) {
  return rows.map(q => ({
    id: q.id,
    question_order: q.question_order,
    question: q.question,
    question_type: q.question_type,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_answer: q.correct_answer,
    points: q.points,
  }));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!serverConfigOk()) return NextResponse.json({ error: 'Server configuration is missing.' }, { status: 500 });
    const current = await authenticatedUser(request);
    if (!current?.id) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const { id } = await params;
    const tests = await supabaseDb(`tests?id=eq.${encodeURIComponent(id)}&published=eq.true&select=id,title,class_code,max_attempts,allow_review&limit=1`);
    const test = Array.isArray(tests) ? tests[0] : null;
    if (!test) return NextResponse.json({ error: 'Test not found or not published.' }, { status: 404 });
    if (test.allow_review === false) return NextResponse.json({ error: 'Review is not permitted for this test.' }, { status: 403 });

    const classes = await supabaseDb(`student_classes?student_id=eq.${encodeURIComponent(current.id)}&code=eq.${encodeURIComponent(String(test.class_code || ''))}&select=code&limit=1`);
    if (!classes?.length) return NextResponse.json({ error: 'You are not enrolled in this class.' }, { status: 403 });

    const submissions = await supabaseDb(`test_submissions?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(current.id)}&select=id,test_id,student_id,answers,score&order=id.desc`);
    if (!submissions?.length) return NextResponse.json({ error: 'No completed attempt was found.' }, { status: 404 });

    const questions = await supabaseDb(`test_questions?test_id=eq.${encodeURIComponent(id)}&select=id,question_order,question,question_type,option_a,option_b,option_c,option_d,correct_answer,points&order=question_order.asc,id.asc`);
    return NextResponse.json({
      test: { id: test.id, title: test.title, max_attempts: test.max_attempts, allow_review: test.allow_review },
      submission: submissions[0],
      attempts_used: submissions.length,
      questions: safeQuestions(questions),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load review.' }, { status: 500 });
  }
}
