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
type Question = {
  id?: string;
  test_id?: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer?: string;
  points: number;
  question_order: number;
};
type TestSubmission = {
  id: string;
  test_id: string;
  student_id: string;
  score: number;
  submitted_at: string;
  answers: Record<string, string>;
};

type DraftQuestion = Omit<Question, 'id' | 'test_id'>;

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
      role = role || value?.role || value?.user?.role || value?.user?.user_metadata?.role || '';
      id = id || value?.id || value?.user_id || value?.uid || value?.user?.id || '';
      name = name || value?.fullName || value?.full_name || value?.name || value?.user?.fullName || value?.user?.user_metadata?.fullName || '';
    };

    const directRole = localStorage.getItem('user_role');
    if (directRole) role = directRole;
    const current = localStorage.getItem('current_user');
    if (current) {
      try { read(JSON.parse(current)); } catch {}
    }
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

      const courseIds = courseList.map(c => c.id);
      if (!courseIds.length) {
        setTests([]);
        setLoading(false);
        return;
      }

      const filter = `(${courseIds.join(',')})`;
      const testList = await getJson<Test[]>(`${supabaseUrl}/rest/v1/tests?course_id=in.${encodeURIComponent(filter)}${teacher ? '' : '&published=eq.true'}&select=*&order=created_at.asc`);
      setTests(testList);

      const questionMap: Record<string, Question[]> = {};
      await Promise.all(testList.map(async test => {
        const select = teacher ? '*' : 'id,test_id,question,option_a,option_b,option_c,option_d,points,question_order';
        try {
          questionMap[test.id] = await getJson<Question[]>(`${supabaseUrl}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(test.id)}&select=${select}&order=question_order.asc,id.asc`);
        } catch {
          questionMap[test.id] = [];
        }
      }));
      setQuestions(questionMap);

      if (!teacher && studentId) {
        const submissionMap: Record<string, TestSubmission | null> = {};
        await Promise.all(testList.map(async test => {
          try {
            const rows = await getJson<TestSubmission[]>(`${supabaseUrl}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(test.id)}&student_id=eq.${encodeURIComponent(studentId)}&select=*&limit=1`);
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
    if (supabaseUrl && supabaseAnonKey && code) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, teacher, studentId]);

  const courseName = (id: string) => courses.find(c => c.id === id)?.course_name || 'Course';
  const addQuestion = () => setDraftQuestions(prev => [...prev, {
    question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', points: 1, question_order: prev.length,
  }]);
  const updateDraft = (index: number, key: keyof DraftQuestion, value: string | number) => {
    setDraftQuestions(prev => prev.map((q, i) => i === index ? { ...q, [key]: value } : q));
  };
  const removeDraft = (index: number) => setDraftQuestions(prev => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, question_order: i })));

  const resetCreator = () => {
    setTitle(''); setDescription(''); setDueDate(''); setDraftQuestions([]); setCreating(false);
  };

  const createTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher || !courseId || !title.trim() || draftQuestions.length === 0) return;
    if (draftQuestions.some(q => !q.question.trim() || !q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim())) {
      alert('Please complete every question and all four options.');
      return;
    }
    setCreating(true);
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
      const rows = draftQuestions.map((q, i) => ({ ...q, test_id: created.id, question_order: i, correct_answer: q.correct_answer || 'A' }));
      const createdQuestions = await postJson<Question[]>(`${supabaseUrl}/rest/v1/test_questions`, rows);
      setTests(prev => [...prev, created]);
      setQuestions(prev => ({ ...prev, [created.id]: createdQuestions }));
      setOpen(prev => ({ ...prev, [created.id]: true }));
      resetCreator();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to create test.');
    } finally {
      setCreating(false);
    }
  };

  const togglePublished = async (test: Test) => {
    if (!teacher) return;
    try {
      const updatedRows = await patchJson<Test[]>(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`, { published: !test.published });
      const updated = updatedRows[0] || { ...test, published: !test.published };
      setTests(prev => prev.map(t => t.id === test.id ? updated : t));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update test.');
    }
  };

  const deleteTest = async (test: Test) => {
    if (!teacher || !confirm(`Delete "${test.title}" and all of its questions?`)) return;
    try {
      await deleteFrom(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`);
      setTests(prev => prev.filter(t => t.id !== test.id));
      setQuestions(prev => { const n = { ...prev }; delete n[test.id]; return n; });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete test.');
    }
  };

  const toggleTest = async (test: Test) => {
    const next = !open[test.id];
    setOpen(prev => ({ ...prev, [test.id]: next }));
    if (next && teacher) {
      try {
        const rows = await getJson<Question[]>(`${supabaseUrl}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(test.id)}&select=*&order=question_order.asc,id.asc`);
        setQuestions(prev => ({ ...prev, [test.id]: rows }));
      } catch {}
    }
  };

  const startTest = (test: Test) => {
    if (teacher || !studentId) return;
    if (submissions[test.id]) {
      setTeacherDetails(`You already submitted this test. Score: ${Number(submissions[test.id]?.score ?? 0).toFixed(2)}%`);
      return;
    }
    setTestAnswers({});
    setTakingTest(test);
  };

  const submitTest = async () => {
    if (!takingTest || !studentId || submitting) return;
    const qs = questions[takingTest.id] || [];
    if (qs.some(q => !testAnswers[q.id || ''])) {
      alert('Please answer every question before submitting.');
      return;
    }
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
      setSubmissions(prev => ({ ...prev, [takingTest.id]: result }));
      setTakingTest(null);
      setTeacherDetails(`Test submitted successfully. Your score is ${Number(result.score).toFixed(2)}%.`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to submit test.');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedTests = useMemo(() => courses.map(course => ({ course, tests: tests.filter(t => t.course_id === course.id) })).filter(group => teacher || group.tests.length), [courses, tests, teacher]);

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="flex h-[80vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto space-y-8 px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={`/dashboard/${teacher ? 'teacher' : 'student'}/classes/${encodeURIComponent(code)}`}>
              <Button variant="ghost" className="-ml-3 mb-3 gap-2"><ArrowLeft className="size-4" />Back to Class</Button>
            </Link>
            <h1 className="text-3xl font-bold">Tests</h1>
            <p className="mt-1 text-sm text-muted-foreground">{teacher ? 'Create, publish, and review tests.' : 'Take your published tests and see your results.'}</p>
          </div>
        </div>

        {error && <Card><CardContent className="py-6 text-sm text-destructive">{error}</CardContent></Card>}

        {teacher && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="size-5 text-primary" />Create New Test</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={createTest} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Course</label>
                    <select value={courseId} onChange={e => setCourseId(e.target.value)} required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                    </select>
                  </div>
                  <div><label className="mb-2 block text-sm font-medium">Test title</label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 3 Quiz" required /></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><label className="mb-2 block text-sm font-medium">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional instructions" className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
                  <div><label className="mb-2 block text-sm font-medium">Due date (optional)</label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between"><h3 className="font-semibold">Questions ({draftQuestions.length})</h3><Button type="button" variant="outline" onClick={addQuestion} className="gap-2"><PlusCircle className="size-4" />Add Question</Button></div>
                  {draftQuestions.length === 0 && <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Add at least one multiple-choice question.</div>}
                  {draftQuestions.map((q, index) => (
                    <div key={index} className="space-y-4 rounded-xl border p-4">
                      <div className="flex items-center justify-between"><p className="font-semibold">Question {index + 1}</p><Button type="button" variant="ghost" size="sm" onClick={() => removeDraft(index)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button></div>
                      <textarea value={q.question} onChange={e => updateDraft(index, 'question', e.target.value)} placeholder="Question text" rows={2} required className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      <div className="grid gap-3 md:grid-cols-2">
                        {(['option_a','option_b','option_c','option_d'] as const).map(key => <Input key={key} value={q[key]} onChange={e => updateDraft(index, key, e.target.value)} placeholder={`Option ${key.slice(-1).toUpperCase()}`} required />)}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select value={q.correct_answer} onChange={e => updateDraft(index, 'correct_answer', e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="A">Correct answer: A</option><option value="B">Correct answer: B</option><option value="C">Correct answer: C</option><option value="D">Correct answer: D</option></select>
                        <Input type="number" min="1" step="1" value={q.points} onChange={e => updateDraft(index, 'points', Math.max(1, Number(e.target.value) || 1))} placeholder="Points" />
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="submit" disabled={creating || !courseId || !title.trim() || draftQuestions.length === 0} className="gap-2">{creating ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{creating ? 'Creating...' : 'Create Test'}</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <section className="space-y-5">
          {groupedTests.length === 0 && <Card><CardContent className="py-12 text-center"><ClipboardList className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-semibold">{teacher ? 'No tests yet.' : 'No published tests yet.'}</p><p className="mt-1 text-sm text-muted-foreground">{teacher ? 'Create your first test above.' : 'Your teacher has not published a test for this class.'}</p></CardContent></Card>}
          {groupedTests.map(({ course, tests: courseTests }) => (
            <div key={course.id} className="space-y-3">
              <h2 className="flex items-center gap-2 text-xl font-semibold"><BookOpen className="size-5 text-primary" />{course.course_name}</h2>
              {courseTests.map(test => {
                const qs = questions[test.id] || [];
                const submission = submissions[test.id];
                return (
                  <Card key={test.id} className="overflow-hidden">
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="text-base">{test.title}</CardTitle>
                        {test.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{test.description}</p>}
                        {test.due_date && <p className="mt-2 text-xs text-muted-foreground">Due: {new Date(test.due_date).toLocaleDateString()}</p>}
                        {teacher && <p className="mt-2 text-xs font-medium">Status: <span className={test.published ? 'text-primary' : 'text-muted-foreground'}>{test.published ? 'Published' : 'Draft'}</span></p>}
                        {!teacher && submission && <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary"><CheckCircle2 className="size-4" />Submitted — {Number(submission.score).toFixed(2)}%</p>}
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        {teacher ? <>
                          <Button type="button" size="sm" variant="outline" onClick={() => togglePublished(test)}>{test.published ? 'Unpublish' : 'Publish'}</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => toggleTest(test)}>{open[test.id] ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => deleteTest(test)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button>
                        </> : <Button type="button" onClick={() => startTest(test)} disabled={!!submission} className="gap-2">{submission ? 'Completed' : 'Take Test'}</Button>}
                      </div>
                    </CardHeader>
                    {teacher && open[test.id] && <CardContent className="border-t pt-5"><div className="space-y-3">{qs.length === 0 ? <p className="text-sm text-muted-foreground">No questions found.</p> : qs.map((q, i) => <div key={q.id || i} className="rounded-lg border p-4"><p className="font-medium">{i + 1}. {q.question}</p><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div>A. {q.option_a}</div><div>B. {q.option_b}</div><div>C. {q.option_c}</div><div>D. {q.option_d}</div></div><p className="mt-2 text-xs text-muted-foreground">Correct: {q.correct_answer} · {q.points} point{q.points === 1 ? '' : 's'}</p></div>)}</div></CardContent>}
                  </Card>
                );
              })}
            </div>
          ))}
        </section>
      </main>

      {teacherDetails && <div className="fixed bottom-5 right-5 z-[80] max-w-sm rounded-xl border bg-card p-4 shadow-xl"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm">{teacherDetails}</p><button type="button" onClick={() => setTeacherDetails(null)}><X className="size-4" /></button></div></div>}

      {takingTest && <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"><div className="mx-auto my-8 w-full max-w-3xl rounded-xl border bg-card p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{takingTest.title}</h2>{takingTest.description && <p className="mt-1 text-sm text-muted-foreground">{takingTest.description}</p>}<p className="mt-2 text-xs text-muted-foreground">{studentName ? `Student: ${studentName}` : ''}</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setTakingTest(null)} disabled={submitting}><X className="size-5" /></Button></div>
        <div className="space-y-5">{(questions[takingTest.id] || []).map((q, i) => <div key={q.id || i} className="rounded-xl border p-5"><p className="font-semibold">{i + 1}. {q.question}</p><div className="mt-4 grid gap-2">{(['A','B','C','D'] as const).map(letter => { const key = q.id || String(i); const text = letter === 'A' ? q.option_a : letter === 'B' ? q.option_b : letter === 'C' ? q.option_c : q.option_d; return <label key={letter} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${testAnswers[key] === letter ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}><input type="radio" name={`question-${key}`} checked={testAnswers[key] === letter} onChange={() => setTestAnswers(prev => ({ ...prev, [key]: letter }))} /><span><b>{letter}.</b> {text}</span></label>; })}</div></div>)}</div>
        <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setTakingTest(null)} disabled={submitting}>Cancel</Button><Button type="button" onClick={submitTest} disabled={submitting || !(questions[takingTest.id] || []).length}>{submitting ? <Loader2 className="size-4 animate-spin" /> : 'Submit Test'}</Button></div>
      </div></div>}
    </div>
  );
}
