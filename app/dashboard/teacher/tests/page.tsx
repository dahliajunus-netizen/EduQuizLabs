'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Loader2, Save, Eye, EyeOff } from 'lucide-react';

type Test = { id: string; class_code: string; title: string; description: string | null; published: boolean; created_at: string };
type Question = { id?: string; test_id: string; question_order: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: 'A'|'B'|'C'|'D'; points: number };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

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

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${url}/rest/v1/tests?select=*&order=created_at.desc`, { headers, cache: 'no-store' });
      if (!r.ok) throw new Error(await r.text());
      const data: Test[] = await r.json();
      setTests(data);
      const map: Record<string, Question[]> = {};
      await Promise.all(data.map(async t => {
        const qr = await fetch(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(t.id)}&select=*&order=question_order.asc`, { headers, cache: 'no-store' });
        map[t.id] = qr.ok ? await qr.json() : [];
      }));
      setQuestions(map);
    } catch (e) { console.error(e); alert('Failed to load tests. Make sure the Tests SQL schema has been run.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function createTest() {
    if (!classCode.trim() || !title.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`${url}/rest/v1/tests`, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ class_code: classCode.trim().toUpperCase(), title: title.trim(), description: description.trim() || null, published: false }) });
      if (!r.ok) throw new Error(await r.text());
      setClassCode(''); setTitle(''); setDescription(''); await load();
    } catch (e) { console.error(e); alert('Failed to create test.'); }
    finally { setBusy(false); }
  }

  async function deleteTest(id: string) {
    if (!confirm('Delete this test and all its questions/submissions?')) return;
    try {
      const r = await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers });
      if (!r.ok) throw new Error(await r.text());
      await load();
    } catch (e) { console.error(e); alert('Failed to delete test.'); }
  }

  async function togglePublished(t: Test) {
    try {
      const r = await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(t.id)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ published: !t.published }) });
      if (!r.ok) throw new Error(await r.text());
      setTests(prev => prev.map(x => x.id === t.id ? { ...x, published: !x.published } : x));
    } catch (e) { console.error(e); alert('Failed to change publication status.'); }
  }

  function newQuestion(testId: string) {
    setOpen(testId);
    setQ({ test_id: testId, question_order: (questions[testId]?.length || 0) + 1, question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', points: 1 });
  }

  async function saveQuestion() {
    if (!q || !q.question.trim() || !q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim()) return;
    const points = Math.max(0, Math.floor(Number(q.points) || 0));
    try {
      const r = await fetch(`${url}/rest/v1/test_questions`, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ ...q, points }) });
      if (!r.ok) throw new Error(await r.text());
      setQ(null); await load();
    } catch (e) { console.error(e); alert('Failed to save question.'); }
  }

  async function deleteQuestion(id: string, testId: string) {
    if (!confirm('Delete this question?')) return;
    const r = await fetch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers });
    if (!r.ok) { alert('Failed to delete question.'); return; }
    setQuestions(prev => ({ ...prev, [testId]: (prev[testId] || []).filter(x => x.id !== id) }));
  }

  return <div className="min-h-screen bg-background"><Navbar /><main className="container mx-auto space-y-6 px-6 py-8">
    <Link href="/dashboard/teacher"><Button variant="ghost" className="gap-2"><ArrowLeft className="size-4"/>Back to Dashboard</Button></Link>
    <div><h1 className="text-3xl font-bold">🧪 Tests</h1><p className="text-muted-foreground">Create tests, add A/B/C/D questions, set correct answers and points, then publish them.</p></div>
    <Card><CardHeader><CardTitle>Create Test</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-4">
      <Input value={classCode} onChange={e => setClassCode(e.target.value)} placeholder="Class code" className="uppercase" />
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Test title" />
      <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" />
      <Button onClick={createTest} disabled={busy || !classCode.trim() || !title.trim()}>{busy ? <Loader2 className="size-4 animate-spin"/> : <Plus className="mr-2 size-4"/>}Create Test</Button>
    </CardContent></Card>
    {loading ? <Loader2 className="mx-auto size-8 animate-spin"/> : tests.map(t => <Card key={t.id}><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{t.title}</CardTitle><p className="text-sm text-muted-foreground">Class: {t.class_code} · {questions[t.id]?.length || 0} questions</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => togglePublished(t)}>{t.published ? <><EyeOff className="mr-2 size-4"/>Unpublish</> : <><Eye className="mr-2 size-4"/>Publish</>}</Button><Button variant="destructive" onClick={() => deleteTest(t.id)}><Trash2 className="size-4"/></Button></div></div></CardHeader><CardContent className="space-y-4">
      {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
      <div className="rounded-lg border p-3"><p className="font-medium">Questions</p>{(questions[t.id] || []).map((x, i) => <div key={x.id} className="mt-3 flex items-start justify-between gap-3 border-t pt-3"><div><p className="font-medium">{i + 1}. {x.question}</p><p className="text-xs text-muted-foreground">A: {x.option_a} · B: {x.option_b} · C: {x.option_c} · D: {x.option_d} · Correct: {x.correct_answer} · {x.points} pts</p></div><Button variant="ghost" size="sm" onClick={() => x.id && deleteQuestion(x.id, t.id)}><Trash2 className="size-4"/></Button></div>)}
        {open === t.id && q ? <div className="mt-4 grid gap-2 rounded-lg bg-muted/30 p-4"><Input value={q.question} onChange={e => setQ({...q, question:e.target.value})} placeholder="Question"/><Input value={q.option_a} onChange={e => setQ({...q, option_a:e.target.value})} placeholder="A"/><Input value={q.option_b} onChange={e => setQ({...q, option_b:e.target.value})} placeholder="B"/><Input value={q.option_c} onChange={e => setQ({...q, option_c:e.target.value})} placeholder="C"/><Input value={q.option_d} onChange={e => setQ({...q, option_d:e.target.value})} placeholder="D"/><div className="grid grid-cols-2 gap-2"><select value={q.correct_answer} onChange={e => setQ({...q, correct_answer:e.target.value as Question['correct_answer']})} className="h-10 rounded-md border bg-background px-3"><option>A</option><option>B</option><option>C</option><option>D</option></select><Input type="number" min="0" value={q.points} onChange={e => setQ({...q, points:Number(e.target.value)})} placeholder="Points"/></div><div className="flex gap-2"><Button onClick={saveQuestion}><Save className="mr-2 size-4"/>Save Question</Button><Button variant="outline" onClick={() => setQ(null)}>Cancel</Button></div></div> : <Button variant="outline" className="mt-3" onClick={() => newQuestion(t.id)}><Plus className="mr-2 size-4"/>Add Question</Button>}
      </div>
    </CardContent></Card>)}
    {!loading && tests.length === 0 && <Card><CardContent className="py-10 text-center text-muted-foreground">No tests yet.</CardContent></Card>}
  </main></div>;
}
