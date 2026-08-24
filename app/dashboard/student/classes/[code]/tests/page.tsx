'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, ArrowLeft, PlusCircle, Trash2, Save, CheckCircle2, X,
  ChevronUp, ChevronDown, ClipboardList, BookOpen, GripVertical,
} from 'lucide-react';

type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching';

type MatchPair = { left: string; right: string };

type Course = { id: string; course_name: string; class_code: string };
type Test = {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  published?: boolean | null;
  created_at?: string;
};
type Question = {
  id?: string;
  test_id?: string;
  question_order: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  points: number;
  question_type?: QuestionType;
  answer_data?: Record<string, unknown> | null;
};
type TestSubmission = { id?: string; test_id: string; student_id: string; score: number };
type DraftQuestion = {
  type: QuestionType;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  matches: MatchPair[];
};

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  fill_blank: 'Fill in the Blank',
  matching: 'Matching',
};

const emptyDraft = (): DraftQuestion => ({
  type: 'multiple_choice',
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  matches: [{ left: '', right: '' }],
});

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function deleteFrom(url: string) {
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) throw new Error(await response.text());
}

export default function TestsPage() {
  const params = useParams<{ code: string }>();
  const code = String(params?.code || '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const [teacher, setTeacher] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [submissions, setSubmissions] = useState<Record<string, TestSubmission | null>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [takingTest, setTakingTest] = useState<Test | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduquizlabs_user');
      if (!raw) return;
      const data = JSON.parse(raw);
      setTeacher(String(data?.role || '').toLowerCase() === 'teacher');
      setStudentId(String(data?.id || '').trim());
    } catch {
      // Ignore malformed local storage.
    }
  }, []);

  const load = async () => {
    if (!code || !supabaseUrl || !supabaseAnonKey) {
      setLoading(false);
      setError('Supabase configuration is missing.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const courseList = await getJson<Course[]>(
        `${supabaseUrl}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(code)}&select=id,course_name,class_code&order=id.asc`,
      );
      setCourses(courseList);
      if (!courseId && courseList[0]?.id) setCourseId(courseList[0].id);

      const courseIds = courseList.map((c) => c.id);
      if (!courseIds.length) {
        setTests([]);
        setQuestions({});
        setLoading(false);
        return;
      }

      const filter = `(${courseIds.join(',')})`;
      const testList = await getJson<Test[]>(
        `${supabaseUrl}/rest/v1/tests?course_id=in.${encodeURIComponent(filter)}${teacher ? '' : '&published=eq.true'}&select=*&order=created_at.asc`,
      );
      setTests(testList);

      const questionMap: Record<string, Question[]> = {};
      await Promise.all(testList.map(async (test) => {
        try {
          questionMap[test.id] = await getJson<Question[]>(
            `${supabaseUrl}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(test.id)}&select=*&order=question_order.asc,id.asc`,
          );
        } catch {
          questionMap[test.id] = [];
        }
      }));
      setQuestions(questionMap);

      if (!teacher && studentId) {
        const submissionMap: Record<string, TestSubmission | null> = {};
        await Promise.all(testList.map(async (test) => {
          try {
            const rows = await getJson<TestSubmission[]>(
              `${supabaseUrl}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(test.id)}&student_id=eq.${encodeURIComponent(studentId)}&select=*&limit=1`,
            );
            submissionMap[test.id] = rows[0] || null;
          } catch {
            submissionMap[test.id] = null;
          }
        }));
        setSubmissions(submissionMap);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load tests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey && code) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, teacher, studentId]);

  const addQuestion = () => {
    setError(null);
    setDraftQuestions((previous) => [...previous, emptyDraft()]);
  };

  const updateDraft = (index: number, patch: Partial<DraftQuestion>) => {
    setDraftQuestions((previous) => previous.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const changeQuestionType = (index: number, type: QuestionType) => {
    if (type === 'true_false') {
      updateDraft(index, {
        type,
        option_a: 'True',
        option_b: 'False',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
      });
    } else if (type === 'fill_blank') {
      updateDraft(index, {
        type,
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: '',
      });
    } else if (type === 'matching') {
      updateDraft(index, {
        type,
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: '',
        matches: [{ left: '', right: '' }],
      });
    } else {
      updateDraft(index, {
        type,
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
      });
    }
  };

  const removeDraft = (index: number) => {
    setDraftQuestions((previous) => previous.filter((_, i) => i !== index));
  };

  const addMatch = (questionIndex: number) => {
    setDraftQuestions((previous) => previous.map((q, i) => i === questionIndex
      ? { ...q, matches: [...q.matches, { left: '', right: '' }] }
      : q));
  };

  const updateMatch = (questionIndex: number, matchIndex: number, patch: Partial<MatchPair>) => {
    setDraftQuestions((previous) => previous.map((q, i) => {
      if (i !== questionIndex) return q;
      return {
        ...q,
        matches: q.matches.map((pair, j) => j === matchIndex ? { ...pair, ...patch } : pair),
      };
    }));
  };

  const removeMatch = (questionIndex: number, matchIndex: number) => {
    setDraftQuestions((previous) => previous.map((q, i) => {
      if (i !== questionIndex || q.matches.length <= 1) return q;
      return { ...q, matches: q.matches.filter((_, j) => j !== matchIndex) };
    }));
  };

  // test_questions.points is SMALLINT, so every value sent to Supabase must be an integer.
  const getQuestionPoints = (count: number) => {
    if (count <= 0) return [] as number[];
    const base = Math.floor(100 / count);
    const remainder = 100 % count;
    return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
  };

  const automaticPoints = draftQuestions.length ? getQuestionPoints(draftQuestions.length) : [];

  const createTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return setError('You must be logged in as a teacher to create a test.');
    if (!courseId) return setError('Please select a course.');
    if (!title.trim()) return setError('Please enter a test title.');
    if (!draftQuestions.length) return setError('Please add at least one question.');
    if (!supabaseUrl || !supabaseAnonKey) return setError('Supabase configuration is missing.');

    for (const [i, q] of draftQuestions.entries()) {
      if (!q.question.trim()) return setError(`Question ${i + 1}: enter the question text.`);
      if (q.type === 'multiple_choice' && [q.option_a, q.option_b, q.option_c, q.option_d].some((v) => !v.trim())) {
        return setError(`Question ${i + 1}: complete all four choices.`);
      }
      if (q.type === 'fill_blank' && !q.correct_answer.trim()) {
        return setError(`Question ${i + 1}: enter the correct answer.`);
      }
      if (q.type === 'matching') {
        if (q.matches.length < 2) return setError(`Question ${i + 1}: add at least two matching pairs.`);
        if (q.matches.some((pair) => !pair.left.trim() || !pair.right.trim())) {
          return setError(`Question ${i + 1}: complete every matching pair.`);
        }
      }
    }

    setCreating(true);
    setError(null);
    try {
      const createdRows = await postJson<Test[]>(`${supabaseUrl}/rest/v1/tests`, {
        course_id: courseId,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
        published: false,
      });
      const created = createdRows[0];
      if (!created) throw new Error('Test was not created.');

      const points = getQuestionPoints(draftQuestions.length);
      const rows = draftQuestions.map((q, i) => {
        const answerData = q.type === 'matching'
          ? { pairs: q.matches.map((pair) => ({ left: pair.left.trim(), right: pair.right.trim() })) }
          : q.type === 'fill_blank'
            ? { acceptedAnswers: q.correct_answer.split('|').map((answer) => answer.trim()).filter(Boolean) }
            : {};

        return {
          test_id: created.id,
          question_order: i,
          question: q.question.trim(),
          option_a: q.type === 'true_false' ? 'True' : q.type === 'matching' || q.type === 'fill_blank' ? '' : q.option_a.trim(),
          option_b: q.type === 'true_false' ? 'False' : q.type === 'matching' || q.type === 'fill_blank' ? '' : q.option_b.trim(),
          option_c: q.type === 'multiple_choice' ? q.option_c.trim() : '',
          option_d: q.type === 'multiple_choice' ? q.option_d.trim() : '',
          correct_answer: q.type === 'matching' ? JSON.stringify(q.matches) : q.correct_answer.trim(),
          points: points[i],
          question_type: q.type,
          answer_data: answerData,
        };
      });

      const createdQuestions = await postJson<Question[]>(`${supabaseUrl}/rest/v1/test_questions`, rows);
      setTests((previous) => [...previous, created]);
      setQuestions((previous) => ({ ...previous, [created.id]: createdQuestions }));
      setOpen((previous) => ({ ...previous, [created.id]: true }));
      setTitle('');
      setDescription('');
      setDueDate('');
      setDraftQuestions([]);
      setMessage('Test created successfully.');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? `Failed to create test: ${err.message}` : 'Failed to create test.');
    } finally {
      setCreating(false);
    }
  };

  const togglePublished = async (test: Test) => {
    if (!teacher || !supabaseUrl) return;
    try {
      const updatedRows = await patchJson<Test[]>(
        `${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`,
        { published: !test.published },
      );
      const updated = updatedRows[0] || { ...test, published: !test.published };
      setTests((previous) => previous.map((t) => t.id === test.id ? updated : t));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update test.');
    }
  };

  const deleteTest = async (test: Test) => {
    if (!teacher || !supabaseUrl || !confirm(`Delete "${test.title}" and all of its questions?`)) return;
    try {
      await deleteFrom(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`);
      setTests((previous) => previous.filter((t) => t.id !== test.id));
      setQuestions((previous) => {
        const next = { ...previous };
        delete next[test.id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete test.');
    }
  };

  const startTest = (test: Test) => {
    if (teacher || !studentId) return;
    if (submissions[test.id]) {
      setMessage(`You already submitted this test. Score: ${Number(submissions[test.id]?.score ?? 0).toFixed(2)}%`);
      return;
    }
    setTestAnswers({});
    setTakingTest(test);
  };

  const setAnswer = (questionId: string, value: string) => {
    setTestAnswers((previous) => ({ ...previous, [questionId]: value }));
  };

  const submitTest = async () => {
    if (!takingTest || !studentId || submitting || !supabaseUrl) return;
    const qs = questions[takingTest.id] || [];
    if (!qs.length) return alert('This test has no questions.');
    if (qs.some((q) => !testAnswers[q.id || '']?.trim())) return alert('Please answer every question before submitting.');
    if (!confirm('Submit your test? You will not be able to submit it again.')) return;

    setSubmitting(true);
    try {
      const rows = await postJson<TestSubmission[]>(`${supabaseUrl}/rest/v1/rpc/submit_test`, {
        p_test_id: takingTest.id,
        p_student_id: studentId,
        p_answers: testAnswers,
      });
      const result = rows[0];
      if (!result) throw new Error('No submission was returned.');
      setSubmissions((previous) => ({ ...previous, [takingTest.id]: result }));
      setTakingTest(null);
      setMessage(`Test submitted successfully. Your score is ${Number(result.score).toFixed(2)}%.`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to submit test.');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedTests = useMemo(
    () => courses
      .map((course) => ({ course, tests: tests.filter((t) => t.course_id === course.id) }))
      .filter((group) => teacher || group.tests.length),
    [courses, tests, teacher],
  );

  const getMatchingPairs = (q: Question): MatchPair[] => {
    const data = q.answer_data;
    if (data && Array.isArray(data.pairs)) return data.pairs.filter((p): p is MatchPair => !!p && typeof p === 'object' && 'left' in p && 'right' in p);
    try {
      const parsed = JSON.parse(q.correct_answer || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="flex h-[80vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div></div>;
  }

  if (takingTest) {
    const qs = questions[takingTest.id] || [];
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-4xl space-y-6 px-6 py-8">
          <div className="flex items-center justify-between gap-4">
            <div><h1 className="text-3xl font-bold">{takingTest.title}</h1><p className="mt-1 text-sm text-muted-foreground">Answer every question before submitting.</p></div>
            <Button variant="outline" onClick={() => setTakingTest(null)}>Exit</Button>
          </div>
          {qs.map((q, index) => {
            const id = q.id || String(index);
            const type = q.question_type || 'multiple_choice';
            const pairs = type === 'matching' ? getMatchingPairs(q) : [];
            const current = testAnswers[id] || '';
            return (
              <Card key={id}>
                <CardHeader><div className="flex items-start justify-between gap-4"><CardTitle className="text-lg">{index + 1}. {q.question}</CardTitle><span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold">{q.points} pts</span></div></CardHeader>
                <CardContent>
                  {type === 'multiple_choice' && <div className="grid gap-3 sm:grid-cols-2">{[['A', q.option_a], ['B', q.option_b], ['C', q.option_c], ['D', q.option_d]].map(([letter, text]) => <button key={letter} type="button" onClick={() => setAnswer(id, letter)} className={`rounded-xl border p-4 text-left transition ${current === letter ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'hover:bg-muted'}`}><span className="font-bold">{letter}.</span> {text}</button>)}</div>}
                  {type === 'true_false' && <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setAnswer(id, 'A')} className={`rounded-xl border p-5 text-center text-lg font-semibold ${current === 'A' ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'hover:bg-muted'}`}>True</button><button type="button" onClick={() => setAnswer(id, 'B')} className={`rounded-xl border p-5 text-center text-lg font-semibold ${current === 'B' ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'hover:bg-muted'}`}>False</button></div>}
                  {type === 'fill_blank' && <Input value={current} onChange={(e) => setAnswer(id, e.target.value)} placeholder="Type your answer..." className="h-12 text-base" />}
                  {type === 'matching' && <div className="space-y-3">{pairs.map((pair, pairIndex) => <div key={pairIndex} className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><div className="rounded-lg border bg-muted/30 p-3 font-medium">{pair.left}</div><span className="hidden text-muted-foreground sm:block">→</span><Input value={(JSON.parse(current || '{}') as Record<string, string>)[pair.left] || ''} onChange={(e) => { let map: Record<string, string> = {}; try { map = JSON.parse(current || '{}'); } catch {} map[pair.left] = e.target.value; setAnswer(id, JSON.stringify(map)); }} placeholder="Match with..." /></div>)}</div>}
                </CardContent>
              </Card>
            );
          })}
          <Button className="w-full gap-2" size="lg" onClick={submitTest} disabled={submitting}>{submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{submitting ? 'Submitting...' : 'Submit Test'}</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto space-y-8 px-6 py-8">
        <div>
          <Link href={`/dashboard/${teacher ? 'teacher' : 'student'}/classes/${encodeURIComponent(code)}`}>
            <Button variant="ghost" className="-ml-3 mb-3 gap-2"><ArrowLeft className="size-4" /> Back to Class</Button>
          </Link>
          <h1 className="text-3xl font-bold">Tests</h1>
          <p className="mt-1 text-sm text-muted-foreground">{teacher ? 'Create, publish, and review tests.' : 'Take your published tests and see your results.'}</p>
        </div>

        {error && <Card><CardContent className="flex items-start justify-between gap-4 py-4"><p className="whitespace-pre-wrap text-sm text-destructive">{error}</p><Button variant="ghost" size="sm" onClick={() => setError(null)}><X className="size-4" /></Button></CardContent></Card>}
        {message && <Card><CardContent className="flex items-center justify-between gap-4 py-4"><p className="text-sm text-primary">{message}</p><Button variant="ghost" size="sm" onClick={() => setMessage(null)}><X className="size-4" /></Button></CardContent></Card>}

        {teacher && <Card>
          <CardHeader><CardTitle>Create Test</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createTest} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="mb-2 block text-sm font-medium">Course</label><select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.course_name}</option>)}</select></div>
                <div><label className="mb-2 block text-sm font-medium">Test title</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Example: Chapter 3 Quiz" required /></div>
              </div>
              <div><label className="mb-2 block text-sm font-medium">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-md border bg-background p-3" placeholder="Optional instructions" /></div>
              <div className="max-w-xs"><label className="mb-2 block text-sm font-medium">Due date</label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="font-semibold">Questions</h3><p className="text-xs text-muted-foreground">Points are automatically distributed to total exactly 100.</p></div>
                  <Button type="button" variant="outline" onClick={addQuestion} className="gap-2"><PlusCircle className="size-4" /> Add Question</Button>
                </div>

                {!draftQuestions.length && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No questions yet. Click <strong>Add Question</strong> to start building your test.</div>}

                {draftQuestions.map((q, index) => (
                  <div key={index} className="rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{index + 1}</div><div><h4 className="font-semibold">Question {index + 1}</h4><p className="text-xs text-muted-foreground">{TYPE_LABELS[q.type]} · {automaticPoints[index] ?? 0} points</p></div></div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeDraft(index)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button>
                    </div>

                    <div className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                        <div><label className="mb-2 block text-sm font-medium">Question type</label><select value={q.type} onChange={(e) => changeQuestionType(index, e.target.value as QuestionType)} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="multiple_choice">Multiple Choice</option><option value="true_false">True / False</option><option value="fill_blank">Fill in the Blank</option><option value="matching">Matching</option></select></div>
                        <div><label className="mb-2 block text-sm font-medium">Question</label><textarea value={q.question} onChange={(e) => updateDraft(index, { question: e.target.value })} rows={3} placeholder="Write the question here..." className="w-full resize-y rounded-lg border border-input bg-background p-3 text-sm" required /></div>
                      </div>

                      {q.type === 'multiple_choice' && <div className="space-y-4 rounded-xl bg-muted/30 p-4"><div className="grid gap-3 md:grid-cols-2">{([['A', 'option_a'], ['B', 'option_b'], ['C', 'option_c'], ['D', 'option_d']] as const).map(([letter, key]) => <div key={key} className="flex items-center gap-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold">{letter}</span><Input value={q[key]} onChange={(e) => updateDraft(index, { [key]: e.target.value })} placeholder={`Choice ${letter}`} required /></div>)}</div><div className="max-w-xs"><label className="mb-2 block text-sm font-medium">Correct answer</label><select value={q.correct_answer || 'A'} onChange={(e) => updateDraft(index, { correct_answer: e.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div></div>}

                      {q.type === 'true_false' && <div className="rounded-xl bg-muted/30 p-5"><p className="mb-3 text-sm font-medium">Correct answer</p><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => updateDraft(index, { correct_answer: 'A' })} className={`rounded-xl border p-4 text-left font-semibold transition ${q.correct_answer === 'A' ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'bg-background hover:bg-muted'}`}><span className="mr-2">✓</span> True</button><button type="button" onClick={() => updateDraft(index, { correct_answer: 'B' })} className={`rounded-xl border p-4 text-left font-semibold transition ${q.correct_answer === 'B' ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'bg-background hover:bg-muted'}`}><span className="mr-2">✓</span> False</button></div><p className="mt-3 text-xs text-muted-foreground">Students will see two large buttons: True and False.</p></div>}

                      {q.type === 'fill_blank' && <div className="rounded-xl bg-muted/30 p-5"><label className="mb-2 block text-sm font-medium">Correct answer</label><Input value={q.correct_answer} onChange={(e) => updateDraft(index, { correct_answer: e.target.value })} placeholder="Type the answer students should enter..." className="h-12 bg-background" required /><p className="mt-2 text-xs text-muted-foreground">For multiple accepted answers, separate them with <strong>|</strong>. Example: Jakarta | DKI Jakarta</p><div className="mt-4 rounded-lg border border-dashed bg-background p-4"><p className="mb-2 text-xs font-medium text-muted-foreground">Student preview</p><Input disabled placeholder="Type your answer..." className="h-11" /></div></div>}

                      {q.type === 'matching' && <div className="rounded-xl bg-muted/30 p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">Matching pairs</p><p className="text-xs text-muted-foreground">Add as many pairs as you need. Students will match each left item to a right item.</p></div><Button type="button" variant="outline" size="sm" onClick={() => addMatch(index)} className="gap-2"><PlusCircle className="size-4" /> Add Match</Button></div><div className="space-y-3">{q.matches.map((pair, matchIndex) => <div key={matchIndex} className="grid gap-2 md:grid-cols-[32px_1fr_auto_1fr_40px] md:items-center"><div className="hidden items-center justify-center text-muted-foreground md:flex"><GripVertical className="size-4" /></div><Input value={pair.left} onChange={(e) => updateMatch(index, matchIndex, { left: e.target.value })} placeholder={`Item ${matchIndex + 1}`} required /><span className="hidden text-center text-muted-foreground md:block">↔</span><Input value={pair.right} onChange={(e) => updateMatch(index, matchIndex, { right: e.target.value })} placeholder={`Match ${matchIndex + 1}`} required /><Button type="button" variant="ghost" size="icon" onClick={() => removeMatch(index, matchIndex)} disabled={q.matches.length <= 1} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button></div>)}</div><div className="mt-4 rounded-lg border border-dashed bg-background p-4"><p className="mb-3 text-xs font-medium text-muted-foreground">Preview</p><div className="space-y-2">{q.matches.map((pair, i) => <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm"><span className="rounded-md border p-2">{pair.left || `Item ${i + 1}`}</span><span className="text-muted-foreground">→</span><span className="rounded-md border p-2 text-muted-foreground">{pair.right || `Match ${i + 1}`}</span></div>)}</div></div></div>}
                    </div>
                  </div>
                ))}
              </div>

              <Button type="submit" disabled={creating || !courseId || !title.trim() || !draftQuestions.length} className="gap-2">{creating ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{creating ? 'Creating...' : 'Create Test'}</Button>
            </form>
          </CardContent>
        </Card>}

        <section className="space-y-5">
          {!groupedTests.length && <Card><CardContent className="py-12 text-center"><ClipboardList className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-semibold">{teacher ? 'No tests yet.' : 'No published tests yet.'}</p><p className="mt-1 text-sm text-muted-foreground">{teacher ? 'Create your first test above.' : 'Your teacher has not published a test for this class.'}</p></CardContent></Card>}
          {groupedTests.map(({ course, tests: courseTests }) => <div key={course.id} className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><BookOpen className="size-5 text-primary" />{course.course_name}</h2>
            {courseTests.map((test) => {
              const qs = questions[test.id] || [];
              const submission = submissions[test.id];
              return <Card key={test.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="min-w-0"><CardTitle className="text-base">{test.title}</CardTitle>{test.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{test.description}</p>}{test.due_date && <p className="mt-2 text-xs text-muted-foreground">Due: {new Date(test.due_date).toLocaleDateString()}</p>}{teacher && <p className="mt-2 text-xs font-medium">Status: <span className={test.published ? 'text-primary' : 'text-muted-foreground'}>{test.published ? 'Published' : 'Draft'}</span></p>}{!teacher && submission && <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary"><CheckCircle2 className="size-4" />Submitted — {Number(submission.score).toFixed(2)}%</p>}</div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">{teacher ? <><Button type="button" size="sm" variant="outline" onClick={() => togglePublished(test)}>{test.published ? 'Unpublish' : 'Publish'}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setOpen((p) => ({ ...p, [test.id]: !p[test.id] }))}>{open[test.id] ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</Button><Button type="button" size="sm" variant="ghost" onClick={() => deleteTest(test)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button></> : <Button type="button" onClick={() => startTest(test)} disabled={!!submission}>{submission ? 'Completed' : 'Take Test'}</Button>}</div>
                </CardHeader>
                {teacher && open[test.id] && <CardContent className="border-t pt-5"><div className="space-y-3">{!qs.length ? <p className="text-sm text-muted-foreground">No questions found.</p> : qs.map((q, i) => { const type = q.question_type || 'multiple_choice'; const pairs = type === 'matching' ? getMatchingPairs(q) : []; return <div key={q.id || i} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{i + 1}. {q.question}</p><p className="mt-1 text-xs font-medium text-primary">{TYPE_LABELS[type]}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{q.points} pts</span></div>{type === 'multiple_choice' && <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div>A. {q.option_a}</div><div>B. {q.option_b}</div><div>C. {q.option_c}</div><div>D. {q.option_d}</div><p className="font-semibold text-primary sm:col-span-2">Correct: {q.correct_answer}</p></div>}{type === 'true_false' && <p className="mt-3 text-sm"><span className="font-medium">Answers:</span> True / False · <span className="font-semibold text-primary">Correct: {q.correct_answer === 'A' ? 'True' : 'False'}</span></p>}{type === 'fill_blank' && <p className="mt-3 text-sm"><span className="font-medium">Correct answer:</span> <span className="font-semibold text-primary">{q.correct_answer}</span></p>}{type === 'matching' && <div className="mt-3 space-y-2">{pairs.map((pair, j) => <div key={j} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm"><span className="rounded-md bg-muted/50 p-2">{pair.left}</span><span className="text-muted-foreground">↔</span><span className="rounded-md bg-muted/50 p-2">{pair.right}</span></div>)}</div>}</div>; })}</div></CardContent>}
              </Card>;
            })}
          </div>)}
        </section>
      </main>
    </div>
  );
}
