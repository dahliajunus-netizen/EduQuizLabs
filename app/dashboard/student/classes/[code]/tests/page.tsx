'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  PlusCircle,
  Save,
  Trash2,
  X,
} from 'lucide-react';

type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching';

type Course = { id: string; course_name: string; class_code: string };

type Test = {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  created_at?: string;
  published: boolean;
};

type MatchingPair = { left: string; right: string };

type Question = {
  id?: string;
  test_id?: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  points: number;
  question_order: number;
  question_type?: QuestionType;
  answer_data?: { acceptedAnswers?: string[]; pairs?: MatchingPair[] } | null;
};

type TestSubmission = {
  id: string;
  test_id: string;
  student_id: string;
  score: number;
  submitted_at: string;
  answers: Record<string, string>;
};

type DraftQuestion = {
  type: QuestionType;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  fill_answers: string[];
  matching_pairs: MatchingPair[];
  question_order: number;
};

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  fill_blank: 'Fill in the Blank',
  matching: 'Matching',
};

const emptyDraft = (order: number): DraftQuestion => ({
  type: 'multiple_choice',
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  fill_answers: [''],
  matching_pairs: [
    { left: '', right: '' },
    { left: '', right: '' },
  ],
  question_order: order,
});

export default function TestsPage() {
  const params = useParams();
  const code = Array.isArray(params.code) ? params.code[0] : String(params.code || '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const [teacher, setTeacher] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [submissions, setSubmissions] = useState<Record<string, TestSubmission | null>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
  const [takingTest, setTakingTest] = useState<Test | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [teacherDetails, setTeacherDetails] = useState<string | null>(null);

  const authHeaders = {
    apikey: supabaseAnonKey || '',
    Authorization: `Bearer ${supabaseAnonKey || ''}`,
  };
  const jsonHeaders = {
    ...authHeaders,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const getJson = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url, { headers: authHeaders, cache: 'no-store' });
    const text = await response.text();
    if (!response.ok) throw new Error(text || 'Request failed.');
    return text ? JSON.parse(text) : ([] as T);
  };

  const postJson = async <T,>(url: string, body: unknown): Promise<T> => {
    const response = await fetch(url, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
    const text = await response.text();
    if (!response.ok) throw new Error(text || 'Request failed.');
    return text ? JSON.parse(text) : ({} as T);
  };

  const patchJson = async <T,>(url: string, body: unknown): Promise<T> => {
    const response = await fetch(url, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(body) });
    const text = await response.text();
    if (!response.ok) throw new Error(text || 'Request failed.');
    return text ? JSON.parse(text) : ({} as T);
  };

  const deleteFrom = async (url: string) => {
    const response = await fetch(url, { method: 'DELETE', headers: authHeaders });
    if (!response.ok) throw new Error((await response.text()) || 'Delete failed.');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let role = '';
    let id = '';
    let name = '';
    const read = (value: any) => {
      if (!value) return;
      role = role || value?.role || value?.user?.role || value?.user?.user_metadata?.role || value?.user_metadata?.role || '';
      id = id || value?.id || value?.user_id || value?.uid || value?.user?.id || '';
      name = name || value?.fullName || value?.full_name || value?.name || value?.user?.fullName || value?.user?.user_metadata?.fullName || '';
    };
    const directRole = localStorage.getItem('user_role');
    if (directRole) role = directRole;
    const current = localStorage.getItem('current_user');
    if (current) { try { read(JSON.parse(current)); } catch {} }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || (!key.includes('supabase') && !key.includes('auth'))) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try { read(JSON.parse(raw)); } catch {}
    }
    setTeacher(String(role).toLowerCase() === 'teacher');
    setStudentId(String(id || '').trim());
    setStudentName(String(name || '').trim());
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
      const courseList = await getJson<Course[]>(`${supabaseUrl}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(code)}&select=id,course_name,class_code&order=id.asc`);
      setCourses(courseList);
      if (!courseId && courseList[0]?.id) setCourseId(courseList[0].id);
      const courseIds = courseList.map((c) => c.id);
      if (!courseIds.length) { setTests([]); setQuestions({}); setLoading(false); return; }
      const filter = `(${courseIds.join(',')})`;
      const testList = await getJson<Test[]>(`${supabaseUrl}/rest/v1/tests?course_id=in.${encodeURIComponent(filter)}${teacher ? '' : '&published=eq.true'}&select=*&order=created_at.asc`);
      setTests(testList);
      const questionMap: Record<string, Question[]> = {};
      await Promise.all(testList.map(async (test) => {
        try {
          questionMap[test.id] = await getJson<Question[]>(`${supabaseUrl}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(test.id)}&select=*&order=question_order.asc,id.asc`);
        } catch {
          questionMap[test.id] = [];
        }
      }));
      setQuestions(questionMap);
      if (!teacher && studentId) {
        const submissionMap: Record<string, TestSubmission | null> = {};
        await Promise.all(testList.map(async (test) => {
          try {
            const rows = await getJson<TestSubmission[]>(`${supabaseUrl}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(test.id)}&student_id=eq.${encodeURIComponent(studentId)}&select=*&limit=1`);
            submissionMap[test.id] = rows[0] || null;
          } catch { submissionMap[test.id] = null; }
        }));
        setSubmissions(submissionMap);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load tests.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey && code) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, teacher, studentId]);

  const addQuestion = () => {
    setError(null);
    setDraftQuestions((previous) => [...previous, emptyDraft(previous.length)]);
  };

  const updateDraft = (index: number, patch: Partial<DraftQuestion>) => {
    setDraftQuestions((previous) => previous.map((q, i) => i === index ? { ...q, ...patch } : q));
  };

  const updateMatchingPair = (qIndex: number, pairIndex: number, key: 'left' | 'right', value: string) => {
    setDraftQuestions((previous) => previous.map((q, i) => {
      if (i !== qIndex) return q;
      const pairs = q.matching_pairs.map((pair, p) => p === pairIndex ? { ...pair, [key]: value } : pair);
      return { ...q, matching_pairs: pairs };
    }));
  };

  const updateFillAnswer = (qIndex: number, answerIndex: number, value: string) => {
    setDraftQuestions((previous) => previous.map((q, i) => {
      if (i !== qIndex) return q;
      const answers = [...q.fill_answers];
      answers[answerIndex] = value;
      return { ...q, fill_answers: answers };
    }));
  };

  const removeDraft = (index: number) => {
    setDraftQuestions((previous) => previous.filter((_, i) => i !== index).map((q, i) => ({ ...q, question_order: i })));
  };

  const resetCreator = () => {
    setTitle(''); setDescription(''); setDueDate(''); setDraftQuestions([]); setCreating(false);
  };

  const automaticPoints = draftQuestions.length ? 100 / draftQuestions.length : 0;

  const createTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return setError('You must be logged in as a teacher to create a test.');
    if (!courseId) return setError('Please select a course.');
    if (!title.trim()) return setError('Please enter a test title.');
    if (!draftQuestions.length) return setError('Please add at least one question.');
    if (!supabaseUrl || !supabaseAnonKey) return setError('Supabase configuration is missing.');

    for (const [i, q] of draftQuestions.entries()) {
      if (!q.question.trim()) return setError(`Question ${i + 1}: enter the question text.`);
      if (q.type === 'multiple_choice' && [q.option_a, q.option_b, q.option_c, q.option_d].some((v) => !v.trim())) return setError(`Question ${i + 1}: complete all four choices.`);
      if (q.type === 'fill_blank' && !q.fill_answers.some((v) => v.trim())) return setError(`Question ${i + 1}: enter at least one accepted answer.`);
      if (q.type === 'matching' && q.matching_pairs.some((p) => !p.left.trim() || !p.right.trim())) return setError(`Question ${i + 1}: complete every matching pair.`);
    }

    setCreating(true); setError(null);
    try {
      const createdRows = await postJson<Test[]>(`${supabaseUrl}/rest/v1/tests`, {
        course_id: courseId, title: title.trim(), description: description.trim() || null,
        due_date: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null, published: false,
      });
      const created = createdRows[0];
      if (!created) throw new Error('Test was not created.');
      const points = 100 / draftQuestions.length;
      const rows = draftQuestions.map((q, i) => {
        let optionA = q.option_a.trim();
        let optionB = q.option_b.trim();
        let optionC = q.option_c.trim();
        let optionD = q.option_d.trim();
        let correct = q.correct_answer;
        let answerData: Record<string, unknown> = {};
        if (q.type === 'true_false') { optionA = 'True'; optionB = 'False'; correct = q.correct_answer === 'B' ? 'B' : 'A'; }
        if (q.type === 'fill_blank') { correct = ''; answerData = { acceptedAnswers: q.fill_answers.filter((v) => v.trim()).map((v) => v.trim()) }; }
        if (q.type === 'matching') { correct = ''; answerData = { pairs: q.matching_pairs.filter((p) => p.left.trim() && p.right.trim()) }; }
        return {
          test_id: created.id, question_order: i, question: q.question.trim(),
          option_a: optionA, option_b: optionB, option_c: optionC, option_d: optionD,
          correct_answer: correct, points, question_type: q.type, answer_data: answerData,
        };
      });
      const createdQuestions = await postJson<Question[]>(`${supabaseUrl}/rest/v1/test_questions`, rows);
      setTests((previous) => [...previous, created]);
      setQuestions((previous) => ({ ...previous, [created.id]: createdQuestions }));
      setOpen((previous) => ({ ...previous, [created.id]: true }));
      resetCreator();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? `Failed to create test: ${err.message}` : 'Failed to create test.');
    } finally { setCreating(false); }
  };

  const togglePublished = async (test: Test) => {
    if (!teacher || !supabaseUrl) return;
    try {
      const updatedRows = await patchJson<Test[]>(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`, { published: !test.published });
      const updated = updatedRows[0] || { ...test, published: !test.published };
      setTests((previous) => previous.map((t) => t.id === test.id ? updated : t));
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update test.'); }
  };

  const deleteTest = async (test: Test) => {
    if (!teacher || !supabaseUrl || !confirm(`Delete "${test.title}" and all of its questions?`)) return;
    try {
      await deleteFrom(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`);
      setTests((previous) => previous.filter((t) => t.id !== test.id));
      setQuestions((previous) => { const next = { ...previous }; delete next[test.id]; return next; });
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete test.'); }
  };

  const toggleTest = (test: Test) => setOpen((previous) => ({ ...previous, [test.id]: !previous[test.id] }));

  const startTest = (test: Test) => {
    if (teacher || !studentId) return;
    if (submissions[test.id]) {
      setTeacherDetails(`You already submitted this test. Score: ${Number(submissions[test.id]?.score ?? 0).toFixed(2)}%`);
      return;
    }
    setTestAnswers({}); setTakingTest(test);
  };

  const submitTest = async () => {
    if (!takingTest || !studentId || submitting || !supabaseUrl) return;
    const qs = questions[takingTest.id] || [];
    if (!qs.length) return alert('This test has no questions.');
    if (qs.some((q) => !testAnswers[q.id || ''])) return alert('Please answer every question before submitting.');
    if (!confirm('Submit your test? You will not be able to submit it again.')) return;
    setSubmitting(true);
    try {
      const rows = await postJson<TestSubmission[]>(`${supabaseUrl}/rest/v1/rpc/submit_test`, {
        p_test_id: takingTest.id, p_student_id: studentId, p_answers: testAnswers,
      });
      const result = rows[0];
      if (!result) throw new Error('No submission was returned.');
      setSubmissions((previous) => ({ ...previous, [takingTest.id]: result }));
      setTakingTest(null);
      setTeacherDetails(`Test submitted successfully. Your score is ${Number(result.score).toFixed(2)}%.`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to submit test.');
    } finally { setSubmitting(false); }
  };

  const groupedTests = useMemo(() => courses.map((course) => ({ course, tests: tests.filter((t) => t.course_id === course.id) })).filter((group) => teacher || group.tests.length), [courses, tests, teacher]);

  const setAnswer = (questionId: string, value: string) => setTestAnswers((previous) => ({ ...previous, [questionId]: value }));

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="flex h-[80vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto space-y-8 px-6 py-8">
        <div>
          <Link href={`/dashboard/${teacher ? 'teacher' : 'student'}/classes/${encodeURIComponent(code)}`}>
            <Button variant="ghost" className="-ml-3 mb-3 gap-2"><ArrowLeft className="size-4" />Back to Class</Button>
          </Link>
          <h1 className="text-3xl font-bold">Tests</h1>
          <p className="mt-1 text-sm text-muted-foreground">{teacher ? 'Create, publish, and review tests.' : 'Take your published tests and see your results.'}</p>
        </div>

        {error && <Card><CardContent className="flex items-start justify-between gap-4 py-4"><p className="whitespace-pre-wrap text-sm text-destructive">{error}</p><button type="button" onClick={() => setError(null)}><X className="size-4" /></button></CardContent></Card>}

        {teacher && <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="size-5 text-primary" />Create New Test</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createTest} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="mb-2 block text-sm font-medium">Course</label><select value={courseId} onChange={(e) => setCourseId(e.target.value)} required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{courses.map((course) => <option key={course.id} value={course.id}>{course.course_name}</option>)}</select></div>
                <div><label className="mb-2 block text-sm font-medium">Test title</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 3 Quiz" required /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="mb-2 block text-sm font-medium">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional instructions" className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
                <div><label className="mb-2 block text-sm font-medium">Due date (optional)</label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="font-semibold">Questions ({draftQuestions.length})</h3><p className="text-xs text-muted-foreground">Each question is automatically worth {automaticPoints ? automaticPoints.toFixed(2) : '0.00'} points.</p></div>
                  <Button type="button" variant="outline" onClick={addQuestion} disabled={creating} className="gap-2"><PlusCircle className="size-4" />Add Question</Button>
                </div>
                {!draftQuestions.length && <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Click <strong>Add Question</strong> to create your first question.</div>}

                {draftQuestions.map((q, index) => <div key={index} className="space-y-4 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3"><div><p className="font-semibold">Question {index + 1}</p><p className="text-xs text-muted-foreground">{TYPE_LABELS[q.type]} · {automaticPoints.toFixed(2)} points</p></div><Button type="button" variant="ghost" size="sm" onClick={() => removeDraft(index)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button></div>
                  <select value={q.type} onChange={(e) => updateDraft(index, { type: e.target.value as QuestionType, correct_answer: e.target.value === 'true_false' ? 'A' : e.target.value === 'multiple_choice' ? 'A' : '' })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {(Object.keys(TYPE_LABELS) as QuestionType[]).map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
                  </select>
                  <textarea value={q.question} onChange={(e) => updateDraft(index, { question: e.target.value })} placeholder="Question text" rows={2} required className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm" />

                  {q.type === 'multiple_choice' && <>
                    <div className="grid gap-3 md:grid-cols-2">
                      {(['option_a','option_b','option_c','option_d'] as const).map((key, i) => <Input key={key} value={q[key]} onChange={(e) => updateDraft(index, { [key]: e.target.value })} placeholder={`Option ${String.fromCharCode(65 + i)}`} required />)}
                    </div>
                    <select value={q.correct_answer} onChange={(e) => updateDraft(index, { correct_answer: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{['A','B','C','D'].map((x) => <option key={x} value={x}>Correct answer: {x}</option>)}</select>
                  </>}

                  {q.type === 'true_false' && <select value={q.correct_answer || 'A'} onChange={(e) => updateDraft(index, { correct_answer: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="A">Correct answer: True</option><option value="B">Correct answer: False</option></select>}

                  {q.type === 'fill_blank' && <div className="space-y-3"><p className="text-sm font-medium">Accepted answers</p>{q.fill_answers.map((answer, a) => <div key={a} className="flex gap-2"><Input value={answer} onChange={(e) => updateFillAnswer(index, a, e.target.value)} placeholder={`Accepted answer ${a + 1}`} />{q.fill_answers.length > 1 && <Button type="button" variant="ghost" onClick={() => updateDraft(index, { fill_answers: q.fill_answers.filter((_, i) => i !== a) })}><Trash2 className="size-4" /></Button>}</div>)}<Button type="button" variant="outline" onClick={() => updateDraft(index, { fill_answers: [...q.fill_answers, ''] })}>Add accepted answer</Button><p className="text-xs text-muted-foreground">Answers are checked without case sensitivity and ignore extra spaces.</p></div>}

                  {q.type === 'matching' && <div className="space-y-3"><p className="text-sm font-medium">Matching pairs</p>{q.matching_pairs.map((pair, p) => <div key={p} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><Input value={pair.left} onChange={(e) => updateMatchingPair(index, p, 'left', e.target.value)} placeholder={`Left item ${p + 1}`} /><Input value={pair.right} onChange={(e) => updateMatchingPair(index, p, 'right', e.target.value)} placeholder={`Match ${p + 1}`} /><Button type="button" variant="ghost" onClick={() => updateDraft(index, { matching_pairs: q.matching_pairs.filter((_, i) => i !== p) })}><Trash2 className="size-4" /></Button></div>)}<div className="flex gap-2"><Button type="button" variant="outline" onClick={() => updateDraft(index, { matching_pairs: [...q.matching_pairs, { left: '', right: '' }] })}>Add pair</Button></div><p className="text-xs text-muted-foreground">Students will match every left item to a right item.</p></div>}
                </div>)}
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
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">{teacher ? <><Button type="button" size="sm" variant="outline" onClick={() => togglePublished(test)}>{test.published ? 'Unpublish' : 'Publish'}</Button><Button type="button" size="sm" variant="ghost" onClick={() => toggleTest(test)}>{open[test.id] ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</Button><Button type="button" size="sm" variant="ghost" onClick={() => deleteTest(test)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button></> : <Button type="button" onClick={() => startTest(test)} disabled={!!submission}>{submission ? 'Completed' : 'Take Test'}</Button>}</div>
                </CardHeader>
                {teacher && open[test.id] && <CardContent className="border-t pt-5"><div className="space-y-3">{!qs.length ? <p className="text-sm text-muted-foreground">No questions found.</p> : qs.map((q, i) => <div key={q.id || i} className="rounded-lg border p-4"><p className="font-medium">{i + 1}. {q.question}</p><p className="mt-1 text-xs text-muted-foreground">Type: {TYPE_LABELS[q.question_type || 'multiple_choice']}</p>{q.question_type === 'multiple_choice' || !q.question_type ? <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div>A. {q.option_a}</div><div>B. {q.option_b}</div><div>C. {q.option_c}</div><div>D. {q.option_d}</div></div> : q.question_type === 'true_false' ? <p className="mt-3 text-sm">True / False · Correct: {q.correct_answer === 'A' ? 'True' : 'False'}</p> : q.question_type === 'fill_blank' ? <p className="mt-3 text-sm">Accepted: {(q.answer_data?.acceptedAnswers || []).join(', ')}</p> : <div className="mt-3 space-y-1 text-sm">{(q.answer_data?.pairs || []).map((pair, p) => <div key={p}>{pair.left} → {pair.right}</div>)}</div>}</div>)}</div></CardContent>}
              </Card>;
            })}
          </div>)}
        </section>
      </main>

      {teacherDetails && <div className="fixed bottom-5 right-5 z-[80] max-w-sm rounded-xl border bg-card p-4 shadow-xl"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm">{teacherDetails}</p><button type="button" onClick={() => setTeacherDetails(null)}><X className="size-4" /></button></div></div>}

      {takingTest && <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"><div className="mx-auto my-8 w-full max-w-3xl rounded-xl border bg-card p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{takingTest.title}</h2>{takingTest.description && <p className="mt-1 text-sm text-muted-foreground">{takingTest.description}</p>}<p className="mt-2 text-xs text-muted-foreground">{studentName ? `Student: ${studentName}` : ''}</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setTakingTest(null)} disabled={submitting}><X className="size-5" /></Button></div>
        <div className="space-y-5">
          {(questions[takingTest.id] || []).map((q, i) => {
            const id = q.id || String(i);
            const type = q.question_type || 'multiple_choice';
            return <div key={id} className="rounded-xl border p-5"><p className="font-semibold">{i + 1}. {q.question}</p>
              {type === 'multiple_choice' && <div className="mt-4 grid gap-2">{(['A','B','C','D'] as const).map((letter) => { const text = letter === 'A' ? q.option_a : letter === 'B' ? q.option_b : letter === 'C' ? q.option_c : q.option_d; return <label key={letter} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${testAnswers[id] === letter ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}><input type="radio" name={`question-${id}`} checked={testAnswers[id] === letter} onChange={() => setAnswer(id, letter)} /><span><b>{letter}.</b> {text}</span></label>; })}</div>}
              {type === 'true_false' && <div className="mt-4 grid gap-2 sm:grid-cols-2">{[['A','True'],['B','False']].map(([value,label]) => <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${testAnswers[id] === value ? 'border-primary bg-primary/5' : ''}`}><input type="radio" name={`question-${id}`} checked={testAnswers[id] === value} onChange={() => setAnswer(id, value)} /><span>{label}</span></label>)}</div>}
              {type === 'fill_blank' && <div className="mt-4"><Input value={testAnswers[id] || ''} onChange={(e) => setAnswer(id, e.target.value)} placeholder="Type your answer" autoComplete="off" /></div>}
              {type === 'matching' && <div className="mt-4 space-y-3">{(q.answer_data?.pairs || []).map((pair, p) => { const current = (() => { try { return JSON.parse(testAnswers[id] || '{}') as Record<string,string>; } catch { return {}; } })(); const rights = (q.answer_data?.pairs || []).map((x) => x.right); return <div key={p} className="grid items-center gap-2 md:grid-cols-[1fr_1fr]"><div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">{pair.left}</div><select value={current[pair.left] || ''} onChange={(e) => { const next = { ...current, [pair.left]: e.target.value }; setAnswer(id, JSON.stringify(next)); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose a match</option>{rights.map((right, r) => <option key={r} value={right}>{right}</option>)}</select></div>; })}</div>}
            </div>;
          })}
        </div>
        <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setTakingTest(null)} disabled={submitting}>Cancel</Button><Button type="button" onClick={submitTest} disabled={submitting}>{submitting ? <Loader2 className="size-4 animate-spin" /> : 'Submit Test'}</Button></div>
      </div></div>}
    </div>
  );
}
