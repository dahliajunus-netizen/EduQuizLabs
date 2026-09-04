import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser, serverConfigOk, supabaseDb } from '@/lib/server/supabase';

function typeOf(value: unknown) {
  return String(value || 'multiple_choice').toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
}

function normalize(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isCorrect(q: any, answer: unknown) {
  const type = typeOf(q.question_type);
  const submitted = normalize(answer);
  if (!submitted) return false;

  if (type === 'matching' || type === 'match') {
    let pairs: any[] = [];
    let submittedMap: Record<string, unknown> = {};
    try {
      const rawPairs = JSON.parse(String(q.option_a || '[]'));
      if (Array.isArray(rawPairs)) pairs = rawPairs;
      const rawAnswer = JSON.parse(String(answer || '{}'));
      if (rawAnswer && typeof rawAnswer === 'object' && !Array.isArray(rawAnswer)) submittedMap = rawAnswer;
    } catch {
      return false;
    }
    return pairs.length > 0 && pairs.every(pair => normalize(submittedMap[String(pair?.left || '')]) === normalize(pair?.right));
  }

  if (type === 'fill_blank' || type === 'fill_in_blank') {
    const accepted = normalize(q.option_a || q.correct_answer)
      .split(/\s*(?:\|\||;)\s*/)
      .map(normalize)
      .filter(Boolean);
    return accepted.includes(submitted);
  }

  const correct = normalize(q.correct_answer);
  if (type === 'true_false' || type === 'truefalse' || type === 'boolean') {
    return (submitted === 'a' && ['a', 'true'].includes(correct))
      || (submitted === 'b' && ['b', 'false'].includes(correct))
      || submitted === correct;
  }

  return submitted === correct;
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

    const questions = await supabaseDb(`test_questions?test_id=eq.${encodeURIComponent(id)}&select=id,question_order,question,question_type,option_a,option_b,option_c,option_d&order=question_order.asc,id.asc`);
    const submission = submissions[0];
    const answers = submission.answers && typeof submission.answers === 'object' ? submission.answers : {};

    const safeQuestions = (Array.isArray(questions) ? questions : []).map((q: any) => ({
      id: q.id,
      question_order: q.question_order,
      question: q.question,
      question_type: q.question_type,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      is_correct: isCorrect(q, answers?.[q.id]),
    }));

    return NextResponse.json({
      test: { id: test.id, title: test.title, max_attempts: test.max_attempts, allow_review: test.allow_review },
      submission,
      attempts_used: submissions.length,
      questions: safeQuestions,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load review.' }, { status: 500 });
  }
}
