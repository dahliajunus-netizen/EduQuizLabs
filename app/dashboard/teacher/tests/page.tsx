'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Loader2, Eye, EyeOff, Image as ImageIcon, X, Check, Pencil } from 'lucide-react';

type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching';
type MatchPair = { left: string; right: string };
type Test = { id: string; class_code: string; title: string; description: string | null; published: boolean; created_at: string; due_date?: string | null; test_password?: string | null; time_limit_minutes?: number | null };
type Question = { id?: string; test_id: string; question_order: number; question: string; image_url?: string | null; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string; points?: number; question_type?: QuestionType };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const baseHeaders = { apikey: key || '', 'Content-Type': 'application/json' };
const typeLabels: Record<QuestionType, string> = { multiple_choice: 'Multiple Choice', true_false: 'True / False', fill_blank: 'Fill in the Blank', matching: 'Match' };

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const candidates = ['supabase.auth.token', 'supabase_access_token', 'access_token'];
    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (const name of candidates) {
        const value = storage.getItem(name);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'string') return parsed;
            if (parsed?.access_token) return parsed.access_token;
            if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
          } catch { return value; }
        }
      }
    }
    const currentUser = window.localStorage.getItem('current_user');
    if (currentUser) {
      try {
        const parsed = JSON.parse(currentUser);
        if (parsed?.access_token) return parsed.access_token;
        if (parsed?.session?.access_token) return parsed.session.access_token;
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return null;
}

function authHeaders() {
  const token = getAccessToken();
  return { ...baseHeaders, Authorization: `Bearer ${token || key || ''}` };
}

function typeOf(q: Question): QuestionType {
  const x = String(q.question_type || 'multiple_choice').toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
  if (x === 'true_false' || x === 'truefalse' || x === 'boolean') return 'true_false';
  if (x === 'fill_blank' || x === 'fill_in_blank' || x === 'fillintheblank') return 'fill_blank';
  if (x === 'matching' || x === 'match') return 'matching';
  return 'multiple_choice';
}

function formatDueDate(value?: string | null) {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function dateParts(value?: string | null) {
  if (!value) return { day: '', month: '', year: '' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { day: '', month: '', year: '' };
  return { day: String(d.getDate()).padStart(2, '0'), month: String(d.getMonth() + 1).padStart(2, '0'), year: String(d.getFullYear()) };
}

export default function TeacherTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [dueMonth, setDueMonth] = useState('');
  const [dueYear, setDueYear] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState<Question | null>(null);
  const [pairs, setPairs] = useState<MatchPair[]>([{ left: '', right: '' }, { left: '', right: '' }]);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      if (!url || !key) throw new Error('Supabase environment variables are missing.');
      const headers = authHeaders();
      const r = await fetch(`${url}/rest/v1/tests?select=*&order=created_at.desc`, { headers, cache: 'no-store' });
      if (!r.ok) throw new Error(await r.text());
      const data: Test[] = await r.json();
      setTests(data);
      const map: Record<string, Question[]> = {};
      await Promise.all(data.map(async t => {
        const x = await fetch(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(t.id)}&select=*&order=question_order.asc`, { headers: authHeaders(), cache: 'no-store' });
        if (!x.ok) throw new Error(await x.text());
        map[t.id] = await x.json();
      }));
      setQuestions(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tests.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function resetDetails() {
    setClassCode(''); setTitle(''); setDescription(''); setDueDay(''); setDueMonth(''); setDueYear(''); setTimeLimit(''); setEditingId(null);
  }

  function beginEdit(t: Test) {
    const parts = dateParts(t.due_date);
    setEditingId(t.id);
    setClassCode(t.class_code || '');
    setTitle(t.title || '');
    setDescription(t.description || '');
    setDueDay(parts.day); setDueMonth(parts.month); setDueYear(parts.year);
    setTimeLimit(t.time_limit_minutes ? String(t.time_limit_minutes) : '');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildDueDate() {
    if (!dueDay && !dueMonth && !dueYear) return null;
    if (!/^\d{1,2}$/.test(dueDay) || !/^\d{1,2}$/.test(dueMonth) || !/^\d{4}$/.test(dueYear)) throw new Error('Please enter the due date as DD/MM/YYYY.');
    const d = Number(dueDay), m = Number(dueMonth), y = Number(dueYear);
    const check = new Date(y, m - 1, d);
    if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) throw new Error('Please enter a valid due date.');
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T23:59:59.000Z`;
  }

  async function saveTestDetails() {
    if (!url || !key || !classCode.trim() || !title.trim()) return;
    setBusy(true); setError('');
    try {
      const token = getAccessToken();
      if (!token) throw new Error('Your teacher session has expired. Please sign in again.');
      const dueDate = buildDueDate();
      const payload = {
        class_code: classCode.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate,
        time_limit_minutes: timeLimit ? Math.max(1, Number(timeLimit)) : null,
      };
      let r: Response;
      if (editingId) {
        r = await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(editingId)}`, {
          method: 'PATCH',
          headers: { ...authHeaders(), Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(await r.text());
      } else {
        r = await fetch(`${url}/rest/v1/tests`, {
          method: 'POST',
          headers: { ...authHeaders(), Prefer: 'return=representation' },
          body: JSON.stringify({ ...payload, published: false }),
        });
        if (!r.ok) throw new Error(await r.text());
      }
      resetDetails();
      await load();
    } catch (e) {
      setError(`Failed to save test details: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally { setBusy(false); }
  }

  async function deleteTest(id: string) {
    if (!url || !confirm('Delete this test and all its questions/submissions?')) return;
    try {
      const r = await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      if (editingId === id) resetDetails();
      await load();
    } catch (e) { setError(`Failed to delete test: ${e instanceof Error ? e.message : 'Unknown error'}`); }
  }

  async function togglePublished(t: Test) {
    if (!url) return;
    try {
      const r = await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(t.id)}`, { method: 'PATCH', headers: { ...authHeaders(), Prefer: 'return=minimal' }, body: JSON.stringify({ published: !t.published }) });
      if (!r.ok) throw new Error(await r.text());
      setTests(p => p.map(x => x.id === t.id ? { ...x, published: !x.published } : x));
    } catch (e) { setError(`Failed to change publication status: ${e instanceof Error ? e.message : 'Unknown error'}`); }
  }

  function newQuestion(testId: string) {
    setError(''); setOpen(testId);
    setPairs([{ left: '', right: '' }, { left: '', right: '' }]);
    setQ({ test_id: testId, question_order: (questions[testId]?.length || 0) + 1, question: '', image_url: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', question_type: 'multiple_choice' });
  }

  function changeType(type: QuestionType) {
    setPairs([{ left: '', right: '' }, { left: '', right: '' }]);
    setQ(cur => {
      if (!cur) return cur;
      if (type === 'true_false') return { ...cur, question_type: type, option_a: 'True', option_b: 'False', option_c: '', option_d: '', correct_answer: 'A' };
      if (type === 'fill_blank') return { ...cur, question_type: type, option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '' };
      if (type === 'matching') return { ...cur, question_type: type, option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '' };
      return { ...cur, question_type: 'multiple_choice', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' };
    });
  }

  async function recalculatePoints(testId: string) {
    if (!url) throw new Error('Supabase URL is missing.');
    const headers = authHeaders();
    const r = await fetch(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(testId)}&select=id`, { headers, cache: 'no-store' });
    if (!r.ok) throw new Error(await r.text());
    const rows: { id: string }[] = await r.json();
    const points = rows.length ? 100 / rows.length : 0;
    for (const row of rows) {
      const x = await fetch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { ...authHeaders(), Prefer: 'return=minimal' }, body: JSON.stringify({ points }) });
      if (!x.ok) throw new Error(await x.text());
    }
  }

  async function saveQuestion() {
    if (!q) return;
    const draft = { ...q, question_type: typeOf(q) };
    const missing: string[] = [];
    if (!draft.question.trim()) missing.push('question');
    if (draft.question_type === 'true_false') {
      draft.option_a = 'True'; draft.option_b = 'False'; draft.option_c = ''; draft.option_d = '';
      draft.correct_answer = draft.correct_answer === 'B' ? 'B' : 'A';
    } else if (draft.question_type === 'fill_blank') {
      if (!draft.correct_answer.trim()) missing.push('correct answer');
      draft.option_a = draft.correct_answer.trim(); draft.option_b = ''; draft.option_c = ''; draft.option_d = '';
    } else if (draft.question_type === 'matching') {
      const clean = pairs.filter(p => p.left.trim() && p.right.trim()).map(p => ({ left: p.left.trim(), right: p.right.trim() }));
      if (clean.length < 2) missing.push('at least 2 matching pairs');
      draft.option_a = JSON.stringify(clean); draft.option_b = ''; draft.option_c = ''; draft.option_d = ''; draft.correct_answer = JSON.stringify(clean);
    } else {
      if (!draft.option_a.trim()) missing.push('A');
      if (!draft.option_b.trim()) missing.push('B');
      if (!draft.option_c.trim()) missing.push('C');
      if (!draft.option_d.trim()) missing.push('D');
      if (!['A', 'B', 'C', 'D'].includes(draft.correct_answer)) missing.push('correct answer');
    }
    if (missing.length) { setError(`Please fill in: ${missing.join(', ')}`); return; }
    if (!url || !key) { setError('Supabase is not configured.'); return; }
    setBusy(true); setError('');
    try {
      const token = getAccessToken();
      if (!token) throw new Error('Your teacher session has expired. Please sign in again.');
      const testId = draft.test_id;
      const order = (questions[testId]?.length || 0) + 1;
      const payload = { test_id: testId, question_order: order, question: draft.question.trim(), image_url: draft.image_url?.trim() || null, option_a: draft.option_a.trim(), option_b: draft.option_b.trim(), option_c: draft.option_c.trim(), option_d: draft.option_d.trim(), correct_answer: draft.correct_answer, points: 100 / order, question_type: draft.question_type };
      const r = await fetch(`${url}/rest/v1/test_questions`, { method: 'POST', headers: { ...authHeaders(), Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(await r.text());
      await recalculatePoints(testId);
      setQ(null); setOpen(null); await load();
    } catch (e) { setError(`Question could not be saved: ${e instanceof Error ? e.message : 'Unknown error'}`); }
    finally { setBusy(false); }
  }

  async function deleteQuestion(id: string, testId: string) {
    if (!url || !confirm('Delete this question?')) return;
    try {
      const r = await fetch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      await recalculatePoints(testId); await load();
    } catch (e) { setError(`Failed to delete question: ${e instanceof Error ? e.message : 'Unknown error'}`); }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto space-y-6 px-6 py-8">
        <Link href="/dashboard/teacher"><Button variant="ghost" className="gap-2"><ArrowLeft className="size-4" />Back to Dashboard</Button></Link>
        <div><h1 className="text-3xl font-bold">🧪 Tests</h1><p className="text-muted-foreground">Create tests with all four question types.</p></div>
        {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-wrap">{error}</div>}
        <Card><CardHeader><CardTitle>{editingId ? 'Edit Test Details' : 'Create Test'}</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" autoComplete="off">
          <Input name="test-class-code" autoComplete="off" value={classCode} onChange={e => setClassCode(e.target.value)} placeholder="Class code" className="uppercase" />
          <Input name="test-title" autoComplete="off" value={title} onChange={e => setTitle(e.target.value)} placeholder="Test title" />
          <Input name="test-description" autoComplete="off" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" />
          <div className="space-y-1.5"><label className="text-sm font-medium">Due date</label><div className="flex h-10 items-center rounded-md border border-input bg-background px-2"><input name="due-day" autoComplete="off" inputMode="numeric" aria-label="Due date day" placeholder="DD" maxLength={2} value={dueDay} onChange={e => setDueDay(e.target.value.replace(/\D/g, '').slice(0, 2))} className="w-10 bg-transparent text-center text-sm outline-none placeholder:text-muted-foreground" /><span className="text-muted-foreground">/</span><input name="due-month" autoComplete="off" inputMode="numeric" aria-label="Due date month" placeholder="MM" maxLength={2} value={dueMonth} onChange={e => setDueMonth(e.target.value.replace(/\D/g, '').slice(0, 2))} className="w-10 bg-transparent text-center text-sm outline-none placeholder:text-muted-foreground" /><span className="text-muted-foreground">/</span><input name="due-year" autoComplete="off" inputMode="numeric" aria-label="Due date year" placeholder="YYYY" maxLength={4} value={dueYear} onChange={e => setDueYear(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-16 bg-transparent text-center text-sm outline-none placeholder:text-muted-foreground" /></div><p className="text-xs text-muted-foreground">DD/MM/YYYY</p></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Time limit (minutes)</label><Input name="test-time-limit" autoComplete="off" type="number" min="1" step="1" inputMode="numeric" value={timeLimit} onChange={e => setTimeLimit(e.target.value.replace(/\D/g, ''))} placeholder="Optional" /></div>
          <div className="flex gap-2 lg:mt-6"><Button onClick={() => void saveTestDetails()} disabled={busy || !classCode.trim() || !title.trim()} className="flex-1">{busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="mr-2 size-4" />}Save Test Details</Button>{editingId && <Button variant="outline" onClick={resetDetails} disabled={busy}>Cancel</Button>}</div>
        </CardContent></Card>
        {loading ? <Loader2 className="mx-auto size-8 animate-spin" /> : tests.map(t => (
          <Card key={t.id}>
            <CardHeader className="overflow-hidden"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><CardTitle className="break-words whitespace-normal">{t.title}</CardTitle><p className="break-words whitespace-normal text-sm text-muted-foreground">Class: {t.class_code} · {questions[t.id]?.length || 0} questions</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-muted px-2.5 py-1 whitespace-nowrap">Due: {formatDueDate(t.due_date)}</span>{t.time_limit_minutes ? <span className="rounded-full bg-muted px-2.5 py-1 whitespace-nowrap">Time: {t.time_limit_minutes} min</span> : null}</div></div><div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto"><Button variant="outline" onClick={() => beginEdit(t)} className="shrink-0"><Pencil className="mr-2 size-4" />Edit Details</Button><Button variant="outline" onClick={() => void togglePublished(t)} className="shrink-0">{t.published ? <><EyeOff className="mr-2 size-4" />Unpublish</> : <><Eye className="mr-2 size-4" />Publish</>}</Button><Button variant="destructive" onClick={() => void deleteTest(t.id)} className="shrink-0"><Trash2 className="size-4" /></Button></div></div></CardHeader>
            <CardContent className="space-y-4">
              {t.description && <p className="min-w-0 break-words whitespace-normal [overflow-wrap:anywhere] text-sm text-muted-foreground">{t.description}</p>}
              <div className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><p className="font-medium">Questions</p><Button onClick={() => newQuestion(t.id)} disabled={busy} className="shrink-0"><Plus className="mr-2 size-4" />Add Question</Button></div>
                {(questions[t.id] || []).map((x, i) => <div key={x.id || `${t.id}-${i}`} className="mt-3 flex items-start justify-between gap-3 border-t pt-3"><div className="min-w-0 flex-1"><p className="font-medium break-words">{i + 1}. {x.question}</p><p className="text-xs text-muted-foreground">{typeLabels[typeOf(x)]} · {Number(x.points || 0).toFixed(2)} pts · Correct: {typeOf(x) === 'multiple_choice' ? x.correct_answer : typeOf(x) === 'true_false' ? (x.correct_answer === 'A' ? 'True' : 'False') : typeOf(x) === 'fill_blank' ? x.correct_answer : 'Configured'}</p>{x.image_url && <img src={x.image_url} alt="Question" className="mt-2 max-h-40 max-w-full rounded-lg border object-contain" />}</div><Button variant="ghost" size="sm" onClick={() => x.id && void deleteQuestion(x.id, t.id)} className="shrink-0"><Trash2 className="size-4" /></Button></div>)}
                {open === t.id && q && <div className="mt-4 space-y-5 rounded-xl border-2 border-primary/20 bg-background p-5 shadow-sm">
                  <div className="flex items-center justify-between"><div><p className="text-lg font-bold">Question Maker</p><p className="text-sm text-muted-foreground">Choose the type, write the answers, then select the correct answer.</p></div><Button variant="ghost" size="icon" type="button" onClick={() => { setQ(null); setOpen(null); }}><X className="size-4" /></Button></div>
                  <div><p className="mb-2 text-sm font-bold">Question Type</p><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{(['multiple_choice', 'true_false', 'fill_blank', 'matching'] as QuestionType[]).map(type => <Button key={type} type="button" variant={typeOf(q) === type ? 'default' : 'outline'} className="h-auto min-h-12 whitespace-normal" onClick={() => changeType(type)}>{typeLabels[type]}</Button>)}</div></div>
                  <div><label className="mb-2 block text-sm font-bold">Question</label><textarea value={q.question} onChange={e => setQ({ ...q, question: e.target.value })} placeholder="Write your question here..." className="min-h-28 w-full rounded-lg border bg-background p-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary" /></div>
                  <div className="rounded-xl border bg-muted/20 p-4"><div className="mb-2 flex items-center gap-2"><ImageIcon className="size-5 text-primary" /><p className="font-bold">Question Image</p><span className="text-xs text-muted-foreground">Optional</span></div><Input autoComplete="off" value={q.image_url || ''} onChange={e => setQ({ ...q, image_url: e.target.value })} placeholder="Paste an image URL (https://...)" />{q.image_url && <div className="mt-3 rounded-lg border bg-background p-2"><img src={q.image_url} alt="Question preview" className="max-h-64 max-w-full rounded object-contain" /><p className="mt-1 text-xs text-muted-foreground">Image preview</p></div>}</div>
                  {typeOf(q) === 'multiple_choice' && <div className="space-y-4"><div className="grid gap-3 md:grid-cols-2">{(['a', 'b', 'c', 'd'] as const).map(letter => <div key={letter}><label className="mb-1 block text-sm font-bold">Option {letter.toUpperCase()}</label><Input autoComplete="off" value={q[`option_${letter}`]} onChange={e => setQ({ ...q, [`option_${letter}`]: e.target.value })} placeholder={`Answer ${letter.toUpperCase()}`} /></div>)}</div><div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5"><div className="mb-4"><p className="text-base font-bold">Correct Answer</p><p className="text-sm text-muted-foreground">Choose the one option that will receive credit.</p></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{(['A', 'B', 'C', 'D'] as const).map(letter => { const selected = q.correct_answer === letter; return <button key={letter} type="button" aria-pressed={selected} onClick={() => setQ(cur => cur ? { ...cur, correct_answer: letter } : cur)} className={`flex min-h-14 items-center justify-center gap-2 rounded-lg border-2 px-4 font-semibold transition ${selected ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5'}`}><span className={`inline-flex size-7 items-center justify-center rounded-full border text-sm ${selected ? 'border-primary-foreground/50' : 'border-muted-foreground/40'}`}>{letter}</span><span>Option {letter}</span>{selected && <Check className="size-5" />}</button>; })}</div><div className="mt-4 rounded-lg bg-background px-3 py-2 text-sm">Selected correct answer: <span className="font-bold text-primary">Option {q.correct_answer || 'None'}</span></div></div></div>}
                  {typeOf(q) === 'true_false' && <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4"><p className="mb-3 text-sm font-bold">Correct Answer</p><div className="grid grid-cols-2 gap-3"><Button type="button" variant={q.correct_answer === 'A' ? 'default' : 'outline'} className="h-14" onClick={() => setQ({ ...q, correct_answer: 'A' })}>True {q.correct_answer === 'A' && <Check className="ml-2 size-4" />}</Button><Button type="button" variant={q.correct_answer === 'B' ? 'default' : 'outline'} className="h-14" onClick={() => setQ({ ...q, correct_answer: 'B' })}>False {q.correct_answer === 'B' && <Check className="ml-2 size-4" />}</Button></div></div>}
                  {typeOf(q) === 'fill_blank' && <div><label className="mb-1 block text-sm font-bold">Correct Answer</label><Input autoComplete="off" value={q.correct_answer} onChange={e => setQ({ ...q, correct_answer: e.target.value.toLowerCase() })} placeholder="What should the student type?" /><p className="mt-1 text-xs text-muted-foreground">This exact answer is used for automatic grading.</p></div>}
                  {typeOf(q) === 'matching' && <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-bold">Matching Pairs</p><Button type="button" variant="outline" size="sm" onClick={() => setPairs([...pairs, { left: '', right: '' }])}><Plus className="mr-1 size-4" />Add Pair</Button></div>{pairs.map((pair, i) => <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><Input autoComplete="off" value={pair.left} onChange={e => setPairs(p => p.map((x, j) => j === i ? { ...x, left: e.target.value } : x))} placeholder={`Left ${i + 1}`} /><Input autoComplete="off" value={pair.right} onChange={e => setPairs(p => p.map((x, j) => j === i ? { ...x, right: e.target.value } : x))} placeholder={`Match ${i + 1}`} /><Button type="button" variant="ghost" onClick={() => setPairs(p => p.filter((_, j) => j !== i))} disabled={pairs.length <= 2}><Trash2 className="size-4" /></Button></div>)}</div>}
                  <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => { setQ(null); setOpen(null); }}>Cancel</Button><Button type="button" onClick={() => void saveQuestion()} disabled={busy || !q.question.trim()}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}Save Question</Button></div>
                </div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
