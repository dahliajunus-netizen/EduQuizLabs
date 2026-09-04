'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Test = { id: string; title: string; max_attempts?: number | null; allow_review?: boolean | null };
type Question = { id: string; question_order: number; question: string; question_type?: string | null; option_a: string | null; option_b: string | null; option_c: string | null; option_d: string | null; is_correct: boolean };
type Submission = { id: string; answers: Record<string, string> | null; score: number };

function typeOf(q: Question) { return String(q.question_type || 'multiple_choice').toLowerCase().replace(/-/g, '_'); }
function parseMatching(value: string) { try { const x = JSON.parse(value || '{}'); return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; } catch { return {}; } }

function displayAnswer(q: Question, value: string) {
  const type = typeOf(q);
  if (!value) return 'No answer';
  if (type === 'true_false' || type === 'truefalse' || type === 'boolean') {
    return value === 'A' || value.toLowerCase() === 'true' ? 'True' : value === 'B' || value.toLowerCase() === 'false' ? 'False' : value;
  }
  if (type === 'matching' || type === 'match') {
    const parsed = parseMatching(value);
    return Object.entries(parsed).map(([left, right]) => `${left}: ${String(right)}`).join(' · ') || 'No answer';
  }
  if (type === 'multiple_choice') {
    const map: Record<string, string | null | undefined> = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
    return map[value] ? `${value}: ${map[value]}` : value;
  }
  return value;
}

export default function TestReviewPage() {
  const { id: raw } = useParams<{ id: string }>();
  const id = String(raw || '');
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function token() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('supabase_access_token') || localStorage.getItem('access_token') || '';
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await fetch(`/api/student/tests/${encodeURIComponent(id)}/review`, {
          headers: { Authorization: `Bearer ${token()}`, Accept: 'application/json' },
          cache: 'no-store',
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || 'Failed to load review.');
        setTest(data.test);
        setQuestions(data.questions || []);
        setSubmission(data.submission);
        setAttemptsUsed(Number(data.attempts_used) || 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load review.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="size-8 animate-spin"/></div>;
  if (error || !test || !submission) return <main className="min-h-screen bg-background flex items-center justify-center p-6"><Card className="w-full max-w-xl"><CardContent className="p-8 text-center"><p className="text-destructive">{error || 'Review unavailable.'}</p><Button className="mt-4" onClick={() => router.push('/dashboard/student')}>Back to Dashboard</Button></CardContent></Card></main>;

  const answers = submission.answers || {};
  const max = Math.max(1, Number(test.max_attempts) || 1);
  return <div className="min-h-screen bg-background"><main className="mx-auto max-w-4xl space-y-6 px-6 py-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Review Test</h1><p className="mt-1 text-muted-foreground">{test.title}</p><p className="mt-2 font-medium">Score: {Number(submission.score).toFixed(2)}/100 · Attempts: {attemptsUsed}/{max}</p></div><Button variant="outline" onClick={() => router.push('/dashboard/student')}>Back</Button></div><div className="space-y-4">{questions.map((q,i) => { const a=answers[q.id]||''; const ok=q.is_correct; return <Card key={q.id} className={ok?'border-emerald-300':'border-rose-300'}><CardHeader><div className="flex items-start justify-between gap-4"><CardTitle className="text-lg">{i+1}. {q.question}</CardTitle><span className={ok?'text-emerald-600':'text-rose-600'}>{ok?<Check className="size-5"/>:<X className="size-5"/>}</span></div></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Your answer</p><div className="rounded-xl bg-muted p-3">{displayAnswer(q,a)}</div>{!ok&&<p className="text-sm text-muted-foreground">Your answer was marked incorrect. The correct answer is intentionally not exposed by this review endpoint.</p>}</CardContent></Card>; })}</div></main></div>;
}
