'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, X } from 'lucide-react';

type Test = { id: string; title: string; published: boolean; max_attempts?: number | null; allow_review?: boolean | null };
type Question = { id: string; question: string; question_type?: string | null; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string; points: number };
type Submission = { id: string; test_id: string; student_id: string; answers: Record<string, string> | null; score: number };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

function getStudentId() {
  try {
    const raw = localStorage.getItem('current_user');
    if (!raw) return '';
    const u = JSON.parse(raw);
    return String(u.student_id ?? u.id ?? u.user_id ?? u.uid ?? '').trim();
  } catch { return ''; }
}
function normalize(value: string) { return String(value || '').trim().toLowerCase(); }
function typeOf(question: Question) {
  const type = String(question.question_type || 'multiple-choice').toLowerCase().replace(/_/g, '-');
  if (type === 'true-false' || type === 'truefalse' || type === 'boolean') return 'true-false';
  if (type === 'fill-blank' || type === 'fill-in-blank') return 'fill-blank';
  if (type === 'matching' || type === 'match') return 'matching';
  return 'multiple-choice';
}
function isCorrect(question: Question, answers: Record<string, string>) {
  const answer = answers[question.id] || '';
  const type = typeOf(question);
  if (type === 'true-false') return normalize(answer) === normalize(question.correct_answer) || (answer === 'A' && normalize(question.correct_answer) === 'true') || (answer === 'B' && normalize(question.correct_answer) === 'false');
  if (type === 'fill-blank') return normalize(answer) === normalize(question.option_a || question.correct_answer);
  return normalize(answer) === normalize(question.correct_answer);
}

export default function TestReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id || '');
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const studentId = getStudentId();
        if (!studentId) throw new Error('Student UUID not found. Please sign in again.');
        const testResponse = await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(id)}&published=eq.true&select=*`, { headers, cache: 'no-store' });
        const testRows = await testResponse.json();
        if (!testResponse.ok || !testRows[0]) throw new Error('Test not found or not published.');
        const loadedTest = testRows[0] as Test;
        setTest(loadedTest);
        if (loadedTest.allow_review === false) throw new Error('Review is not permitted for this test.');

        const submissionResponse = await fetch(`${url}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(studentId)}&select=*`, { headers, cache: 'no-store' });
        if (!submissionResponse.ok) throw new Error(await submissionResponse.text());
        const submissionRows = await submissionResponse.json();
        const rows = Array.isArray(submissionRows) ? submissionRows as Submission[] : [];
        setAttemptsUsed(rows.length);
        if (!rows[0]) throw new Error('No completed attempt was found.');
        setSubmission(rows[rows.length - 1]);

        const questionResponse = await fetch(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(id)}&select=*&order=question_order.asc,id.asc`, { headers, cache: 'no-store' });
        if (!questionResponse.ok) throw new Error(await questionResponse.text());
        setQuestions(await questionResponse.json());
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to load test review.');
      } finally { setLoading(false); }
    })();
  }, [id, router]);

  if (loading) return <div className="min-h-screen bg-background"><div className="flex h-screen items-center justify-center"><Loader2 className="size-8 animate-spin" /></div></div>;
  if (error || !test || !submission) return <div className="min-h-screen bg-background"><main className="mx-auto max-w-xl px-6 py-12"><Card><CardContent className="py-10 text-center"><p className="text-destructive">{error || 'Review unavailable.'}</p><Button className="mt-4" onClick={() => router.push('/dashboard/student')}>Back to Dashboard</Button></CardContent></Card></main></div>;

  const answers = submission.answers || {};
  const maxAttempts = Math.max(1, Number(test.max_attempts) || 1);
  const canRetry = attemptsUsed < maxAttempts;

  return <div className="min-h-screen bg-background"><main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Review Test</h1><p className="mt-1 text-muted-foreground">{test.title}</p><p className="mt-2 text-sm font-medium">Score: {Number(submission.score).toFixed(2)}/100 · Attempts used: {attemptsUsed}/{maxAttempts}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => router.push('/dashboard/student')}>Back</Button>{canRetry && <Button onClick={() => router.push(`/dashboard/student/tests/${encodeURIComponent(id)}`)}>Retry Assessment</Button>}</div></div>
    <div className="space-y-4">{questions.map((question, index) => { const correct = isCorrect(question, answers); const type = typeOf(question); const selected = answers[question.id] || ''; return <Card key={question.id} className={correct ? 'border-green-500' : 'border-red-500'}><CardHeader><div className="flex items-start justify-between gap-4"><CardTitle className="text-lg">{index + 1}. {question.question}</CardTitle><span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold">{question.points} pts</span></div><p className={`flex items-center gap-2 text-sm font-semibold ${correct ? 'text-green-600' : 'text-red-600'}`}>{correct ? <Check className="size-4" /> : <X className="size-4" />}{correct ? 'Correct' : 'Incorrect'}</p></CardHeader><CardContent className="space-y-3">
      {type === 'multiple-choice' && (['A','B','C','D'] as const).map(letter => { const text = question[`option_${letter.toLowerCase()}` as 'option_a'|'option_b'|'option_c'|'option_d']; const selectedAnswer = selected === letter; const correctAnswer = question.correct_answer === letter; return <div key={letter} className={`rounded-lg border p-3 ${correctAnswer ? 'border-green-500 bg-green-500/10' : selectedAnswer ? 'border-red-500 bg-red-500/10' : ''}`}><b>{letter}.</b> {text}{selectedAnswer && <span className="ml-2 text-xs font-semibold">Your answer</span>}{correctAnswer && <span className="ml-2 text-xs font-semibold text-green-600">Correct answer</span>}</div>; })}
      {type === 'true-false' && <div className="rounded-lg border p-4"><span className="font-medium">Your answer:</span> {selected === 'A' ? 'True' : selected === 'B' ? 'False' : selected || 'No answer'}<div className="mt-2 text-sm text-green-600"><span className="font-medium">Correct answer:</span> {question.correct_answer === 'A' || normalize(question.correct_answer) === 'true' ? 'True' : 'False'}</div></div>}
      {type === 'fill-blank' && <div className="space-y-2"><div className="rounded-lg border p-3"><span className="text-sm text-muted-foreground">Your answer</span><p>{selected || 'No answer'}</p></div><div className="rounded-lg border border-green-500 bg-green-500/10 p-3"><span className="text-sm text-muted-foreground">Correct answer</span><p>{question.option_a || question.correct_answer}</p></div></div>}
      {type === 'matching' && <div className="rounded-lg border p-4 text-sm"><p className="font-medium">Your matching answer</p><pre className="mt-2 whitespace-pre-wrap break-words">{selected || 'No answer'}</pre></div>}
    </CardContent></Card>; })}</div>
  </main></div>;
}
