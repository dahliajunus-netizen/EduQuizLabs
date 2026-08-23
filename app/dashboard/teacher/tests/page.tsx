'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Loader2, Save, Eye, EyeOff } from 'lucide-react';

type Test = { id: string; class_code: string; title: string; description: string | null; published: boolean; created_at: string };
type Question = {
  id?: string;
  test_id: string;
  question_order: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  points?: number;
};

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
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${url}/rest/v1/tests?select=*&order=created_at.desc`, { headers, cache: 'no-store' });
      if (!r.ok) throw new Error(await r.text());
      const data: Test[] = await r.json();
      setTests(data);

      const map: Record<string, Question[]> = {};
      await Promise.all(data.map(async t => {
        const qr = await fetch(
          `${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(t.id)}&select=*&order=question_order.asc`,
          { headers, cache: 'no-store' }
        );
        map[t.id] = qr.ok ? await qr.json() : [];
      }));
      setQuestions(map);
    } catch (e) {
      console.error(e);
      setError('Failed to load tests. Make sure the Tests SQL schema has been run.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createTest() {
    if (!classCode.trim() || !title.trim()) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`${url}/rest/v1/tests`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          class_code: classCode.trim().toUpperCase(),
          title: title.trim(),
          description: description.trim() || null,
          published: false,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      setClassCode('');
      setTitle('');
      setDescription('');
      await load();
    } catch (e) {
      console.error(e);
      setError('Failed to create test.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteTest(id: string) {
    if (!confirm('Delete this test and all its questions/submissions?')) return;
    try {
      const r = await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers });
      if (!r.ok) throw new Error(await r.text());
      await load();
    } catch (e) {
      console.error(e);
      setError('Failed to delete test.');
    }
  }

  async function togglePublished(t: Test) {
    try {
      const r = await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(t.id)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ published: !t.published }),
      });
      if (!r.ok) throw new Error(await r.text());
      setTests(prev => prev.map(x => x.id === t.id ? { ...x, published: !x.published } : x));
    } catch (e) {
      console.error(e);
      setError('Failed to change publication status.');
    }
  }

  function newQuestion(testId: string) {
    setError('');
    setOpen(testId);
    setQ({
      test_id: testId,
      question_order: (questions[testId]?.length || 0) + 1,
      question: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
    });
  }

  async function recalculatePoints(testId: string) {
    const qr = await fetch(
      `${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(testId)}&select=id`,
      { headers, cache: 'no-store' }
    );
    if (!qr.ok) throw new Error(await qr.text());

    const rows: { id: string }[] = await qr.json();
    const points = rows.length ? 100 / rows.length : 0;

    await Promise.all(rows.map(row =>
      fetch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ points }),
      }).then(async r => {
        if (!r.ok) throw new Error(await r.text());
      })
    ));
  }

  async function saveQuestion() {
    if (!q) return;

    const missing: string[] = [];
    if (!q.question.trim()) missing.push('question');
    if (!q.option_a.trim()) missing.push('A');
    if (!q.option_b.trim()) missing.push('B');
    if (!q.option_c.trim()) missing.push('C');
    if (!q.option_d.trim()) missing.push('D');

    if (missing.length) {
      setError(`Please fill in: ${missing.join(', ')}`);
      return;
    }

    setBusy(true);
    setError('');

    try {
      const currentCount = questions[q.test_id]?.length || 0;
      const nextOrder = currentCount + 1;

      const payload = {
        test_id: q.test_id,
        question_order: nextOrder,
        question: q.question.trim(),
        option_a: q.option_a.trim(),
        option_b: q.option_b.trim(),
        option_c: q.option_c.trim(),
        option_d: q.option_d.trim(),
        correct_answer: q.correct_answer,
        points: 100 / (currentCount + 1),
      };

      const r = await fetch(`${url}/rest/v1/test_questions`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });

      if (!r.ok) throw new Error(await r.text());

      await recalculatePoints(q.test_id);
      setQ(null);
      setOpen(null);
      await load();
    } catch (e) {
      console.error(e);
      setError(`Failed to add question: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(id: string, testId: string) {
    if (!confirm('Delete this question?')) return;
    try {
      const r = await fetch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });
      if (!r.ok) throw new Error(await r.text());
      await recalculatePoints(testId);
      await load();
    } catch (e) {
      console.error(e);
      setError(`Failed to delete question: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto space-y-6 px-6 py-8">
        <Link href="/dashboard/teacher">
          <Button variant="ghost" className="gap-2"><ArrowLeft className="size-4" />Back to Dashboard</Button>
        </Link>

        <div>
          <h1 className="text-3xl font-bold">🧪 Tests</h1>
          <p className="text-muted-foreground">Create tests and add A/B/C/D questions. Every test is automatically worth 100 points.</p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>Create Test</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <Input value={classCode} onChange={e => setClassCode(e.target.value)} placeholder="Class code" className="uppercase" />
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Test title" />
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" />
            <Button onClick={createTest} disabled={busy || !classCode.trim() || !title.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
              Create Test
            </Button>
          </CardContent>
        </Card>

        {loading ? <Loader2 className="mx-auto size-8 animate-spin" /> : tests.map(t => (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{t.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">Class: {t.class_code} · {questions[t.id]?.length || 0} questions</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => togglePublished(t)}>
                    {t.published ? <><EyeOff className="mr-2 size-4" />Unpublish</> : <><Eye className="mr-2 size-4" />Publish</>}
                  </Button>
                  <Button variant="destructive" onClick={() => deleteTest(t.id)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}

              <div className="rounded-lg border p-3">
                <p className="font-medium">Questions</p>

                {(questions[t.id] || []).map((x, i) => (
                  <div key={x.id} className="mt-3 flex items-start justify-between gap-3 border-t pt-3">
                    <div>
                      <p className="font-medium">{i + 1}. {x.question}</p>
                      <p className="text-xs text-muted-foreground">
                        A: {x.option_a} · B: {x.option_b} · C: {x.option_c} · D: {x.option_d} · Correct: {x.correct_answer} · {Number(x.points || 0).toFixed(2)} pts
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => x.id && deleteQuestion(x.id, t.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}

                {open === t.id && q ? (
                  <div className="mt-4 grid gap-3 rounded-lg bg-muted/30 p-4">
                    <div>
                      <p className="mb-1 text-sm font-medium">Question text</p>
                      <Input value={q.question} onChange={e => setQ({ ...q, question: e.target.value })} placeholder="Question text" autoFocus />
                    </div>
                    <Input value={q.option_a} onChange={e => setQ({ ...q, option_a: e.target.value })} placeholder="A" />
                    <Input value={q.option_b} onChange={e => setQ({ ...q, option_b: e.target.value })} placeholder="B" />
                    <Input value={q.option_c} onChange={e => setQ({ ...q, option_c: e.target.value })} placeholder="C" />
                    <Input value={q.option_d} onChange={e => setQ({ ...q, option_d: e.target.value })} placeholder="D" />

                    <div>
                      <p className="mb-1 text-sm font-medium">Correct answer</p>
                      <select
                        value={q.correct_answer}
                        onChange={e => setQ({ ...q, correct_answer: e.target.value as Question['correct_answer'] })}
                        className="h-10 w-full rounded-md border bg-background px-3"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      No points need to be entered. This test is always worth 100 points total; points are automatically recalculated as 100 ÷ total questions.
                    </p>

                    <div className="flex gap-2">
                      <Button onClick={saveQuestion} disabled={busy}>
                        {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                        Add Question
                      </Button>
                      <Button variant="outline" onClick={() => { setQ(null); setOpen(null); }} disabled={busy}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="mt-3" onClick={() => newQuestion(t.id)}>
                    <Plus className="mr-2 size-4" />Add Question
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && tests.length === 0 && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No tests yet.</CardContent></Card>
        )}
      </main>
    </div>
  );
}
