'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

type Test = { id: string; class_code: string; title: string; description: string | null; published: boolean };
type Question = {
  id: string;
  test_id: string;
  question_order: number;
  question: string;
  question_type?: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  points: number;
};
type MatchPair = { left: string; right: string };
type NormalizedType = 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

function getStudentId() {
  try {
    const raw = localStorage.getItem('current_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return String(u.student_id ?? u.id ?? u.user_id ?? u.uid ?? '').trim() || null;
  } catch {
    return null;
  }
}

// The database has existed with both hyphenated and underscored question-type
// values. Normalize all of them here so the student UI always renders correctly.
function typeOf(q: Question): NormalizedType {
  const raw = String(q.question_type ?? 'multiple-choice').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  if (raw === 'true-false' || raw === 'truefalse' || raw === 'boolean') return 'true-false';
  if (raw === 'fill-blank' || raw === 'fill-in-blank' || raw === 'fillintheblank' || raw === 'fill-blank-question') return 'fill-blank';
  if (raw === 'matching' || raw === 'match') return 'matching';
  return 'multiple-choice';
}

function pairsOf(q: Question): MatchPair[] {
  try {
    const parsed = JSON.parse(q.option_a || '[]');
    return Array.isArray(parsed)
      ? parsed
          .map((p: any) => ({ left: String(p?.left ?? ''), right: String(p?.right ?? '') }))
          .filter((p: MatchPair) => p.left && p.right)
      : [];
  } catch {
    return q.option_a && q.option_b ? [{ left: q.option_a, right: q.option_b }] : [];
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function trueFalseValue(value: string) {
  const v = normalize(value);
  if (v === 'a' || v === 'true') return 'A';
  if (v === 'b' || v === 'false') return 'B';
  return value;
}

export default function TakeTestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id || '');
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [already, setAlready] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const tr = await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(id)}&published=eq.true&select=*`, { headers, cache: 'no-store' });
        const td = await tr.json();
        if (!tr.ok || !td[0]) throw new Error('Test not found or not published.');
        setTest(td[0]);

        const qr = await fetch(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(id)}&select=*&order=question_order.asc`, { headers, cache: 'no-store' });
        if (!qr.ok) throw new Error(await qr.text());
        setQuestions(await qr.json());

        const sid = getStudentId();
        if (!sid) throw new Error('Student UUID not found. Please sign in again.');
        const sr = await fetch(`${url}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(sid)}&select=*`, { headers, cache: 'no-store' });
        if (sr.ok) {
          const data = await sr.json();
          if (data[0]) {
            setAlready(true);
            setResult(Math.min(100, Number(data[0].score) || 0));
          }
        }
      } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : 'Failed to load test.');
        router.push('/dashboard/student/tests');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const matchingOptions = useMemo(() => {
    const all = new Set<string>();
    questions.filter(q => typeOf(q) === 'matching').forEach(q => pairsOf(q).forEach(p => all.add(p.right)));
    return Array.from(all);
  }, [questions]);

  function answered(q: Question) {
    if (typeOf(q) === 'matching') {
      try {
        const submitted = JSON.parse(answers[q.id] || '{}');
        const pairs = pairsOf(q);
        return pairs.length > 0 && pairs.every(pair => Boolean(submitted[pair.left]));
      } catch {
        return false;
      }
    }
    return Boolean(answers[q.id]?.trim());
  }

  function isCorrect(q: Question) {
    const answer = answers[q.id] || '';
    const type = typeOf(q);

    if (type === 'fill-blank') {
      return normalize(answer) === normalize(q.option_a || q.correct_answer || '');
    }

    if (type === 'matching') {
      try {
        const submitted = JSON.parse(answer) as Record<string, string>;
        const pairs = pairsOf(q);
        return pairs.length > 0 && pairs.every(p => submitted[p.left] === p.right);
      } catch {
        return false;
      }
    }

    if (type === 'true-false') {
      return trueFalseValue(answer) === trueFalseValue(q.correct_answer);
    }

    return normalize(answer) === normalize(q.correct_answer);
  }

  async function submit() {
    if (already || !test || !questions.length) return;
    const sid = getStudentId();
    if (!sid) {
      alert('Student UUID not found. Please sign in again.');
      return;
    }
    if (questions.some(q => !answered(q))) {
      alert('Please answer every question before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const latest = await fetch(`${url}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(sid)}&select=id,score`, { headers, cache: 'no-store' });
      if (latest.ok && (await latest.json()).length) {
        setAlready(true);
        alert('You have already submitted this test.');
        return;
      }

      const total = questions.reduce((s, q) => s + Math.max(0, Number(q.points) || 0), 0);
      const earned = questions.reduce((s, q) => s + (isCorrect(q) ? Math.max(0, Number(q.points) || 0) : 0), 0);
      const score = total > 0 ? Math.min(100, Math.round((earned / total) * 10000) / 100) : 0;

      const r = await fetch(`${url}/rest/v1/test_submissions`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ test_id: id, student_id: sid, answers, score }),
      });
      if (!r.ok) throw new Error(await r.text());
      setResult(score);
      setAlready(true);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to submit test.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[70vh] items-center justify-center"><Loader2 className="size-8 animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-3xl space-y-6 px-6 py-8">
        <Link href="/dashboard/student/tests">
          <Button variant="ghost" className="gap-2"><ArrowLeft className="size-4" />Back to Tests</Button>
        </Link>

        {test && (
          <>
            <div>
              <h1 className="text-3xl font-bold">{test.title}</h1>
              <p className="text-muted-foreground">Class: {test.class_code}</p>
              {test.description && <p className="mt-2 text-sm text-muted-foreground">{test.description}</p>}
            </div>

            {already && result !== null ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <CheckCircle2 className="mx-auto mb-4 size-12 text-primary" />
                  <h2 className="text-2xl font-bold">Test Submitted</h2>
                  <p className="mt-2 text-muted-foreground">Your automatic score is</p>
                  <p className="mt-1 text-5xl font-bold text-primary">{Math.min(100, result)}<span className="text-xl">/100</span></p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-5">
                  {questions.map((q, i) => {
                    const type = typeOf(q);
                    return (
                      <Card key={q.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{i + 1}. {q.question}</CardTitle>
                          <p className="text-xs text-muted-foreground">{Math.max(0, Number(q.points) || 0)} point{Number(q.points) === 1 ? '' : 's'}</p>
                        </CardHeader>
                        <CardContent>
                          {type === 'multiple-choice' && (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {(['A', 'B', 'C', 'D'] as const).map(letter => {
                                const text = q[`option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d'];
                                const selected = answers[q.id] === letter;
                                return (
                                  <button
                                    type="button"
                                    key={letter}
                                    onClick={() => setAnswers(a => ({ ...a, [q.id]: letter }))}
                                    className={`min-h-16 rounded-xl border-2 px-4 py-3 text-left transition ${selected ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'hover:border-primary/50 hover:bg-accent'}`}
                                  >
                                    <span className="mr-3 inline-flex size-8 items-center justify-center rounded-full border font-bold">{letter}</span>
                                    <span>{text}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {type === 'true-false' && (
                            <div className="grid grid-cols-2 gap-3">
                              {(['A', 'B'] as const).map(letter => {
                                const value = letter === 'A' ? 'True' : 'False';
                                const selected = answers[q.id] === letter;
                                return (
                                  <button
                                    type="button"
                                    key={letter}
                                    onClick={() => setAnswers(a => ({ ...a, [q.id]: letter }))}
                                    className={`min-h-20 rounded-xl border-2 text-lg font-semibold transition ${selected ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20' : 'hover:border-primary/50 hover:bg-accent'}`}
                                  >
                                    {value}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {type === 'fill-blank' && (
                            <div>
                              <label className="mb-2 block text-sm font-medium">Your answer</label>
                              <Input className="h-12 text-base" value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} placeholder="Type your answer here..." />
                            </div>
                          )}

                          {type === 'matching' && (
                            <div className="space-y-3">
                              {pairsOf(q).map((pair, index) => {
                                let current = '';
                                try { current = JSON.parse(answers[q.id] || '{}')[pair.left] || ''; } catch {}
                                return (
                                  <div key={pair.left + index} className="grid items-center gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto_1fr]">
                                    <div className="font-medium">{pair.left}</div>
                                    <span className="text-muted-foreground">↔</span>
                                    <select
                                      className="h-10 rounded-md border bg-background px-3"
                                      value={current}
                                      onChange={e => {
                                        let next: Record<string, string> = {};
                                        try { next = JSON.parse(answers[q.id] || '{}'); } catch {}
                                        next[pair.left] = e.target.value;
                                        setAnswers(a => ({ ...a, [q.id]: JSON.stringify(next) }));
                                      }}
                                    >
                                      <option value="">Select a match...</option>
                                      {matchingOptions.map(option => <option key={option} value={option}>{option}</option>)}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Button className="w-full" size="lg" onClick={submit} disabled={submitting || !questions.length}>
                  {submitting ? <><Loader2 className="mr-2 size-4 animate-spin" />Submitting...</> : 'Submit Test'}
                </Button>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
