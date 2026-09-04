'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Loader2,
  Lock,
  Menu,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/Navbar';

type Test = {
  id: string;
  title: string;
  description?: string | null;
  class_code?: string;
  time_limit_minutes?: number | null;
  max_attempts?: number | null;
  allow_review?: boolean | null;
  requires_password?: boolean;
};
type Question = {
  id: string;
  test_id: string;
  question_order: number;
  question: string;
  question_type?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  points?: number | null;
  image_url?: string | null;
};
type Submission = { id: string; score: number; answers?: Record<string, string> | null };
type Attempt = { id: string; answers?: Record<string, string> | null; started_at?: string | null };
type Pair = { left: string; right: string };

const endpoint = (id: string) => `/api/student/tests/${encodeURIComponent(id)}`;

function getToken() {
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

function requestHeaders(json = false) {
  return {
    Authorization: `Bearer ${getToken()}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function typeOf(q: Question) {
  return String(q.question_type || 'multiple_choice')
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');
}

function typeLabel(q: Question) {
  const type = typeOf(q);
  if (type === 'multiple_choice') return 'Multiple choice';
  if (type === 'true_false' || type === 'truefalse' || type === 'boolean') return 'True or false';
  if (type === 'fill_blank' || type === 'fill_in_blank') return 'Fill in the blank';
  if (type === 'matching' || type === 'match') return 'Matching';
  return 'Question';
}

function parseJson<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(String(value || '')) as T;
  } catch {
    return fallback;
  }
}

function pairs(q: Question): Pair[] {
  const raw = parseJson<Array<{ left?: unknown; right?: unknown }>>(q.option_a, []);
  return raw
    .map((p) => ({ left: String(p?.left || '').trim(), right: String(p?.right || '').trim() }))
    .filter((p) => p.left);
}

function matchingOptions(q: Question): string[] {
  const safeOptions = parseJson<unknown[]>(q.option_b, []);
  if (Array.isArray(safeOptions) && safeOptions.every((v) => typeof v === 'string')) {
    return Array.from(new Set(safeOptions.map((v) => String(v).trim()).filter(Boolean)));
  }
  return pairs(q).map((p) => p.right).filter(Boolean);
}

function matchingMap(value: string): Record<string, string> {
  try {
    const x = JSON.parse(value || '{}');
    return x && typeof x === 'object' && !Array.isArray(x) ? x : {};
  } catch {
    return {};
  }
}

function isAnswered(q: Question, answers: Record<string, string>) {
  const value = answers[q.id] || '';
  if (typeOf(q) === 'matching' || typeOf(q) === 'match') {
    const lefts = pairs(q).map((p) => p.left);
    const selected = matchingMap(value);
    return lefts.length > 0 && lefts.every((left) => Boolean(String(selected[left] || '').trim()));
  }
  return Boolean(value.trim());
}

export default function TakeTestPage() {
  const { id: raw } = useParams<{ id: string }>();
  const id = String(raw || '');
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState(true);
  const answersRef = useRef<Record<string, string>>({});
  const savingRef = useRef(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(endpoint(id), { headers: requestHeaders(), cache: 'no-store' });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || 'Failed to load test.');
      setTest(data.test);
      setQuestions(data.questions || []);
      setSubmissions(data.submissions || []);
      setAttempt(data.attempt || null);
      const restored = data.attempt?.answers || {};
      setAnswers(restored);
      answersRef.current = restored;
      setUnlocked(!data.test?.requires_password && Boolean(data.attempt));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load test.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) void load();
  }, [id, load]);

  const maxAttempts = Math.max(1, Number(test?.max_attempts) || 1);
  const attemptsLeft = Math.max(0, maxAttempts - submissions.length);
  const answeredCount = questions.filter((q) => isAnswered(q, answers)).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  const save = useCallback(
    async (next = answersRef.current) => {
      if (!attempt?.id || savingRef.current || complete) return;
      savingRef.current = true;
      setSaved(false);
      try {
        const r = await fetch(endpoint(id), {
          method: 'POST',
          headers: requestHeaders(true),
          body: JSON.stringify({ action: 'save', answers: next }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || 'Save failed.');
        setSaved(true);
        setError('');
        if (data?.auto_submitted) {
          setSubmissions((s) => (data.submission ? [data.submission, ...s] : s));
          setComplete(true);
          setAttempt(null);
          setRemaining(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Your latest answer could not be saved.');
      } finally {
        savingRef.current = false;
      }
    },
    [attempt?.id, complete, id],
  );

  useEffect(() => {
    if (!attempt?.id || complete) return;
    const timer = window.setInterval(() => void save(), 5000);
    const onHide = () => void save();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', onHide);
    };
  }, [attempt?.id, complete, save]);

  useEffect(() => {
    if (!attempt?.started_at || !test?.time_limit_minutes || complete) return;
    const deadline = new Date(attempt.started_at).getTime() + Number(test.time_limit_minutes) * 60000;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [attempt?.started_at, test?.time_limit_minutes, complete]);

  const access = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(endpoint(id), {
        method: 'POST',
        headers: requestHeaders(true),
        body: JSON.stringify({ action: 'access', password: enteredPassword }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || 'Could not start test.');
      setTest(data.test);
      setQuestions(data.questions || []);
      setSubmissions(data.submissions || []);
      setAttempt(data.attempt || null);
      const restored = data.attempt?.answers || {};
      setAnswers(restored);
      answersRef.current = restored;
      setUnlocked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start test.');
    } finally {
      setBusy(false);
    }
  };

  const setAnswer = (qid: string, value: string) => {
    const next = { ...answersRef.current, [qid]: value };
    answersRef.current = next;
    setAnswers(next);
    void save(next);
  };

  const submit = async () => {
    if (!attempt?.id || submittingRef.current) return;
    if (questions.some((q) => !isAnswered(q, answersRef.current))) {
      setError('Please answer every question before submitting.');
      return;
    }
    if (!confirm) {
      setConfirm(true);
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    setError('');
    try {
      const r = await fetch(endpoint(id), {
        method: 'POST',
        headers: requestHeaders(true),
        body: JSON.stringify({ action: 'submit', answers: answersRef.current }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const details = data?.details || data?.hint || data?.message;
        throw new Error([data?.error, details].filter(Boolean).join(' — ') || 'Failed to submit test.');
      }
      if (!data?.submission) {
        throw new Error('The server accepted the submission but did not return a submission record. Please reload before trying again.');
      }
      setSubmissions((s) => [data.submission, ...s]);
      setComplete(true);
      setAttempt(null);
      setRemaining(null);
      setAnswers({});
      answersRef.current = {};
      setConfirm(false);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit test.');
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrent(Math.max(0, Math.min(index, questions.length - 1)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-xl px-6 py-12">
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <p className="text-destructive">{error || 'Unable to load test.'}</p>
              <Button onClick={() => router.back()}>Go back</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!unlocked && attemptsLeft > 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto flex min-h-[75vh] max-w-lg items-center px-6 py-12">
          <Card className="w-full overflow-hidden rounded-3xl shadow-sm">
            <CardHeader className="border-b bg-gradient-to-br from-primary/[0.08] to-background p-8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Lock className="size-6" />
              </div>
              <CardTitle className="mt-4 text-3xl tracking-tight">{test.title}</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">{test.description || 'Assessment'}</p>
            </CardHeader>
            <CardContent className="space-y-5 p-8">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questions</p>
                  <p className="mt-1 text-2xl font-black">{questions.length}</p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attempts</p>
                  <p className="mt-1 text-2xl font-black">{attemptsLeft}</p>
                </div>
              </div>
              {test.time_limit_minutes ? (
                <div className="flex items-center gap-3 rounded-2xl border bg-muted/20 p-4 text-sm">
                  <Clock3 className="size-5 text-primary" />
                  <span>Once started, you have <strong>{test.time_limit_minutes} minutes</strong> to finish.</span>
                </div>
              ) : null}
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
              )}
              {test.requires_password && (
                <Input
                  autoFocus
                  type="password"
                  autoComplete="off"
                  placeholder="Assessment password"
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void access();
                  }}
                />
              )}
              <Button className="h-12 w-full rounded-xl" onClick={() => void access()} disabled={busy}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Lock className="mr-2 size-4" />}
                {busy ? 'Opening…' : 'Start assessment'}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => router.back()}>
                Back
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (complete || attemptsLeft <= 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-xl px-6 py-12">
          <Card className="overflow-hidden rounded-3xl shadow-sm">
            <CardContent className="space-y-6 p-10 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="size-9 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Assessment complete</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight">Test submitted</h1>
              </div>
              <div className="rounded-3xl border bg-muted/20 p-6">
                <p className="text-sm text-muted-foreground">Latest score</p>
                <p className="mt-2 text-6xl font-black tracking-tight">{Number(submissions[0]?.score || 0).toFixed(2)}%</p>
              </div>
              <p className="text-sm text-muted-foreground">Attempts used: {submissions.length}/{maxAttempts}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {test.allow_review !== false && (
                  <Button variant="outline" className="w-full" onClick={() => router.push(`/dashboard/student/tests/${encodeURIComponent(id)}/review`)}>
                    Review attempt
                  </Button>
                )}
                <Button className="w-full" onClick={() => router.back()}>Back</Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const q = questions[current];
  if (!q) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-xl px-6 py-12">
          <Card>
            <CardContent className="p-8 text-center">This test has no questions.</CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const qType = typeOf(q);
  const answer = answers[q.id] || '';
  const selected = matchingMap(answer);
  const time = remaining === null ? null : `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  const timeCritical = remaining !== null && remaining <= 60;
  const timeWarning = remaining !== null && remaining <= 300 && !timeCritical;
  const currentAnswered = isAnswered(q, answers);

  const choiceQuestions = useMemo(
    () => questions.map((question, index) => ({ question, index, answered: isAnswered(question, answers) })),
    [questions, answers],
  );

  return (
    <div className="min-h-screen bg-muted/20 pb-28">
      <Navbar />

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2 px-2 sm:px-3">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Leave test</span>
          </Button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm shadow-sm ${timeCritical ? 'border-destructive/40 bg-destructive/10 text-destructive' : timeWarning ? 'border-amber-300 bg-amber-50 text-amber-700' : 'bg-background'}`}>
              <Clock3 className="size-4" />
              <span className="font-mono font-bold tabular-nums">{time || 'No limit'}</span>
            </div>
            <div className="hidden items-center gap-2 rounded-full border bg-background px-3 py-2 text-xs text-muted-foreground shadow-sm sm:flex">
              {saved ? <Save className="size-3.5" /> : <Loader2 className="size-3.5 animate-spin" />}
              {saved ? 'Saved' : 'Saving…'}
            </div>
          </div>
        </div>

        {error && (
          <Card className="mb-4 border-destructive/30 bg-destructive/5 shadow-none sm:mb-5">
            <CardContent className="flex items-start gap-3 py-3 text-sm text-destructive">
              <X className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 flex-1">{error}</span>
              <Button size="icon" variant="ghost" className="-mr-2 -mt-2 shrink-0" onClick={() => setError('')}>
                <X className="size-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-5 rounded-2xl border bg-background p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Assessment</p>
              <h1 className="truncate text-lg font-black tracking-tight sm:text-xl">{test.title}</h1>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-sm font-bold">{answeredCount} of {questions.length} answered</p>
            </div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="min-w-0">
            <Card className="overflow-hidden rounded-3xl border-0 shadow-md ring-1 ring-border/70">
              <CardHeader className="border-b bg-background p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">Question {current + 1}</span>
                    <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">{typeLabel(q)}</span>
                  </div>
                  <span className={`text-xs font-semibold ${currentAnswered ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {currentAnswered ? 'Answered' : 'Not answered'}
                  </span>
                </div>
                <CardTitle className="max-w-4xl pt-4 text-2xl leading-[1.25] tracking-tight sm:text-3xl">{q.question}</CardTitle>

                {q.image_url && (
                  <div className="mt-5 overflow-hidden rounded-2xl border bg-muted/20 p-2">
                    <img
                      src={q.image_url}
                      alt="Question illustration"
                      className="mx-auto max-h-[30rem] w-auto max-w-full rounded-xl object-contain"
                      loading="eager"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4 bg-background p-5 sm:p-7">
                {qType === 'multiple_choice' && (
                  <div className="grid gap-3">
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                      const value = q[`option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d'] || '';
                      if (!value) return null;
                      const selectedAnswer = answer === letter;
                      return (
                        <button
                          key={letter}
                          type="button"
                          aria-pressed={selectedAnswer}
                          onClick={() => setAnswer(q.id, letter)}
                          className={`group flex min-h-16 w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${selectedAnswer ? 'border-primary bg-primary/[0.07] shadow-sm' : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30'}`}
                        >
                          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl border text-sm font-black ${selectedAnswer ? 'border-primary bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground'}`}>
                            {letter}
                          </span>
                          <span className="flex-1 text-[15px] font-medium leading-6 sm:text-base">{value}</span>
                          <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${selectedAnswer ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                            {selectedAnswer && <Check className="size-4" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {(qType === 'true_false' || qType === 'truefalse' || qType === 'boolean') && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ['A', 'True'],
                      ['B', 'False'],
                    ].map(([letter, label]) => {
                      const active = answer === letter;
                      return (
                        <button
                          key={letter}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setAnswer(q.id, letter)}
                          className={`flex min-h-20 items-center justify-center gap-3 rounded-2xl border-2 px-5 text-lg font-bold transition-all hover:-translate-y-0.5 hover:shadow-sm ${active ? 'border-primary bg-primary/[0.07] text-primary shadow-sm' : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30'}`}
                        >
                          <span className="flex size-9 items-center justify-center rounded-xl bg-muted/50 text-sm">{letter}</span>
                          {label}
                          {active && <Check className="size-5" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {(qType === 'fill_blank' || qType === 'fill_in_blank') && (
                  <div className="space-y-3 rounded-2xl border bg-muted/20 p-4 sm:p-5">
                    <label className="text-sm font-semibold">Your answer</label>
                    <Input
                      autoComplete="off"
                      value={answer}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      placeholder="Type your answer here…"
                      className="h-12 rounded-xl bg-background text-base"
                    />
                    <p className="text-xs text-muted-foreground">Your answer is saved automatically while you work.</p>
                  </div>
                )}

                {(qType === 'matching' || qType === 'match') && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                      <CircleHelp className="mt-0.5 size-4 shrink-0" />
                      Match every item on the left with the best option on the right.
                    </div>
                    {pairs(q).map((pair) => (
                      <div key={pair.left} className="grid gap-2 rounded-2xl border p-3 sm:grid-cols-[1fr_1fr] sm:items-center">
                        <div className="rounded-xl bg-muted/30 p-3 font-medium leading-5">{pair.left}</div>
                        <select
                          className="h-12 rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background focus:border-primary focus:ring-2 focus:ring-primary/20"
                          value={selected[pair.left] || ''}
                          onChange={(e) => setAnswer(q.id, JSON.stringify({ ...selected, [pair.left]: e.target.value }))}
                        >
                          <option value="">Choose a match</option>
                          {matchingOptions(q).map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {confirm && (
              <Card className="mt-4 rounded-2xl border-amber-300 bg-amber-50 shadow-none dark:border-amber-900/60 dark:bg-amber-950/20">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                  <div>
                    <p className="font-bold">Ready to submit?</p>
                    <p className="text-sm text-muted-foreground">You answered {answeredCount} of {questions.length} questions.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setConfirm(false)} disabled={busy}>Continue</Button>
                    <Button onClick={() => void submit()} disabled={busy}>{busy ? 'Submitting…' : 'Confirm submit'}</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border bg-background p-3 shadow-sm sm:p-4">
              <Button variant="outline" className="min-w-24 rounded-xl" onClick={() => goToQuestion(current - 1)} disabled={current === 0 || busy}>
                Previous
              </Button>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Question</p>
                <p className="font-bold tabular-nums">{current + 1} / {questions.length}</p>
              </div>
              {current < questions.length - 1 ? (
                <Button className="min-w-24 rounded-xl" onClick={() => goToQuestion(current + 1)} disabled={busy}>Next</Button>
              ) : (
                <Button className="min-w-24 rounded-xl" onClick={() => void submit()} disabled={busy}>Submit test</Button>
              )}
            </div>
          </section>

          <aside className="hidden lg:block lg:sticky lg:top-24">
            <Card className="overflow-hidden rounded-3xl shadow-sm">
              <CardHeader className="border-b p-5">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Questions</CardTitle>
                  <span className="text-xs font-semibold text-muted-foreground">{answeredCount}/{questions.length}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 p-5">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-2.5">
                    <span className="size-2.5 rounded-full bg-primary" /> Current
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-2.5">
                    <span className="size-2.5 rounded-full bg-emerald-500" /> Answered
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {choiceQuestions.map(({ question, index, answered }) => (
                    <button
                      key={question.id}
                      type="button"
                      aria-label={`Go to question ${index + 1}`}
                      onClick={() => goToQuestion(index)}
                      className={`flex aspect-square items-center justify-center rounded-xl text-xs font-bold transition ${index === current ? 'bg-primary text-primary-foreground shadow-sm' : answered ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border bg-background text-muted-foreground hover:bg-muted'}`}
                    >
                      {answered && index !== current ? <Check className="size-3.5" /> : index + 1}
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4 text-xs leading-5 text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    Your progress is saved automatically. You can move between questions without losing answers.
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <Button variant="outline" size="icon" className="size-11 shrink-0 rounded-xl" onClick={() => goToQuestion(current - 1)} disabled={current === 0 || busy} aria-label="Previous question">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
              <span>Q{current + 1} of {questions.length}</span>
              <span className={currentAnswered ? 'text-emerald-600' : 'text-muted-foreground'}>{currentAnswered ? 'Answered' : 'Not answered'}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>
          {current < questions.length - 1 ? (
            <Button size="icon" className="size-11 shrink-0 rounded-xl" onClick={() => goToQuestion(current + 1)} disabled={busy} aria-label="Next question">
              <Menu className="size-4" />
            </Button>
          ) : (
            <Button className="h-11 shrink-0 rounded-xl px-4" onClick={() => void submit()} disabled={busy}>Submit</Button>
          )}
        </div>
      </div>
    </div>
  );
}
