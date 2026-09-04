'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, CheckCircle2, Clock3, FileText, Loader2, Lock, Menu, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/Navbar';

type Test = { id: string; title: string; description?: string | null; class_code?: string; time_limit_minutes?: number | null; max_attempts?: number | null; allow_review?: boolean | null; requires_password?: boolean };
type Question = { id: string; question_order: number; question: string; question_type?: string | null; option_a?: string | null; option_b?: string | null; option_c?: string | null; option_d?: string | null; points?: number | null };
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
  return { Authorization: `Bearer ${getToken()}`, Accept: 'application/json', ...(json ? { 'Content-Type': 'application/json' } : {}) };
}

function typeOf(q: Question) { return String(q.question_type || 'multiple_choice').toLowerCase().replace(/-/g, '_'); }
function pairs(q: Question): Pair[] { try { const x = JSON.parse(String(q.option_a || '[]')); return Array.isArray(x) ? x.map((p: any) => ({ left: String(p?.left || ''), right: String(p?.right || '') })).filter((p: Pair) => p.left && p.right) : []; } catch { return []; } }
function matchingMap(value: string): Record<string, string> { try { const x = JSON.parse(value || '{}'); return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; } catch { return {}; } }
function isAnswered(q: Question, answers: Record<string, string>) { const value = answers[q.id] || ''; if (typeOf(q) === 'matching') return pairs(q).every(p => Boolean(matchingMap(value)[p.left])); return Boolean(value.trim()); }

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

  useEffect(() => { answersRef.current = answers; }, [answers]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(endpoint(id), { headers: requestHeaders(), cache: 'no-store' });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || 'Failed to load test.');
      setTest(data.test); setQuestions(data.questions || []); setSubmissions(data.submissions || []); setAttempt(data.attempt || null);
      const restored = data.attempt?.answers || {};
      setAnswers(restored); answersRef.current = restored;
      setUnlocked(!data.test?.requires_password && Boolean(data.attempt));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load test.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (id) void load(); }, [id, load]);

  const maxAttempts = Math.max(1, Number(test?.max_attempts) || 1);
  const attemptsLeft = Math.max(0, maxAttempts - submissions.length);
  const answeredCount = questions.filter(q => isAnswered(q, answers)).length;
  const progress = questions.length ? Math.round(answeredCount / questions.length * 100) : 0;
  const matchingOptions = useMemo(() => Array.from(new Set(questions.flatMap(q => typeOf(q) === 'matching' ? pairs(q).map(p => p.right) : []))), [questions]);

  const save = useCallback(async (next = answersRef.current) => {
    if (!attempt?.id || savingRef.current || complete) return;
    savingRef.current = true; setSaved(false);
    try {
      const r = await fetch(endpoint(id), { method: 'POST', headers: requestHeaders(true), body: JSON.stringify({ action: 'save', answers: next }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || 'Save failed.');
      setSaved(true); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Your latest answer could not be saved.'); }
    finally { savingRef.current = false; }
  }, [attempt?.id, complete, id]);

  useEffect(() => {
    if (!attempt?.id || complete) return;
    const timer = window.setInterval(() => void save(), 5000);
    const onHide = () => { void save(); };
    window.addEventListener('pagehide', onHide);
    return () => { window.clearInterval(timer); window.removeEventListener('pagehide', onHide); };
  }, [attempt?.id, complete, save]);

  useEffect(() => {
    if (!attempt?.started_at || !test?.time_limit_minutes || complete) return;
    const deadline = new Date(attempt.started_at).getTime() + Number(test.time_limit_minutes) * 60000;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick(); const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [attempt?.started_at, test?.time_limit_minutes, complete]);

  const access = async () => {
    setBusy(true); setError('');
    try {
      const r = await fetch(endpoint(id), { method: 'POST', headers: requestHeaders(true), body: JSON.stringify({ action: 'access', password: enteredPassword }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || 'Could not start test.');
      setTest(data.test); setQuestions(data.questions || []); setSubmissions(data.submissions || []); setAttempt(data.attempt || null);
      const restored = data.attempt?.answers || {};
      setAnswers(restored); answersRef.current = restored; setUnlocked(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start test.'); }
    finally { setBusy(false); }
  };

  const setAnswer = (qid: string, value: string) => {
    const next = { ...answersRef.current, [qid]: value };
    answersRef.current = next; setAnswers(next); void save(next);
  };

  const submit = async () => {
    if (!attempt?.id || submittingRef.current) return;
    if (questions.some(q => !isAnswered(q, answersRef.current))) { setError('Please answer every question before submitting.'); return; }
    if (!confirm) { setConfirm(true); return; }
    submittingRef.current = true; setBusy(true); setError('');
    try {
      const r = await fetch(endpoint(id), { method: 'POST', headers: requestHeaders(true), body: JSON.stringify({ action: 'submit', answers: answersRef.current }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || 'Failed to submit test.');
      setSubmissions(s => [data.submission, ...s]); setComplete(true); setAttempt(null); setRemaining(null); setAnswers({}); answersRef.current = {}; setConfirm(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to submit test.'); }
    finally { submittingRef.current = false; setBusy(false); }
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar/><div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="size-8 animate-spin"/></div></div>;
  if (!test) return <div className="min-h-screen bg-background"><Navbar/><main className="mx-auto max-w-xl px-6 py-12"><Card><CardContent className="space-y-4 p-8 text-center"><p className="text-destructive">{error || 'Unable to load test.'}</p><Button onClick={() => router.back()}>Go back</Button></CardContent></Card></main></div>;

  if (!unlocked && attemptsLeft > 0) return <div className="min-h-screen bg-background"><Navbar/><main className="mx-auto flex min-h-[75vh] max-w-lg items-center px-6 py-12"><Card className="w-full overflow-hidden rounded-3xl"><CardHeader className="bg-primary/[0.06] p-8"><div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Lock className="size-6"/></div><CardTitle className="mt-4 text-3xl">{test.title}</CardTitle><p className="text-sm text-muted-foreground">{test.description || 'Assessment'}</p></CardHeader><CardContent className="space-y-5 p-8">{error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}{test.requires_password && <Input autoFocus type="password" autoComplete="off" placeholder="Assessment password" value={enteredPassword} onChange={e => setEnteredPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void access(); }}/>}<Button className="w-full" onClick={() => void access()} disabled={busy}>{busy ? <Loader2 className="mr-2 size-4 animate-spin"/> : <Lock className="mr-2 size-4"/>}{busy ? 'Opening…' : 'Start assessment'}</Button><Button variant="ghost" className="w-full" onClick={() => router.back()}>Back</Button></CardContent></Card></main></div>;

  if (complete || attemptsLeft <= 0) return <div className="min-h-screen bg-background"><Navbar/><main className="mx-auto max-w-xl px-6 py-12"><Card className="rounded-3xl"><CardContent className="space-y-5 p-10 text-center"><CheckCircle2 className="mx-auto size-14 text-primary"/><h1 className="text-3xl font-black">Test submitted</h1><p className="text-muted-foreground">Latest score</p><p className="text-5xl font-black">{Number(submissions[0]?.score || 0).toFixed(2)}%</p><p className="text-sm text-muted-foreground">Attempts used: {submissions.length}/{maxAttempts}</p>{test.allow_review !== false && <Button variant="outline" onClick={() => router.push(`/dashboard/student/tests/${encodeURIComponent(id)}/review`)}>Review attempt</Button>}<Button onClick={() => router.back()}>Back</Button></CardContent></Card></main></div>;

  const q = questions[current];
  if (!q) return <div className="min-h-screen bg-background"><Navbar/><main className="mx-auto max-w-xl px-6 py-12"><Card><CardContent className="p-8 text-center">This test has no questions.</CardContent></Card></main></div>;
  const qType = typeOf(q); const answer = answers[q.id] || ''; const selected = matchingMap(answer); const time = remaining === null ? null : `${String(Math.floor(remaining / 60)).padStart(2,'0')}:${String(remaining % 60).padStart(2,'0')}`;

  return <div className="min-h-screen bg-background pb-24"><Navbar/><main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" onClick={() => router.back()} className="gap-2"><ArrowLeft className="size-4"/>Back</Button><div className="flex items-center gap-3 text-sm text-muted-foreground">{time && <span className="flex items-center gap-2 font-mono font-bold"><Clock3 className="size-4"/>{time}</span>}<span className="flex items-center gap-1">{saved ? <Save className="size-4"/> : <Loader2 className="size-4 animate-spin"/>}{saved ? 'Saved' : 'Saving…'}</span></div></div>
    {error && <Card className="border-destructive/30 bg-destructive/5"><CardContent className="flex items-center justify-between gap-3 py-3 text-sm text-destructive"><span>{error}</span><Button size="icon" variant="ghost" onClick={() => setError('')}><X className="size-4"/></Button></CardContent></Card>}
    <div><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">{test.title}</span><span className="text-muted-foreground">{answeredCount}/{questions.length} answered</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }}/></div></div>
    <Card className="overflow-hidden rounded-3xl"><CardHeader><div className="text-xs font-bold uppercase tracking-wider text-primary">Question {current + 1} of {questions.length}</div><CardTitle className="text-2xl leading-tight">{q.question}</CardTitle></CardHeader><CardContent className="space-y-4 pb-8">
      {qType === 'multiple_choice' && ['A','B','C','D'].map(letter => { const value = (q as any)[`option_${letter.toLowerCase()}`] || ''; if (!value) return null; const selectedAnswer = answer === letter; return <button key={letter} type="button" onClick={() => setAnswer(q.id, letter)} className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left ${selectedAnswer ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`}><span className="font-bold">{letter}</span><span className="flex-1">{value}</span>{selectedAnswer && <Check className="size-5 text-primary"/>}</button>; })}
      {qType === 'true_false' && [['A','True'],['B','False']].map(([letter,label]) => <button key={letter} onClick={() => setAnswer(q.id, letter)} className={`w-full rounded-2xl border-2 p-5 text-lg font-semibold ${answer === letter ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`}>{label}</button>)}
      {(qType === 'fill_blank' || qType === 'fill_in_blank') && <Input autoComplete="off" value={answer} onChange={e => setAnswer(q.id, e.target.value)} placeholder="Type your answer"/>}
      {qType === 'matching' && <div className="space-y-3">{pairs(q).map(pair => <div key={pair.left} className="grid gap-2 sm:grid-cols-2 sm:items-center"><div className="rounded-xl border p-3 font-medium">{pair.left}</div><select className="h-11 rounded-xl border bg-background px-3" value={selected[pair.left] || ''} onChange={e => setAnswer(q.id, JSON.stringify({ ...selected, [pair.left]: e.target.value }))}><option value="">Choose a match</option>{matchingOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></div>)}</div>}
    </CardContent></Card>
    {confirm && <Card className="border-amber-300 bg-amber-50"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-bold">Submit this assessment?</p><p className="text-sm text-muted-foreground">You answered {answeredCount} of {questions.length} questions.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setConfirm(false)}>Continue</Button><Button onClick={() => void submit()} disabled={busy}>{busy ? 'Submitting…' : 'Confirm submit'}</Button></div></CardContent></Card>}
    <div className="flex items-center justify-between gap-3"><Button variant="outline" onClick={() => setCurrent(v => Math.max(0, v - 1))} disabled={current === 0}>Previous</Button><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">{current + 1}/{questions.length}</span>{current < questions.length - 1 ? <Button onClick={() => setCurrent(v => v + 1)}>Next</Button> : <Button onClick={() => void submit()} disabled={busy}>Submit test</Button>}</div></div>
    <Card><CardContent className="p-4"><div className="mb-3 flex items-center gap-2 font-semibold"><Menu className="size-4"/>Question navigator</div><div className="flex flex-wrap gap-2">{questions.map((question,i) => <button key={question.id} onClick={() => setCurrent(i)} className={`flex size-9 items-center justify-center rounded-lg text-xs font-bold ${current === i ? 'bg-primary text-primary-foreground' : isAnswered(question, answers) ? 'bg-emerald-100 text-emerald-700' : 'bg-muted'}`}>{i+1}</button>)}</div></CardContent></Card>
  </main></div>;
}
