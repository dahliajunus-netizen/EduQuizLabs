'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, PlusCircle, Trash2, Save, CheckCircle2, X, ChevronUp, ChevronDown, ClipboardList, BookOpen, Lock, Timer, CircleCheck, Circle, AlertTriangle } from 'lucide-react';

type QuestionType = 'multiple_choice' | 'true_false';
type Course = { id: string; course_name: string; class_code: string };
type Test = { id: string; course_id: string; title: string; description?: string | null; due_date?: string | null; published?: boolean | null; created_at?: string; test_password?: string | null; time_limit_minutes?: number | null };
type Question = { id?: string; test_id?: string; question_order: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string; points: number; question_type?: QuestionType; answer_data?: Record<string, unknown> };
type TestSubmission = { id?: string; test_id: string; student_id: string; score: number };
type DraftQuestion = { type: QuestionType; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string };

const TYPE_LABELS: Record<QuestionType, string> = { multiple_choice: 'Multiple Choice', true_false: 'True / False' };
const emptyDraft = (): DraftQuestion => ({ type: 'multiple_choice', question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' });

async function getJson<T>(url: string): Promise<T> { const response = await fetch(url, { headers: { Accept: 'application/json' } }); if (!response.ok) throw new Error(await response.text()); return response.json(); }
async function postJson<T>(url: string, body: unknown): Promise<T> { const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) }); if (!response.ok) throw new Error(await response.text()); return response.json(); }
async function patchJson<T>(url: string, body: unknown): Promise<T> { const response = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) }); if (!response.ok) throw new Error(await response.text()); return response.json(); }
async function deleteFrom(url: string) { const response = await fetch(url, { method: 'DELETE' }); if (!response.ok) throw new Error(await response.text()); }

export default function TestsPage() {
  const params = useParams<{ code: string }>();
  const code = String(params?.code || '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const [teacher, setTeacher] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [submissions, setSubmissions] = useState<Record<string, TestSubmission | null>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [takingTest, setTakingTest] = useState<Test | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [testStartedAt, setTestStartedAt] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('');
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { try { const raw = localStorage.getItem('eduquizlabs_user'); if (!raw) return; const data = JSON.parse(raw); setTeacher(String(data?.role || '').toLowerCase() === 'teacher'); setStudentId(String(data?.id || '').trim()); setStudentName(String(data?.name || '').trim()); } catch {} }, []);

  const load = async () => {
    if (!code || !supabaseUrl || !supabaseAnonKey) { setLoading(false); setError('Supabase configuration is missing.'); return; }
    setLoading(true); setError(null);
    try {
      const courseList = await getJson<Course[]>(`${supabaseUrl}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(code)}&select=id,course_name,class_code&order=id.asc`);
      setCourses(courseList); if (!courseId && courseList[0]?.id) setCourseId(courseList[0].id);
      const courseIds = courseList.map(c => c.id); if (!courseIds.length) { setTests([]); setQuestions({}); setLoading(false); return; }
      const filter = `(${courseIds.join(',')})`;
      const testList = await getJson<Test[]>(`${supabaseUrl}/rest/v1/tests?course_id=in.${encodeURIComponent(filter)}${teacher ? '' : '&published=eq.true'}&select=*&order=created_at.asc`);
      setTests(testList);
      const questionMap: Record<string, Question[]> = {};
      await Promise.all(testList.map(async test => { try { questionMap[test.id] = await getJson<Question[]>(`${supabaseUrl}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(test.id)}&select=*&order=question_order.asc,id.asc`); } catch { questionMap[test.id] = []; } }));
      setQuestions(questionMap);
      if (!teacher && studentId) {
        const submissionMap: Record<string, TestSubmission | null> = {};
        await Promise.all(testList.map(async test => { try { const rows = await getJson<TestSubmission[]>(`${supabaseUrl}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(test.id)}&student_id=eq.${encodeURIComponent(studentId)}&select=*&limit=1`); submissionMap[test.id] = rows[0] || null; } catch { submissionMap[test.id] = null; } }));
        setSubmissions(submissionMap);
      }
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : 'Failed to load tests.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (supabaseUrl && supabaseAnonKey && code) void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [code, teacher, studentId]);

  const addQuestion = () => { setError(null); setDraftQuestions(p => [...p, emptyDraft()]); };
  const updateDraft = (index: number, patch: Partial<DraftQuestion>) => setDraftQuestions(p => p.map((q, i) => i === index ? { ...q, ...patch } : q));
  const changeQuestionType = (index: number, type: QuestionType) => type === 'true_false' ? updateDraft(index, { type, option_a: 'True', option_b: 'False', option_c: '', option_d: '', correct_answer: 'A' }) : updateDraft(index, { type, option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' });
  const removeDraft = (index: number) => setDraftQuestions(p => p.filter((_, i) => i !== index));
  const getQuestionPoints = (count: number) => { if (count <= 0) return [] as number[]; const base = Math.floor(100 / count); const remainder = 100 % count; return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0)); };
  const automaticPoints = draftQuestions.length ? getQuestionPoints(draftQuestions.length) : [];

  const createTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return setError('You must be logged in as a teacher to create a test.');
    if (!courseId) return setError('Please select a course.');
    if (!title.trim()) return setError('Please enter a test title.');
    if (!draftQuestions.length) return setError('Please add at least one question.');
    const parsedTimeLimit = timeLimitMinutes.trim() ? Number(timeLimitMinutes) : null;
    if (parsedTimeLimit !== null && (!Number.isInteger(parsedTimeLimit) || parsedTimeLimit < 1 || parsedTimeLimit > 1440)) return setError('Time limit must be a whole number from 1 to 1440 minutes.');
    for (const [i, q] of draftQuestions.entries()) { if (!q.question.trim()) return setError(`Question ${i + 1}: enter the question text.`); if (q.type === 'multiple_choice' && [q.option_a, q.option_b, q.option_c, q.option_d].some(v => !v.trim())) return setError(`Question ${i + 1}: complete all four choices.`); }
    setCreating(true); setError(null);
    try {
      const createdRows = await postJson<Test[]>(`${supabaseUrl}/rest/v1/tests`, { course_id: courseId, title: title.trim(), description: description.trim() || null, due_date: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null, test_password: testPassword.trim() || null, time_limit_minutes: parsedTimeLimit, published: false });
      const created = createdRows[0]; if (!created) throw new Error('Test was not created.');
      const points = getQuestionPoints(draftQuestions.length);
      const rows = draftQuestions.map((q, i) => ({ test_id: created.id, question_order: i, question: q.question.trim(), option_a: q.type === 'true_false' ? 'True' : q.option_a.trim(), option_b: q.type === 'true_false' ? 'False' : q.option_b.trim(), option_c: q.type === 'true_false' ? '' : q.option_c.trim(), option_d: q.type === 'true_false' ? '' : q.option_d.trim(), correct_answer: q.correct_answer, points: points[i], question_type: q.type, answer_data: {} }));
      const createdQuestions = await postJson<Question[]>(`${supabaseUrl}/rest/v1/test_questions`, rows);
      setTests(p => [...p, created]); setQuestions(p => ({ ...p, [created.id]: createdQuestions })); setOpen(p => ({ ...p, [created.id]: true }));
      setTitle(''); setDescription(''); setDueDate(''); setTestPassword(''); setTimeLimitMinutes(''); setDraftQuestions([]); setMessage('Test created successfully.');
    } catch (err) { console.error(err); setError(err instanceof Error ? `Failed to create test: ${err.message}` : 'Failed to create test.'); }
    finally { setCreating(false); }
  };

  const togglePublished = async (test: Test) => { if (!teacher || !supabaseUrl) return; try { const rows = await patchJson<Test[]>(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`, { published: !test.published }); const updated = rows[0] || { ...test, published: !test.published }; setTests(p => p.map(t => t.id === test.id ? updated : t)); } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update test.'); } };
  const deleteTest = async (test: Test) => { if (!teacher || !supabaseUrl || !confirm(`Delete "${test.title}" and all of its questions?`)) return; try { await deleteFrom(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`); setTests(p => p.filter(t => t.id !== test.id)); setQuestions(p => { const next = { ...p }; delete next[test.id]; return next; }); } catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete test.'); } };

  const finishTest = async (automatic = false) => {
    if (!takingTest || !studentId || submitting || !supabaseUrl) return;
    const qs = questions[takingTest.id] || [];
    if (!qs.length) return alert('This test has no questions.');
    if (!automatic && qs.some(q => !testAnswers[q.id || ''])) return alert('Please answer every question before submitting.');
    if (!automatic && !confirm('Are you sure you want to submit? You will not be able to submit this test again.')) return;
    setSubmitting(true);
    try {
      const rows = await postJson<TestSubmission[]>(`${supabaseUrl}/rest/v1/rpc/submit_test`, { p_test_id: takingTest.id, p_student_id: studentId, p_answers: testAnswers });
      const result = rows[0]; if (!result) throw new Error('No submission was returned.');
      setSubmissions(p => ({ ...p, [takingTest.id]: result }));
      setTakingTest(null); setTestStartedAt(null); setTimeRemaining(null);
      setMessage(automatic ? `Time is up. Your test was submitted automatically. Score: ${Number(result.score).toFixed(2)}%.` : `Test submitted successfully. Your score is ${Number(result.score).toFixed(2)}%.`);
    } catch (err) { console.error(err); alert(err instanceof Error ? err.message : 'Failed to submit test.'); }
    finally { setSubmitting(false); }
  };

  const startTest = (test: Test) => {
    if (teacher || !studentId) return;
    if (submissions[test.id]) { setMessage(`You already submitted this test. Score: ${Number(submissions[test.id]?.score ?? 0).toFixed(2)}%`); return; }
    const requiredPassword = String(test.test_password || '').trim();
    if (requiredPassword) {
      const entered = window.prompt(`This test is password protected.\n\nEnter the test password:`);
      if (entered === null) return;
      if (entered !== requiredPassword) { setError('Incorrect test password. Please try again.'); return; }
    }
    const startedAt = Date.now();
    const limitSeconds = Number(test.time_limit_minutes || 0) * 60;
    setError(null); setTestAnswers({}); setTakingTest(test); setTestStartedAt(startedAt); setTimeRemaining(limitSeconds > 0 ? limitSeconds : null);
  };

  useEffect(() => {
    if (!takingTest || !testStartedAt || !takingTest.time_limit_minutes || submitting) return;
    const limitMs = Number(takingTest.time_limit_minutes) * 60 * 1000;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((testStartedAt + limitMs - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0 && !submitting) void finishTest(true);
    };
    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, [takingTest, testStartedAt, submitting]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const groupedTests = useMemo(() => courses.map(course => ({ course, tests: tests.filter(t => t.course_id === course.id) })).filter(group => teacher || group.tests.length), [courses, tests, teacher]);
  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="mx-auto max-w-5xl px-6 py-8"><div className="space-y-6"><div className="h-8 w-40 animate-pulse rounded-xl bg-muted"/><div className="grid gap-4 md:grid-cols-2"><div className="h-32 animate-pulse rounded-3xl bg-muted"/><div className="h-32 animate-pulse rounded-3xl bg-muted"/></div><div className="h-48 animate-pulse rounded-3xl bg-muted"/></div></div></div>;

  return <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.03]">
    <Navbar />
    <main className="container mx-auto space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <div><Link href={`/dashboard/${teacher ? 'teacher' : 'student'}/classes/${encodeURIComponent(code)}`}><Button variant="ghost" className="-ml-3 mb-3 gap-2 rounded-xl"><ArrowLeft className="size-4" /> Back to Class</Button></Link><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary"><ClipboardList className="size-3.5" /> Assessments</div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Tests</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{teacher ? 'Create, publish, and review tests.' : 'Complete your published tests and keep track of your results.'}</p></div></div></div>
      {error && <Card className="rounded-2xl border-destructive/30 bg-destructive/5 shadow-sm"><CardContent className="flex items-start justify-between gap-4 py-4"><p className="whitespace-pre-wrap text-sm font-medium text-destructive">{error}</p><Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setError(null)}><X className="size-4" /></Button></CardContent></Card>}
      {teacher && <Card className="overflow-hidden rounded-3xl border-0 shadow-lg"><CardHeader className="bg-primary/[0.06] p-6 sm:p-8"><div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><PlusCircle className="size-5" /></div><div><CardTitle className="text-2xl font-black">Create Test</CardTitle><p className="mt-1 text-sm text-muted-foreground">Build a polished assessment and publish it when ready.</p></div></div></CardHeader><CardContent className="p-5 sm:p-8"><form onSubmit={createTest} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-sm font-semibold">Course</label><select value={courseId} onChange={e => setCourseId(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"><option value="">Select a course</option>{courses.map(course => <option key={course.id} value={course.id}>{course.course_name}</option>)}</select></div><div><label className="mb-2 block text-sm font-semibold">Test title</label><Input className="h-11 rounded-xl" value={title} onChange={e => setTitle(e.target.value)} placeholder="Example: Chapter 3 Quiz" required /></div></div>
        <div><label className="mb-2 block text-sm font-semibold">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Optional instructions" /></div>
        <div className="grid gap-4 md:grid-cols-3"><div><label className="mb-2 block text-sm font-semibold">Due date</label><Input className="h-11 rounded-xl" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div><div><label className="mb-2 flex items-center gap-2 text-sm font-semibold"><Lock className="size-4" /> Test password <span className="font-normal text-muted-foreground">(optional)</span></label><Input className="h-11 rounded-xl" type="password" value={testPassword} onChange={e => setTestPassword(e.target.value)} placeholder="Leave empty for no password" /></div><div><label className="mb-2 flex items-center gap-2 text-sm font-semibold"><Timer className="size-4" /> Time limit <span className="font-normal text-muted-foreground">(optional)</span></label><div className="flex items-center gap-2"><Input className="h-11 rounded-xl" type="number" min="1" max="1440" step="1" value={timeLimitMinutes} onChange={e => setTimeLimitMinutes(e.target.value)} placeholder="30" /><span className="text-sm text-muted-foreground">minutes</span></div><p className="mt-1 text-xs text-muted-foreground">Starts when the student enters the test.</p></div></div>
        <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Questions</h3><p className="text-xs text-muted-foreground">Points are automatically distributed to total exactly 100.</p></div><Button type="button" variant="outline" onClick={addQuestion} className="gap-2 rounded-xl"><PlusCircle className="size-4" /> Add Question</Button></div>
          {!draftQuestions.length && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No questions yet. Click <b>Add Question</b> to start.</div>}
          {draftQuestions.map((q,index) => <div key={index} className="rounded-2xl border bg-muted/[0.18] p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">{index+1}</span><h4 className="font-bold">Question {index+1}</h4></div><Button type="button" variant="ghost" size="sm" onClick={() => removeDraft(index)} className="rounded-lg text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button></div><div className="space-y-4">
            <div><label className="mb-2 block text-sm font-medium">Question type</label><select value={q.type} onChange={e => changeQuestionType(index,e.target.value as QuestionType)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="multiple_choice">Multiple Choice</option><option value="true_false">True / False</option></select></div>
            <Input className="h-11 rounded-xl" value={q.question} onChange={e => updateDraft(index,{question:e.target.value})} placeholder="Question text" required />
            {q.type === 'multiple_choice' && <><div className="grid gap-3 md:grid-cols-2"><Input className="h-11 rounded-xl" value={q.option_a} onChange={e => updateDraft(index,{option_a:e.target.value})} placeholder="A:" required /><Input className="h-11 rounded-xl" value={q.option_b} onChange={e => updateDraft(index,{option_b:e.target.value})} placeholder="B:" required /><Input className="h-11 rounded-xl" value={q.option_c} onChange={e => updateDraft(index,{option_c:e.target.value})} placeholder="C:" required /><Input className="h-11 rounded-xl" value={q.option_d} onChange={e => updateDraft(index,{option_d:e.target.value})} placeholder="D:" required /></div><div><label className="mb-2 block text-sm font-medium">Correct answer</label><select value={q.correct_answer || 'A'} onChange={e => updateDraft(index,{correct_answer:e.target.value})} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div></>}
            {q.type === 'true_false' && <div><label className="mb-2 block text-sm font-medium">Correct answer</label><select value={q.correct_answer || 'A'} onChange={e => updateDraft(index,{correct_answer:e.target.value})} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="A">True</option><option value="B">False</option></select><p className="mt-2 text-xs text-muted-foreground">Students will receive True and False as the two choices.</p></div>}
            <p className="text-xs font-medium text-muted-foreground">Points: {automaticPoints[index] ?? 0}</p>
          </div></div>)}
        </div><Button type="submit" disabled={creating || !courseId || !title.trim() || !draftQuestions.length} className="h-11 gap-2 rounded-xl px-5">{creating ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{creating ? 'Creating...' : 'Create Test'}</Button>
      </form></CardContent></Card>}
      <section className="space-y-5">{!groupedTests.length && <Card className="rounded-3xl"><CardContent className="py-14 text-center"><ClipboardList className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-bold">{teacher ? 'No tests yet.' : 'No published tests yet.'}</p><p className="mt-1 text-sm text-muted-foreground">{teacher ? 'Create your first test above.' : 'Your teacher has not published a test for this class.'}</p></CardContent></Card>}
        {groupedTests.map(({course,tests:courseTests}) => <div key={course.id} className="space-y-3"><h2 className="flex items-center gap-2 text-xl font-black"><BookOpen className="size-5 text-primary" />{course.course_name}</h2>{courseTests.map(test => { const qs=questions[test.id]||[]; const submission=submissions[test.id]; return <Card key={test.id} className="overflow-hidden rounded-3xl border-0 shadow-sm transition-shadow hover:shadow-md"><CardHeader className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-lg font-black">{test.title}</CardTitle>{teacher && <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${test.published?'bg-primary/10 text-primary':'bg-muted text-muted-foreground'}`}>{test.published?'Published':'Draft'}</span>}</div>{test.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{test.description}</p>}{test.due_date && <p className="mt-3 text-xs font-medium text-muted-foreground">Due: {new Date(test.due_date).toLocaleString()}</p>}{test.time_limit_minutes && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground"><Timer className="size-3" /> {test.time_limit_minutes} minute time limit</p>}{test.test_password && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground"><Lock className="size-3" /> Password protected</p>}{!teacher && submission && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary"><CheckCircle2 className="size-4" />Submitted — {Number(submission.score).toFixed(2)}%</p>}</div><div className="flex shrink-0 flex-wrap justify-start gap-2 sm:justify-end">{teacher ? <><Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => togglePublished(test)}>{test.published ? 'Unpublish' : 'Publish'}</Button><Button type="button" size="sm" variant="ghost" className="rounded-xl" onClick={() => setOpen(p => ({...p,[test.id]:!p[test.id]}))}>{open[test.id] ? <ChevronUp className="size-4"/> : <ChevronDown className="size-4"/>}</Button><Button type="button" size="sm" variant="ghost" className="rounded-xl text-muted-foreground hover:text-destructive" onClick={() => deleteTest(test)}><Trash2 className="size-4"/></Button></> : <Button type="button" onClick={() => startTest(test)} disabled={!!submission} className="rounded-xl px-5">{submission ? 'Completed' : 'Take Test'}</Button>}</div></CardHeader>{teacher && open[test.id] && <CardContent className="border-t bg-muted/[0.12] p-5 sm:p-6"><div className="space-y-3">{!qs.length ? <p className="text-sm text-muted-foreground">No questions found.</p> : qs.map((q,i) => <div key={q.id||i} className="rounded-2xl border bg-card p-4"><div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">{i+1}</span><div className="min-w-0 flex-1"><p className="font-semibold">{q.question}</p><p className="mt-1 text-xs font-medium text-primary">{TYPE_LABELS[q.question_type || 'multiple_choice']}</p>{(q.question_type || 'multiple_choice') === 'multiple_choice' ? <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div>A. {q.option_a}</div><div>B. {q.option_b}</div><div>C. {q.option_c}</div><div>D. {q.option_d}</div></div> : <p className="mt-3 text-sm">True / False · Correct: {q.correct_answer === 'A' ? 'True' : 'False'}</p>}</div></div></div>)}</div></CardContent>}</Card>; })}</div>)}
      </section>
    </main>
    {message && <div className="fixed bottom-5 left-4 right-4 z-[80] mx-auto max-w-md rounded-2xl border bg-card/95 p-4 shadow-xl backdrop-blur sm:left-auto sm:right-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary"/><p className="min-w-0 flex-1 text-sm font-medium">{message}</p><button type="button" onClick={() => setMessage(null)} className="rounded-lg p-1 hover:bg-muted"><X className="size-4"/></button></div></div>}
    {takingTest && <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/70 p-0 backdrop-blur-md"><div className="mx-auto min-h-screen w-full max-w-5xl bg-background shadow-2xl"><div className="sticky top-0 z-20 border-b bg-card/95 px-4 py-4 shadow-sm backdrop-blur sm:px-7"><div className="flex items-center gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">In progress</span>{studentName && <span className="text-xs text-muted-foreground">{studentName}</span>}</div><h2 className="mt-1 truncate text-lg font-black sm:text-2xl">{takingTest.title}</h2><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{width:`${Math.round((((questions[takingTest.id]||[]).filter(q=>!!testAnswers[q.id||''])).length/Math.max(1,(questions[takingTest.id]||[]).length))*100)}%`}} /></div></div>{timeRemaining !== null && <div className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 font-mono text-lg font-black shadow-sm sm:px-4 sm:text-xl ${timeRemaining <= 60 ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-primary/20 bg-primary/10 text-primary'}`}><Timer className="size-4 sm:size-5" />{formatTime(timeRemaining)}</div>}<Button type="button" variant="ghost" size="icon" className="rounded-xl" onClick={() => setTakingTest(null)} disabled={submitting} aria-label="Close test"><X className="size-5"/></Button></div></div><div className="mx-auto max-w-5xl px-4 py-6 pb-32 sm:px-7 sm:py-8"><div className="mb-5 rounded-2xl border bg-card p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-bold">{Object.keys(testAnswers).length} of {(questions[takingTest.id]||[]).length} answered</span><span className="text-muted-foreground">Answer every question before submitting</span></div></div><div className="space-y-5">{(questions[takingTest.id]||[]).map((q,i) => { const id=q.id||String(i); const type=q.question_type||'multiple_choice'; const answer=testAnswers[id]||''; return <div key={id} className="rounded-3xl border bg-card p-5 shadow-sm sm:p-7"><div className="flex items-start gap-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">{i+1}</span><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{TYPE_LABELS[type]}</span>{answer ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary"><CircleCheck className="size-3"/>Answered</span> : <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground"><Circle className="size-3"/>Unanswered</span>}</div><p className="text-lg font-bold leading-7 sm:text-xl">{q.question}</p>{type==='multiple_choice' && <div className="mt-5 grid gap-3 sm:grid-cols-2">{(['A','B','C','D'] as const).map(letter => { const text=letter==='A'?q.option_a:letter==='B'?q.option_b:letter==='C'?q.option_c:q.option_d; return <label key={letter} className={`group flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${answer===letter?'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20':'hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-sm'}`}><input className="size-4 accent-primary" type="radio" name={`question-${id}`} checked={answer===letter} onChange={() => setTestAnswers(p=>({...p,[id]:letter}))}/><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-black group-hover:bg-background">{letter}</span><span className="text-sm font-medium sm:text-base">{text}</span></label>; })}</div>}{type==='true_false' && <div className="mt-5 grid gap-3 sm:grid-cols-2">{[['A','True'],['B','False']].map(([value,label]) => <label key={value} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${answer===value?'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20':'hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-sm'}`}><input className="size-4 accent-primary" type="radio" name={`question-${id}`} checked={answer===value} onChange={() => setTestAnswers(p=>({...p,[id]:value}))}/><span className="text-sm font-semibold sm:text-base">{label}</span></label>)}</div>}</div></div></div>; })}</div></div><div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-card/95 px-4 py-3 shadow-2xl backdrop-blur sm:px-7"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold">{Object.keys(testAnswers).length === (questions[takingTest.id]||[]).length && (questions[takingTest.id]||[]).length > 0 ? <><CheckCircle2 className="size-4 text-primary"/>Ready to submit</> : <><AlertTriangle className="size-4 text-muted-foreground"/>{(questions[takingTest.id]||[]).length-Object.keys(testAnswers).length} unanswered</>}</div><div className="flex gap-2"><Button type="button" variant="outline" className="rounded-xl" onClick={() => setTakingTest(null)} disabled={submitting}>Exit</Button><Button type="button" className="rounded-xl px-6" onClick={() => void finishTest(false)} disabled={submitting || !(questions[takingTest.id]||[]).length}>{submitting?<><Loader2 className="mr-2 size-4 animate-spin"/>Submitting...</>:<><CheckCircle2 className="mr-2 size-4"/>Submit Test</>}</Button></div></div></div></div></div>}
  </div>;
}
