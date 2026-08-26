'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Clock3, FileText, Loader2, Lock, ShieldCheck } from 'lucide-react';

type Test = {
  id: string;
  class_code: string;
  title: string;
  description: string | null;
  published: boolean;
  due_date?: string | null;
  test_password?: string | null;
  time_limit_minutes?: number | null;
  max_attempts?: number | null;
  allow_review?: boolean | null;
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
  correct_answer?: string | null;
  points?: number | null;
  answer_data?: Record<string, unknown> | null;
};

type Pair = { left: string; right: string };
type QuestionType = 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';

type Submission = {
  id: string;
  test_id: string;
  student_id: string;
  answers: Record<string, string> | null;
  score: number;
};

type Attempt = {
  id: string;
  test_id: string;
  student_id: string;
  status?: string | null;
  answers?: Record<string, string> | null;
  started_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

function getStudentId() {
  try {
    const user = JSON.parse(localStorage.getItem('current_user') || '{}');
    return String(user.student_id ?? user.id ?? user.user_id ?? user.uid ?? '').trim() || null;
  } catch {
    return null;
  }
}

function typeOf(q: Question): QuestionType {
  const value = String(q.question_type ?? 'multiple-choice')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');

  if (['true-false', 'truefalse', 'boolean'].includes(value)) return 'true-false';
  if (['fill-blank', 'fill-in-blank', 'fill-in-the-blank', 'fillintheblank', 'fill-blank-question', 'fill_in_blank'].includes(value)) return 'fill-blank';
  if (['matching', 'match'].includes(value)) return 'matching';
  return 'multiple-choice';
}

function pairsOf(q: Question): Pair[] {
  try {
    const parsed = JSON.parse(String(q.option_a ?? '[]'));
    if (Array.isArray(parsed)) {
      return parsed
        .map((item: any) => ({ left: String(item?.left ?? ''), right: String(item?.right ?? '') }))
        .filter((item: Pair) => item.left && item.right);
    }
  } catch {
    // Fall back to legacy matching format below.
  }

  return q.option_a && q.option_b
    ? [{ left: String(q.option_a), right: String(q.option_b) }]
    : [];
}

function normalize(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeTrueFalse(value: unknown) {
  const normalized = normalize(value);
  if (normalized === 'a' || normalized === 'true') return 'A';
  if (normalized === 'b' || normalized === 'false') return 'B';
  return normalized;
}

function descriptionWithoutPassword(value: string | null) {
  return (value || '').replace(/^\[\[EQ_PASSWORD:[^\]]+\]\]\s*/, '');
}

function imageOf(q: Question) {
  const data = q.answer_data;
  return data && typeof data === 'object' && typeof data.image_url === 'string' ? data.image_url : '';
}

function fillAnswer(q: Question) {
  const option = String(q.option_a ?? '').trim();
  const correct = String(q.correct_answer ?? '').trim();
  return option || correct;
}

function acceptedFillAnswers(q: Question) {
  const raw = fillAnswer(q);
  return raw
    .split(/\s*(?:\|\||;|,)\s*/)
    .map(normalize)
    .filter(Boolean);
}

export default function TakeTestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(params?.id || '');
  const reviewLatest = searchParams.get('review') === 'latest';

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [error, setError] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviewing, setReviewing] = useState<Submission | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const answersRef = useRef<Record<string, string>>({});
  const attemptRef = useRef<Attempt | null>(null);
  const savingRef = useRef(false);

  const maxAttempts = Math.max(1, Number(test?.max_attempts) || 1);
  const attemptsUsed = submissions.length;
  const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);
  const activeAnswers = reviewing?.answers || answers;

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  async function createAttempt(sid: string, initialAnswers: Record<string, string> = {}) {
    const now = new Date().toISOString();
    const response = await fetch(`${url}/rest/v1/test_attempts`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        test_id: id,
        student_id: sid,
        status: 'in_progress',
        answers: initialAnswers,
        started_at: now,
        updated_at: now,
      }),
    });

    if (!response.ok) throw new Error(`Could not start test attempt: ${await response.text()}`);
    const data = await response.json();
    const created = (Array.isArray(data) ? data[0] : data) as Attempt;
    attemptRef.current = created;
    setAttempt(created);
    return created;
  }

  async function findActiveAttempt(sid: string) {
    const response = await fetch(
      `${url}/rest/v1/test_attempts?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(sid)}&status=eq.in_progress&select=*&order=started_at.desc&limit=1`,
      { headers, cache: 'no-store' },
    );

    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || !data[0]) return null;

    const found = data[0] as Attempt;
    attemptRef.current = found;
    setAttempt(found);

    if (found.answers) {
      answersRef.current = found.answers;
      setAnswers(found.answers);
    }

    if (found.started_at) setStartedAt(new Date(found.started_at).getTime());
    return found;
  }

  async function saveAttempt(nextAnswers = answersRef.current) {
    const current = attemptRef.current;
    if (!current?.id || savingRef.current) return;

    savingRef.current = true;
    try {
      const response = await fetch(`${url}/rest/v1/test_attempts?id=eq.${encodeURIComponent(current.id)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          answers: nextAnswers,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) console.error('Failed to save attempt:', await response.text());
    } finally {
      savingRef.current = false;
    }
  }

  async function completeAttempt(finalAnswers: Record<string, string>) {
    const current = attemptRef.current;
    if (!current?.id) return;

    const now = new Date().toISOString();
    const response = await fetch(`${url}/rest/v1/test_attempts?id=eq.${encodeURIComponent(current.id)}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({
        answers: finalAnswers,
        status: 'completed',
        updated_at: now,
        completed_at: now,
      }),
    });

    if (!response.ok) console.error('Failed to complete attempt:', await response.text());
    attemptRef.current = null;
    setAttempt(null);
  }

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const sid = getStudentId();
        if (!sid) throw new Error('Student UUID not found. Please sign in again.');
        setStudentId(sid);

        const testResponse = await fetch(
          `${url}/rest/v1/tests?id=eq.${encodeURIComponent(id)}&published=eq.true&select=*`,
          { headers, cache: 'no-store' },
        );
        const testData = await testResponse.json();
        if (!testResponse.ok || !testData[0]) throw new Error('Test not found or not published.');

        const loadedTest = testData[0] as Test;
        setTest(loadedTest);

        const requiredPassword = String(loadedTest.test_password || '').trim();
        setPassword(requiredPassword);
        setUnlocked(!requiredPassword);

        const questionResponse = await fetch(
          `${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(id)}&select=*&order=question_order.asc,id.asc`,
          { headers, cache: 'no-store' },
        );
        if (!questionResponse.ok) throw new Error(await questionResponse.text());
        setQuestions(await questionResponse.json());

        const submissionResponse = await fetch(
          `${url}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(sid)}&select=*`,
          { headers, cache: 'no-store' },
        );
        const submissionData = submissionResponse.ok ? await submissionResponse.json() : [];
        const rows: Submission[] = Array.isArray(submissionData) ? submissionData : [];
        setSubmissions(rows);

        if (reviewLatest && loadedTest.allow_review !== false && rows[0]) {
          setReviewing(rows[0]);
          return;
        }

        if (rows.length >= Math.max(1, Number(loadedTest.max_attempts) || 1)) return;

        const active = await findActiveAttempt(sid);
        if (active) {
          setUnlocked(true);
          const start = active.started_at ? new Date(active.started_at).getTime() : Date.now();
          setStartedAt(start);
          if (loadedTest.time_limit_minutes) {
            const limit = Number(loadedTest.time_limit_minutes) * 60;
            const elapsed = Math.floor((Date.now() - start) / 1000);
            setTimeRemaining(Math.max(0, limit - elapsed));
          }
        } else if (!requiredPassword) {
          setUnlocked(true);
          const created = await createAttempt(sid);
          const start = created.started_at ? new Date(created.started_at).getTime() : Date.now();
          setStartedAt(start);
          setTimeRemaining(loadedTest.time_limit_minutes ? Number(loadedTest.time_limit_minutes) * 60 : null);
        }
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to load test.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, reviewLatest]);

  useEffect(() => {
    if (loading || reviewing || !startedAt || !attemptRef.current || submitting || attemptsLeft <= 0) return;
    const timer = window.setInterval(() => void saveAttempt(), 5000);
    return () => window.clearInterval(timer);
  }, [loading, reviewing, startedAt, submitting, attemptsLeft]);

  useEffect(() => {
    if (!startedAt || !attemptRef.current || reviewing || attemptsLeft <= 0) return;
    const save = () => void saveAttempt(answersRef.current);
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, [startedAt, reviewing, attemptsLeft]);

  useEffect(() => {
    if (!startedAt || !test?.time_limit_minutes || reviewing || attemptsLeft <= 0 || submitting) return;

    const update = () => {
      const remaining = Math.max(
        0,
        Math.ceil((startedAt + Number(test.time_limit_minutes) * 60000 - Date.now()) / 1000),
      );
      setTimeRemaining(remaining);
      if (remaining <= 0 && !submitting) void submitTest(true);
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, test?.time_limit_minutes, reviewing, attemptsLeft, submitting]);

  const matchingOptions = useMemo(() => {
    const all = new Set<string>();
    questions.filter(q => typeOf(q) === 'matching').forEach(q => pairsOf(q).forEach(pair => all.add(pair.right)));
    return Array.from(all);
  }, [questions]);

  function isAnswered(q: Question, source = answers) {
    if (typeOf(q) === 'matching') {
      try {
        const value = JSON.parse(source[q.id] || '{}');
        const pairs = pairsOf(q);
        return pairs.length > 0 && pairs.every(pair => Boolean(value[pair.left]));
      } catch {
        return false;
      }
    }
    return Boolean(String(source[q.id] ?? '').trim());
  }

  function isCorrect(q: Question, source = activeAnswers) {
    const answer = source[q.id] || '';
    const type = typeOf(q);

    if (type === 'fill-blank') {
      const accepted = acceptedFillAnswers(q);
      return accepted.length > 0 && accepted.includes(normalize(answer));
    }

    if (type === 'matching') {
      try {
        const selected = JSON.parse(answer || '{}');
        return pairsOf(q).every(pair => normalize(selected[pair.left]) === normalize(pair.right));
      } catch {
        return false;
      }
    }

    if (type === 'true-false') return normalizeTrueFalse(answer) === normalizeTrueFalse(q.correct_answer);
    return normalize(answer) === normalize(q.correct_answer);
  }

  function setAnswer(questionId: string, value: string) {
    const next = { ...answersRef.current, [questionId]: value };
    answersRef.current = next;
    setAnswers(next);
    void saveAttempt(next);
  }

  async function startAttempt() {
    if (!studentId || attemptsLeft <= 0) return;

    try {
      setError('');
      setReviewing(null);
      const existing = await findActiveAttempt(studentId);
      const current = existing || await createAttempt(studentId);
      const start = current.started_at ? new Date(current.started_at).getTime() : Date.now();
      setStartedAt(start);
      setUnlocked(true);
      setTimeRemaining(
        test?.time_limit_minutes
          ? Math.max(0, Number(test.time_limit_minutes) * 60 - Math.floor((Date.now() - start) / 1000))
          : null,
      );
    } catch (e) {
      console.error(e);
      setUnlocked(false);
      setError(e instanceof Error ? e.message : 'Could not start the test.');
    }
  }

  function enterPassword() {
    if (enteredPassword === password) void startAttempt();
    else setError('Incorrect test password.');
  }

  async function submitTest(automatic = false) {
    if (!test || !studentId || submitting || reviewing || attemptsLeft <= 0) return;
    if (!questions.length) {
      setError('This test has no questions.');
      return;
    }

    if (!automatic && questions.some(q => !isAnswered(q))) {
      setError('Please answer every question before submitting.');
      return;
    }

    if (!automatic && !confirmSubmit) {
      setConfirmSubmit(true);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const finalAnswers = { ...answersRef.current, ...answers };
      const total = questions.reduce((sum, q) => sum + Math.max(0, Number(q.points) || 0), 0);
      const earned = questions.reduce(
        (sum, q) => sum + (isCorrect(q, finalAnswers) ? Math.max(0, Number(q.points) || 0) : 0),
        0,
      );
      const score = total > 0 ? Math.min(100, Math.round((earned / total) * 10000) / 100) : 0;

      await saveAttempt(finalAnswers);

      const response = await fetch(`${url}/rest/v1/test_submissions`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ test_id: id, student_id: studentId, answers: finalAnswers, score }),
      });

      if (!response.ok) throw new Error(await response.text());

      const data = await response.json();
      const created = (Array.isArray(data) ? data[0] : data) as Submission;
      await completeAttempt(finalAnswers);

      setSubmissions(previous => [{ ...created, answers: finalAnswers, score }, ...previous]);
      setConfirmSubmit(false);
      setStartedAt(null);
      setTimeRemaining(null);
      setAnswers({});
      answersRef.current = {};
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to submit test.');
    } finally {
      setSubmitting(false);
    }
  }

  const latestSubmission = submissions[0] || null;
  const time = timeRemaining === null ? null : `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')}`;
  const answeredCount = questions.filter(q => isAnswered(q)).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="size-8 animate-spin text-slate-700" /></div>;
  }

  if (!test) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md"><CardContent className="p-8 text-center">
          <p className="text-destructive">{error || 'Unable to load assessment.'}</p>
          <Button className="mt-5" onClick={() => router.push('/dashboard/student')}>Back to Dashboard</Button>
        </CardContent></Card>
      </main>
    );
  }

  if (!unlocked && attemptsLeft > 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md border-slate-300 shadow-sm">
          <CardHeader className="border-b bg-white text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full border bg-slate-50"><Lock className="size-5 text-slate-700" /></div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Assessment Access</p>
            <CardTitle className="text-2xl">{test.title}</CardTitle>
            <p className="text-sm text-slate-500">Enter the assessment password to begin.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div><label className="text-sm font-medium">Password</label><Input className="mt-2 h-11" type="password" value={enteredPassword} onChange={e => setEnteredPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') enterPassword(); }} /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">Attempt {attemptsUsed + 1} of {maxAttempts}</div>
            <Button className="h-11 w-full" onClick={enterPassword}>Begin Assessment</Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/dashboard/student')}>Cancel</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (reviewing) {
    return (
      <main className="min-h-screen bg-slate-50 py-8">
        <div className="mx-auto max-w-4xl px-5">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Assessment Review</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{test.title}</h1><p className="mt-1 text-slate-600">Final score: <strong>{Number(reviewing.score).toFixed(2)}/100</strong></p></div>
            <Button variant="outline" onClick={() => setReviewing(null)}>Back</Button>
          </div>
          <div className="space-y-4">
            {questions.map((q, index) => {
              const correctAnswer = isCorrect(q, reviewing.answers || {});
              const selected = (reviewing.answers || {})[q.id] || '';
              const type = typeOf(q);
              return (
                <Card key={q.id} className={`border ${correctAnswer ? 'border-emerald-300' : 'border-rose-300'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between gap-4"><CardTitle className="text-base">Question {index + 1}</CardTitle><span className={`text-sm font-semibold ${correctAnswer ? 'text-emerald-700' : 'text-rose-700'}`}>{correctAnswer ? 'Correct' : 'Incorrect'}</span></div>
                    <p className="leading-7 text-slate-800">{q.question}</p>
                    {imageOf(q) && <img src={imageOf(q)} alt="Question" className="mt-3 max-h-72 rounded-lg border object-contain" />}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {type === 'multiple-choice' && <div className="grid gap-2 sm:grid-cols-2">{(['A', 'B', 'C', 'D'] as const).map(letter => { const text = q[`option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d'] || ''; const chosen = selected === letter; const right = normalize(q.correct_answer) === letter.toLowerCase(); return <div key={letter} className={`rounded-lg border p-3 ${right ? 'border-emerald-400 bg-emerald-50' : chosen ? 'border-rose-400 bg-rose-50' : 'bg-white'}`}><strong>{letter}.</strong> {text}</div>; })}</div>}
                    {type === 'true-false' && <div className="grid grid-cols-2 gap-3">{['True', 'False'].map(value => { const letter = value === 'True' ? 'A' : 'B'; const chosen = normalizeTrueFalse(selected) === letter; const right = normalizeTrueFalse(q.correct_answer) === letter; return <div key={value} className={`rounded-lg border p-4 text-center font-semibold ${right ? 'border-emerald-400 bg-emerald-50' : chosen ? 'border-rose-400 bg-rose-50' : 'bg-white'}`}>{value}</div>; })}</div>}
                    {type === 'fill-blank' && <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your answer</p><p className="mt-1 rounded-lg border bg-white p-3">{selected || 'No answer'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accepted answer</p><p className="mt-1 rounded-lg border border-emerald-300 bg-emerald-50 p-3">{fillAnswer(q)}</p></div></div>}
                    {type === 'matching' && <div className="space-y-2">{pairsOf(q).map(pair => { let selectedRight = ''; try { selectedRight = JSON.parse(selected || '{}')[pair.left] || ''; } catch {} const pairCorrect = normalize(selectedRight) === normalize(pair.right); return <div key={pair.left} className={`grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_auto_1fr] ${pairCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}><span>{pair.left}</span><span>↔</span><span>{selectedRight || 'No match'}{!pairCorrect && ` (correct: ${pair.right})`}</span></div>; })}</div>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  if (!startedAt || attemptsLeft <= 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-xl border-slate-300 shadow-sm"><CardContent className="p-10 text-center">
          <CheckCircle2 className="mx-auto mb-4 size-12 text-slate-700" />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Assessment Complete</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Test Submitted</h2>
          <p className="mt-2 text-slate-600">Your latest recorded score</p>
          <p className="mt-1 text-5xl font-bold text-slate-900">{Number(latestSubmission?.score || 0).toFixed(2)}<span className="text-xl text-slate-500">/100</span></p>
          <p className="mt-3 text-sm text-slate-500">Attempts used: {attemptsUsed}/{maxAttempts}</p>
          <div className="mt-6 flex justify-center gap-2">
            {test.allow_review === false ? <Button variant="outline" disabled>Review Not Permitted</Button> : latestSubmission && <Button onClick={() => setReviewing(latestSubmission)}>Review Test</Button>}
            <Button variant="outline" onClick={() => router.push('/dashboard/student')}>Dashboard</Button>
          </div>
        </CardContent></Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500"><FileText className="size-4" /> Formal Assessment</div><h1 className="mt-1 truncate text-xl font-bold text-slate-900 sm:text-2xl">{test.title}</h1><p className="mt-1 text-sm text-slate-500">Attempt {attemptsUsed + 1} of {maxAttempts}</p></div>
            <div className="flex shrink-0 items-center gap-2">{time && <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${timeRemaining !== null && timeRemaining <= 60 ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-300 bg-slate-50 text-slate-700'}`}><Clock3 className="size-4" />{time}</div>}<Button variant="outline" onClick={() => router.push('/dashboard/student')}>Exit</Button></div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-slate-700 transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="mt-2 flex justify-between text-xs text-slate-500"><span>{answeredCount} of {questions.length} answered</span><span>{progress}% complete</span></div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 pt-6">
        <Card className="mb-5 border-slate-300 shadow-sm"><CardContent className="p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-slate-600" /><div><p className="font-semibold text-slate-800">Assessment instructions</p><p className="mt-1 text-sm leading-6 text-slate-600">{descriptionWithoutPassword(test.description) || 'Answer all questions carefully. Your responses are saved while you work. Submit only when you are ready.'}</p></div></div></CardContent></Card>

        {error && <div className="mb-5 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="space-y-5">
          {questions.map((q, index) => {
            const type = typeOf(q);
            const answer = answers[q.id] || '';
            return (
              <Card key={q.id} className="border-slate-300 shadow-sm">
                <CardHeader className="border-b bg-white pb-4">
                  <div className="flex items-start justify-between gap-4"><CardTitle className="text-base leading-6 text-slate-900">Question {index + 1}</CardTitle><span className="shrink-0 rounded-full border bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">{Number(q.points) || 0} pts</span></div>
                  <p className="text-base leading-7 text-slate-800">{q.question}</p>
                  {imageOf(q) && <img src={imageOf(q)} alt="Question" className="mt-2 max-h-80 max-w-full rounded-lg border object-contain" />}
                </CardHeader>
                <CardContent className="p-5">
                  {type === 'multiple-choice' && <div className="grid gap-3 md:grid-cols-2">{(['A', 'B', 'C', 'D'] as const).map(letter => { const text = q[`option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d'] || ''; const selected = answer === letter; return <button key={letter} type="button" onClick={() => setAnswer(q.id, letter)} className={`flex min-h-14 items-center gap-3 rounded-lg border-2 px-4 text-left transition ${selected ? 'border-slate-700 bg-slate-100' : 'border-slate-200 bg-white hover:border-slate-400'}`}><span className="flex size-8 shrink-0 items-center justify-center rounded-full border font-semibold">{letter}</span><span>{text}</span></button>; })}</div>}

                  {type === 'true-false' && <div className="grid grid-cols-2 gap-3">{(['A', 'B'] as const).map(letter => { const value = letter === 'A' ? 'True' : 'False'; const selected = normalizeTrueFalse(answer) === letter; return <button key={letter} type="button" onClick={() => setAnswer(q.id, letter)} className={`min-h-16 rounded-lg border-2 text-base font-semibold transition ${selected ? 'border-slate-700 bg-slate-100' : 'border-slate-200 bg-white hover:border-slate-400'}`}>{value}</button>; })}</div>}

                  {type === 'fill-blank' && <div><label className="text-sm font-medium text-slate-700">Your answer</label><Input className="mt-2 h-12" value={answer} onChange={e => { const next = { ...answersRef.current, [q.id]: e.target.value }; answersRef.current = next; setAnswers(next); }} onBlur={() => void saveAttempt(answersRef.current)} placeholder="Enter your answer" /></div>}

                  {type === 'matching' && <div className="space-y-3">{pairsOf(q).map(pair => { let selected = ''; try { selected = JSON.parse(answer || '{}')[pair.left] || ''; } catch {} return <div key={pair.left} className="grid items-center gap-3 rounded-lg border bg-slate-50 p-3 md:grid-cols-[1fr_1fr]"><div className="font-medium text-slate-800">{pair.left}</div><select className="h-11 rounded-md border bg-white px-3" value={selected} onChange={e => { let current: Record<string, string> = {}; try { current = JSON.parse(answer || '{}'); } catch {} setAnswer(q.id, JSON.stringify({ ...current, [pair.left]: e.target.value })); }}><option value="">Select match</option>{matchingOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></div>; })}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {confirmSubmit && <Card className="mt-6 border-slate-400"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-semibold text-slate-900">Ready to submit?</p><p className="text-sm text-slate-500">You have answered {answeredCount} of {questions.length} questions.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setConfirmSubmit(false)}>Continue Assessment</Button><Button onClick={() => void submitTest(false)} disabled={submitting}>{submitting ? 'Submitting...' : 'Confirm Submit'}</Button></div></CardContent></Card>}

        <div className="mt-6 flex justify-end"><Button className="min-w-40" onClick={() => void submitTest(false)} disabled={submitting}>{submitting ? <><Loader2 className="mr-2 size-4 animate-spin" />Submitting...</> : 'Submit Assessment'}</Button></div>
      </div>
    </main>
  );
}
