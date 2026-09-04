'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Test = { id: string; title: string; max_attempts?: number | null; allow_review?: boolean | null };
type Question = { id: string; question: string; question_type?: string | null; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string; points: number };
type Submission = { id: string; answers: Record<string, string> | null; score: number };

function token() {
  if (typeof window === 'undefined') return '';
  for (const name of ['supabase_access_token', 'access_token']) {
    const value = localStorage.getItem(name);
    if (value) return value;
  }
  for (const name of ['supabase.auth.token', 'supabase_session']) {
    try {
      const parsed = JSON.parse(localStorage.getItem(name) || '');
      if (parsed?.access_token) return parsed.access_token;
      if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
    } catch {}
  }
  return '';
}
function headers() { return { Authorization: `Bearer ${token()}`, Accept: 'application/json' }; }
function typeOf(q: Question) { return String(q.question_type || 'multiple_choice').toLowerCase().replace(/-/g, '_'); }
function parseMatching(value: string) { try { const x = JSON.parse(value || '{}'); return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; } catch { return {}; } }
function parsePairs(value: string) { try { const x = JSON.parse(value || '[]'); return Array.isArray(x) ? x : []; } catch { return []; } }
function correct(q: Question, value: string) {
  const type = typeOf(q);
  if (type === 'matching' || type === 'match') {
    const submitted = parseMatching(value);
    const pairs = parsePairs(q.option_a || '[]');
    return pairs.length > 0 && pairs.every((pair: any) => String(submitted?.[pair.left] ?? '').trim().toLowerCase() === String(pair.right ?? '').trim().toLowerCase());
  }
  if (type === 'true_false') {
    const a = String(value || '').trim().toLowerCase();
    const b = String(q.correct_answer || '').trim().toLowerCase();
    return a === b || (a === 'a' && b === 'true') || (a === 'b' && b === 'false');
  }
  if (type === 'fill_blank' || type === 'fill_in_blank') {
    const accepted = String(q.option_a || q.correct_answer || '').split(/\s*(?:\|\||;|,)\s*/).map(x => x.trim().toLowerCase()).filter(Boolean);
    return accepted.includes(String(value || '').trim().toLowerCase());
  }
  return String(value || '').trim().toLowerCase() === String(q.correct_answer || '').trim().toLowerCase();
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

  useEffect(() => { if (!id) return; (async () => { try { const r = await fetch(`/api/student/tests/${encodeURIComponent(id)}/review`, { headers: headers(), cache: 'no-store' }); const data = await r.json().catch(() => ({})); if (!r.ok) throw new Error(data?.error || 'Failed to load review.'); setTest(data.test); setQuestions(data.questions || []); setSubmission(data.submission); setAttemptsUsed(Number(data.attempts_used) || 0); } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load review.'); } finally { setLoading(false); } })(); }, [id]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="size-8 animate-spin"/></div>;
  if (error || !test || !submission) return <main className="min-h-screen bg-background flex items-center justify-center p-6"><Card className="w-full max-w-xl"><CardContent className="p-8 text-center"><p className="text-destructive">{error || 'Review unavailable.'}</p><Button className="mt-4" onClick={() => router.push('/dashboard/student')}>Back to Dashboard</Button></CardContent></Card></main>;

  const answers = submission.answers || {};
  const max = Math.max(1, Number(test.max_attempts) || 1);
  return <div className="min-h-screen bg-background"><main className="mx-auto max-w-4xl space-y-6 px-6 py-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Review Test</h1><p className="mt-1 text-muted-foreground">{test.title}</p><p className="mt-2 font-medium">Score: {Number(submission.score).toFixed(2)}/100 · Attempts: {attemptsUsed}/{max}</p></div><Button variant="outline" onClick={() => router.push('/dashboard/student')}>Back</Button></div><div className="space-y-4">{questions.map((q,i) => { const a=answers[q.id]||''; const ok=correct(q,a); const type=typeOf(q); return <Card key={q.id} className={ok?'border-emerald-300':'border-rose-300'}><CardHeader><div className="flex items-start justify-between gap-4"><CardTitle className="text-lg">{i+1}. {q.question}</CardTitle><span className={ok?'text-emerald-600':'text-rose-600'}>{ok?<Check className="size-5"/>:<X className="size-5"/>}</span></div></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Your answer</p><div className="rounded-xl bg-muted p-3">{type==='true_false'?(a==='A'?'True':a==='B'?'False':a||'No answer'):type==='matching'?(parseMatching(a) && Object.entries(parseMatching(a)).map(([left,right]) => `${left}: ${right}`).join(' · ') || 'No answer'):a||'No answer'}</div>{!ok&&<><p className="text-sm font-medium text-emerald-700">Correct answer</p><div className="rounded-xl bg-emerald-50 p-3">{type==='true_false'?(q.correct_answer==='A'||String(q.correct_answer).toLowerCase()==='true'?'True':'False'):type==='fill_blank'||type==='fill_in_blank'?(q.option_a||q.correct_answer):type==='matching'||type==='match'?(parsePairs(q.option_a||'[]').map((pair:any)=>`${pair.left}: ${pair.right}`).join(' · ')||'See matching pairs'):q.correct_answer}</div></>}</CardContent></Card>; })}</div></main></div>;
}
