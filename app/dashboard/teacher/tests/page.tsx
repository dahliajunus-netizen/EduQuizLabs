'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';

type QuestionType = 'multiple_choice' | 'true_false';
type Test = { id: string; class_code: string; title: string; description: string | null; published: boolean; created_at: string };
type Question = { id?: string; test_id: string; question_order: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: 'A' | 'B' | 'C' | 'D'; points?: number; question_type?: QuestionType };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const headers = { apikey: key || '', Authorization: `Bearer ${key || ''}`, 'Content-Type': 'application/json' };

export default function TeacherTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState<Question | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      if (!url || !key) throw new Error('Supabase environment variables are missing.');
      const r = await fetch(`${url}/rest/v1/tests?select=*&order=created_at.desc`, { headers, cache: 'no-store' });
      if (!r.ok) throw new Error(await r.text());
      const data: Test[] = await r.json();
      setTests(data);
      const map: Record<string, Question[]> = {};
      await Promise.all(data.map(async t => {
        const qr = await fetch(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(t.id)}&select=*&order=question_order.asc`, { headers, cache: 'no-store' });
        if (!qr.ok) throw new Error(await qr.text());
        map[t.id] = await qr.json();
      }));
      setQuestions(map);
    } catch (e) { console.error(e); setError(e instanceof Error ? e.message : 'Failed to load tests.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function createTest() {
    if (!url || !key || !classCode.trim() || !title.trim()) return;
    setBusy(true); setError('');
    try {
      const r = await fetch(`${url}/rest/v1/tests`, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ class_code: classCode.trim().toUpperCase(), title: title.trim(), description: description.trim() || null, published: false }) });
      if (!r.ok) throw new Error(await r.text());
      setClassCode(''); setTitle(''); setDescription(''); await load();
    } catch (e) { console.error(e); setError(`Failed to create test: ${e instanceof Error ? e.message : 'Unknown error'}`); }
    finally { setBusy(false); }
  }

  async function deleteTest(id: string) {
    if (!url || !confirm('Delete this test and all its questions/submissions?')) return;
    try { const r = await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers }); if (!r.ok) throw new Error(await r.text()); await load(); }
    catch (e) { setError(`Failed to delete test: ${e instanceof Error ? e.message : 'Unknown error'}`); }
  }

  async function togglePublished(t: Test) {
    if (!url) return;
    try { const r = await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(t.id)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ published: !t.published }) }); if (!r.ok) throw new Error(await r.text()); setTests(prev => prev.map(x => x.id === t.id ? { ...x, published: !x.published } : x)); }
    catch (e) { setError(`Failed to change publication status: ${e instanceof Error ? e.message : 'Unknown error'}`); }
  }

  function newQuestion(testId: string) {
    setError(''); setOpen(testId);
    setQ({ test_id: testId, question_order: (questions[testId]?.length || 0) + 1, question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', question_type: 'multiple_choice' });
  }

  function changeType(type: QuestionType) {
    if (!q) return;
    if (type === 'true_false') setQ({ ...q, question_type: type, option_a: 'True', option_b: 'False', option_c: '', option_d: '', correct_answer: 'A' });
    else setQ({ ...q, question_type: type, option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' });
  }

  async function recalculatePoints(testId: string) {
    if (!url) throw new Error('Supabase URL is missing.');
    const qr = await fetch(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(testId)}&select=id`, { headers, cache: 'no-store' });
    if (!qr.ok) throw new Error(await qr.text());
    const rows: { id: string }[] = await qr.json(); const points = rows.length ? 100 / rows.length : 0;
    for (const row of rows) { const r = await fetch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ points }) }); if (!r.ok) throw new Error(await r.text()); }
  }

  async function saveQuestion() {
    if (!q) return;
    const draft = q; const missing: string[] = [];
    if (!draft.question.trim()) missing.push('question');
    if (draft.question_type === 'true_false') { draft.option_a = 'True'; draft.option_b = 'False'; draft.option_c = ''; draft.option_d = ''; }
    else { if (!draft.option_a.trim()) missing.push('A'); if (!draft.option_b.trim()) missing.push('B'); if (!draft.option_c.trim()) missing.push('C'); if (!draft.option_d.trim()) missing.push('D'); }
    if (missing.length) { setError(`Please fill in: ${missing.join(', ')}`); return; }
    if (!url || !key) { setError('Supabase is not configured on this deployment.'); return; }

    setBusy(true); setError(''); const testId = draft.test_id; const previousQuestions = questions[testId] || []; const nextOrder = previousQuestions.length + 1;
    const optimisticQuestion: Question = { ...draft, question_order: nextOrder, question: draft.question.trim(), option_a: draft.option_a.trim(), option_b: draft.option_b.trim(), option_c: draft.option_c.trim(), option_d: draft.option_d.trim(), points: 100 / nextOrder };
    setQuestions(prev => ({ ...prev, [testId]: [...(prev[testId] || []), optimisticQuestion] })); setQ(null); setOpen(null);
    try {
      const payload = { test_id: testId, question_order: nextOrder, question: optimisticQuestion.question, option_a: optimisticQuestion.option_a, option_b: optimisticQuestion.option_b, option_c: optimisticQuestion.option_c, option_d: optimisticQuestion.option_d, correct_answer: optimisticQuestion.correct_answer, points: optimisticQuestion.points, question_type: optimisticQuestion.question_type || 'multiple_choice' };
      const r = await fetch(`${url}/rest/v1/test_questions`, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(await r.text());
      const inserted: Question[] = await r.json(); const realQuestion = inserted[0];
      if (realQuestion) setQuestions(prev => ({ ...prev, [testId]: (prev[testId] || []).map(item => item === optimisticQuestion ? realQuestion : item) }));
      await recalculatePoints(testId); await load();
    } catch (e) {
      setQuestions(prev => ({ ...prev, [testId]: (prev[testId] || []).filter(item => item !== optimisticQuestion) }));
      setError(`Question could not be saved to the database: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally { setBusy(false); }
  }

  async function deleteQuestion(id: string, testId: string) {
    if (!url || !confirm('Delete this question?')) return;
    try { const r = await fetch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers }); if (!r.ok) throw new Error(await r.text()); await recalculatePoints(testId); await load(); }
    catch (e) { setError(`Failed to delete question: ${e instanceof Error ? e.message : 'Unknown error'}`); }
  }

  return (
    <div className="min-h-screen bg-background"><Navbar /><main className="container mx-auto space-y-6 px-6 py-8">
      <Link href="/dashboard/teacher"><Button variant="ghost" className="gap-2"><ArrowLeft className="size-4" />Back to Dashboard</Button></Link>
      <div><h1 className="text-3xl font-bold">🧪 Tests</h1><p className="text-muted-foreground">Create tests and choose a question type.</p></div>
      {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-wrap">{error}</div>}
      <Card><CardHeader><CardTitle>Create Test</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-4"><Input value={classCode} onChange={e => setClassCode(e.target.value)} placeholder="Class code" className="uppercase" /><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Test title" /><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" /><Button type="button" onClick={() => void createTest()} disabled={busy || !classCode.trim() || !title.trim()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}Create Test</Button></CardContent></Card>
      {loading ? <Loader2 className="mx-auto size-8 animate-spin" /> : tests.map(t => <Card key={t.id}><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{t.title}</CardTitle><p className="text-sm text-muted-foreground">Class: {t.class_code} · {questions[t.id]?.length || 0} questions</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => void togglePublished(t)}>{t.published ? <><EyeOff className="mr-2 size-4" />Unpublish</> : <><Eye className="mr-2 size-4" />Publish</>}</Button><Button type="button" variant="destructive" onClick={() => void deleteTest(t.id)}><Trash2 className="size-4" /></Button></div></div></CardHeader><CardContent className="space-y-4">
        {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
        <div className="rounded-lg border p-3"><div className="flex items-center justify-between"><p className="font-medium">Questions</p><Button type="button" onClick={() => newQuestion(t.id)} disabled={busy}><Plus className="mr-2 size-4" />Add Question</Button></div>
          {(questions[t.id] || []).map((x, i) => <div key={x.id || `${t.id}-${i}`} className="mt-3 flex items-start justify-between gap-3 border-t pt-3"><div><p className="font-medium">{i + 1}. {x.question}</p><p className="text-xs text-muted-foreground">{x.question_type === 'true_false' ? `True / False · Correct: ${x.correct_answer === 'A' ? 'True' : 'False'}` : `A: ${x.option_a} · B: ${x.option_b} · C: ${x.option_c} · D: ${x.option_d} · Correct: ${x.correct_answer}`} · {Number(x.points || 0).toFixed(2)} pts</p></div><Button type="button" variant="ghost" size="sm" onClick={() => x.id && void deleteQuestion(x.id, t.id)}><Trash2 className="size-4" /></Button></div>)}
          {open === t.id && q && <div className="mt-4 grid gap-3 rounded-lg bg-muted/30 p-4">
            <div><p className="mb-1 text-sm font-medium">Question Type</p><select value={q.question_type || 'multiple_choice'} onChange={e => changeType(e.target.value as QuestionType)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="multiple_choice">Multiple Choice</option><option value="true_false">True / False</option></select></div>
            <div><p className="mb-1 text-sm font-medium">Question text</p><Input value={q.question} onChange={e => setQ({ ...q, question: e.target.value })} placeholder="Question text" autoFocus /></div>
            {q.question_type === 'multiple_choice' ? <>
              <Input value={q.option_a} onChange={e => setQ({ ...q, option_a: e.target.value })} placeholder="A" />
              <Input value={q.option_b} onChange={e => setQ({ ...q, option_b: e.target.value })} placeholder="B" />
              <Input value={q.option_c} onChange={e => setQ({ ...q, option_c: e.target.value })} placeholder="C" />
              <Input value={q.option_d} onChange={e => setQ({ ...q, option_d: e.target.value })} placeholder="D" />
              <div><p className="mb-1 text-sm font-medium">Correct answer</p><select value={q.correct_answer} onChange={e => setQ({ ...q, correct_answer: e.target.value as Question['correct_answer'] })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div>
            </> : <div><p className="mb-1 text-sm font-medium">Correct answer</p><select value={q.correct_answer === 'B' ? 'B' : 'A'} onChange={e => setQ({ ...q, correct_answer: e.target.value as 'A' | 'B' })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="A">True</option><option value="B">False</option></select><p className="mt-1 text-xs text-muted-foreground">Students automatically get only True and False.</p></div>}
            <div className="flex gap-2"><Button type="button" onClick={() => void saveQuestion()} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : 'Save Question'}</Button><Button type="button" variant="outline" onClick={() => { setQ(null); setOpen(null); }}>Cancel</Button></div>
          </div>}
        </div>
      </CardContent></Card>)}
    </main></div>
  );
}
