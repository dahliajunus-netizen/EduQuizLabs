'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, PlusCircle, Trash2, Save, CheckCircle2, X, ChevronUp, ChevronDown, ClipboardList, BookOpen, Lock } from 'lucide-react';

type QuestionType = 'multiple_choice' | 'true_false';
type Course = { id: string; course_name: string; class_code: string };
type Test = { id: string; course_id: string; title: string; description?: string | null; due_date?: string | null; published?: boolean | null; created_at?: string; test_password?: string | null };
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [testPassword, setTestPassword] = useState('');
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
    for (const [i, q] of draftQuestions.entries()) { if (!q.question.trim()) return setError(`Question ${i + 1}: enter the question text.`); if (q.type === 'multiple_choice' && [q.option_a, q.option_b, q.option_c, q.option_d].some(v => !v.trim())) return setError(`Question ${i + 1}: complete all four choices.`); }
    setCreating(true); setError(null);
    try {
      const createdRows = await postJson<Test[]>(`${supabaseUrl}/rest/v1/tests`, { course_id: courseId, title: title.trim(), description: description.trim() || null, due_date: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null, test_password: testPassword.trim() || null, published: false });
      const created = createdRows[0]; if (!created) throw new Error('Test was not created.');
      const points = getQuestionPoints(draftQuestions.length);
      const rows = draftQuestions.map((q, i) => ({ test_id: created.id, question_order: i, question: q.question.trim(), option_a: q.type === 'true_false' ? 'True' : q.option_a.trim(), option_b: q.type === 'true_false' ? 'False' : q.option_b.trim(), option_c: q.type === 'true_false' ? '' : q.option_c.trim(), option_d: q.type === 'true_false' ? '' : q.option_d.trim(), correct_answer: q.correct_answer, points: points[i], question_type: q.type, answer_data: {} }));
      const createdQuestions = await postJson<Question[]>(`${supabaseUrl}/rest/v1/test_questions`, rows);
      setTests(p => [...p, created]); setQuestions(p => ({ ...p, [created.id]: createdQuestions })); setOpen(p => ({ ...p, [created.id]: true }));
      setTitle(''); setDescription(''); setDueDate(''); setTestPassword(''); setDraftQuestions([]); setMessage('Test created successfully.');
    } catch (err) { console.error(err); setError(err instanceof Error ? `Failed to create test: ${err.message}` : 'Failed to create test.'); }
    finally { setCreating(false); }
  };

  const togglePublished = async (test: Test) => { if (!teacher || !supabaseUrl) return; try { const rows = await patchJson<Test[]>(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`, { published: !test.published }); const updated = rows[0] || { ...test, published: !test.published }; setTests(p => p.map(t => t.id === test.id ? updated : t)); } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update test.'); } };
  const deleteTest = async (test: Test) => { if (!teacher || !supabaseUrl || !confirm(`Delete "${test.title}" and all of its questions?`)) return; try { await deleteFrom(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`); setTests(p => p.filter(t => t.id !== test.id)); setQuestions(p => { const next = { ...p }; delete next[test.id]; return next; }); } catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete test.'); } };

  const startTest = (test: Test) => {
    if (teacher || !studentId) return;
    if (submissions[test.id]) { setMessage(`You already submitted this test. Score: ${Number(submissions[test.id]?.score ?? 0).toFixed(2)}%`); return; }
    const requiredPassword = String(test.test_password || '').trim();
    if (requiredPassword) {
      const entered = window.prompt(`This test is password protected.\n\nEnter the test password:`);
      if (entered === null) return;
      if (entered !== requiredPassword) { setError('Incorrect test password. Please try again.'); return; }
    }
    setError(null); setTestAnswers({}); setTakingTest(test);
  };

  const submitTest = async () => {
    if (!takingTest || !studentId || submitting || !supabaseUrl) return;
    const qs = questions[takingTest.id] || [];
    if (!qs.length) return alert('This test has no questions.');
    if (qs.some(q => !testAnswers[q.id || ''])) return alert('Please answer every question before submitting.');
    if (!confirm('Are you sure you want to submit? You will not be able to submit this test again.')) return;
    setSubmitting(true);
    try {
      const rows = await postJson<TestSubmission[]>(`${supabaseUrl}/rest/v1/rpc/submit_test`, { p_test_id: takingTest.id, p_student_id: studentId, p_answers: testAnswers });
      const result = rows[0]; if (!result) throw new Error('No submission was returned.');
      setSubmissions(p => ({ ...p, [takingTest.id]: result })); setTakingTest(null); setMessage(`Test submitted successfully. Your score is ${Number(result.score).toFixed(2)}%.`);
    } catch (err) { console.error(err); alert(err instanceof Error ? err.message : 'Failed to submit test.'); }
    finally { setSubmitting(false); }
  };

  const groupedTests = useMemo(() => courses.map(course => ({ course, tests: tests.filter(t => t.course_id === course.id) })).filter(group => teacher || group.tests.length), [courses, tests, teacher]);
  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="flex h-[80vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div></div>;

  return <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto space-y-8 px-6 py-8">
      <div><Link href={`/dashboard/${teacher ? 'teacher' : 'student'}/classes/${encodeURIComponent(code)}`}><Button variant="ghost" className="-ml-3 mb-3 gap-2"><ArrowLeft className="size-4" /> Back to Class</Button></Link><h1 className="text-3xl font-bold">Tests</h1><p className="mt-1 text-sm text-muted-foreground">{teacher ? 'Create, publish, and review tests.' : 'Take your published tests and see your results.'}</p></div>
      {error && <Card><CardContent className="flex items-start justify-between gap-4 py-4"><p className="text-sm text-destructive whitespace-pre-wrap">{error}</p><Button variant="ghost" size="sm" onClick={() => setError(null)}><X className="size-4" /></Button></CardContent></Card>}
      {teacher && <Card><CardHeader><CardTitle>Create Test</CardTitle></CardHeader><CardContent><form onSubmit={createTest} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-sm font-medium">Course</label><select value={courseId} onChange={e => setCourseId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select a course</option>{courses.map(course => <option key={course.id} value={course.id}>{course.course_name}</option>)}</select></div><div><label className="mb-2 block text-sm font-medium">Test title</label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Example: Chapter 3 Quiz" required /></div></div>
        <div><label className="mb-2 block text-sm font-medium">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-md border bg-background p-3" placeholder="Optional instructions" /></div>
        <div className="grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-sm font-medium">Due date</label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div><div><label className="mb-2 flex items-center gap-2 text-sm font-medium"><Lock className="size-4" /> Test password <span className="font-normal text-muted-foreground">(optional)</span></label><Input type="password" value={testPassword} onChange={e => setTestPassword(e.target.value)} placeholder="Leave empty for no password" /></div></div>
        <div className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Questions</h3><p className="text-xs text-muted-foreground">Points are automatically distributed to total exactly 100.</p></div><Button type="button" variant="outline" onClick={addQuestion} className="gap-2"><PlusCircle className="size-4" /> Add Question</Button></div>
          {!draftQuestions.length && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No questions yet. Click Add Question.</div>}
          {draftQuestions.map((q,index) => <div key={index} className="rounded-lg border p-4"><div className="mb-4 flex items-center justify-between"><h4 className="font-semibold">Question {index+1}</h4><Button type="button" variant="ghost" size="sm" onClick={() => removeDraft(index)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button></div><div className="space-y-4">
            <div><label className="mb-2 block text-sm font-medium">Question type</label><select value={q.type} onChange={e => changeQuestionType(index,e.target.value as QuestionType)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="multiple_choice">Multiple Choice</option><option value="true_false">True / False</option></select></div>
            <Input value={q.question} onChange={e => updateDraft(index,{question:e.target.value})} placeholder="Question text" required />
            {q.type === 'multiple_choice' && <><div className="grid gap-3 md:grid-cols-2"><Input value={q.option_a} onChange={e => updateDraft(index,{option_a:e.target.value})} placeholder="A:" required /><Input value={q.option_b} onChange={e => updateDraft(index,{option_b:e.target.value})} placeholder="B:" required /><Input value={q.option_c} onChange={e => updateDraft(index,{option_c:e.target.value})} placeholder="C:" required /><Input value={q.option_d} onChange={e => updateDraft(index,{option_d:e.target.value})} placeholder="D:" required /></div><div><label className="mb-2 block text-sm font-medium">Correct answer</label><select value={q.correct_answer || 'A'} onChange={e => updateDraft(index,{correct_answer:e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div></>}
            {q.type === 'true_false' && <div><label className="mb-2 block text-sm font-medium">Correct answer</label><select value={q.correct_answer || 'A'} onChange={e => updateDraft(index,{correct_answer:e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="A">True</option><option value="B">False</option></select><p className="mt-2 text-xs text-muted-foreground">Students will receive True and False as the two choices.</p></div>}
            <p className="text-xs font-medium text-muted-foreground">Points: {automaticPoints[index] ?? 0}</p>
          </div></div>)}
        </div><Button type="submit" disabled={creating || !courseId || !title.trim() || !draftQuestions.length} className="gap-2">{creating ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{creating ? 'Creating...' : 'Create Test'}</Button>
      </form></CardContent></Card>}
      <section className="space-y-5">{!groupedTests.length && <Card><CardContent className="py-12 text-center"><ClipboardList className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-semibold">{teacher ? 'No tests yet.' : 'No published tests yet.'}</p><p className="mt-1 text-sm text-muted-foreground">{teacher ? 'Create your first test above.' : 'Your teacher has not published a test for this class.'}</p></CardContent></Card>}
        {groupedTests.map(({course,tests:courseTests}) => <div key={course.id} className="space-y-3"><h2 className="flex items-center gap-2 text-xl font-semibold"><BookOpen className="size-5 text-primary" />{course.course_name}</h2>{courseTests.map(test => { const qs=questions[test.id]||[]; const submission=submissions[test.id]; return <Card key={test.id} className="overflow-hidden"><CardHeader className="flex flex-row items-start justify-between gap-4"><div className="min-w-0"><CardTitle className="text-base">{test.title}</CardTitle>{test.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{test.description}</p>}{test.due_date && <p className="mt-2 text-xs text-muted-foreground">Due: {new Date(test.due_date).toLocaleDateString()}</p>}{test.test_password && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Password protected</p>}{teacher && <p className="mt-2 text-xs font-medium">Status: <span className={test.published ? 'text-primary' : 'text-muted-foreground'}>{test.published ? 'Published' : 'Draft'}</span></p>}{!teacher && submission && <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary"><CheckCircle2 className="size-4" />Submitted — {Number(submission.score).toFixed(2)}%</p>}</div><div className="flex shrink-0 flex-wrap justify-end gap-2">{teacher ? <><Button type="button" size="sm" variant="outline" onClick={() => togglePublished(test)}>{test.published ? 'Unpublish' : 'Publish'}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setOpen(p => ({...p,[test.id]:!p[test.id]}))}>{open[test.id] ? <ChevronUp className="size-4"/> : <ChevronDown className="size-4"/>}</Button><Button type="button" size="sm" variant="ghost" onClick={() => deleteTest(test)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4"/></Button></> : <Button type="button" onClick={() => startTest(test)} disabled={!!submission}>{submission ? 'Completed' : 'Take Test'}</Button>}</div></CardHeader>{teacher && open[test.id] && <CardContent className="border-t pt-5"><div className="space-y-3">{!qs.length ? <p className="text-sm text-muted-foreground">No questions found.</p> : qs.map((q,i) => <div key={q.id||i} className="rounded-lg border p-4"><p className="font-medium">{i+1}. {q.question}</p><p className="mt-1 text-xs font-medium text-primary">{TYPE_LABELS[q.question_type || 'multiple_choice']}</p>{(q.question_type || 'multiple_choice') === 'multiple_choice' ? <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div>A. {q.option_a}</div><div>B. {q.option_b}</div><div>C. {q.option_c}</div><div>D. {q.option_d}</div></div> : <p className="mt-3 text-sm">True / False · Correct: {q.correct_answer === 'A' ? 'True' : 'False'}</p>}</div>)}</div></CardContent>}</Card>; })}</div>)}
      </section>
    </main>
    {message && <div className="fixed bottom-5 right-5 z-[80] max-w-sm rounded-xl border bg-card p-4 shadow-xl"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary"/><p className="text-sm">{message}</p><button type="button" onClick={() => setMessage(null)}><X className="size-4"/></button></div></div>}
    {takingTest && <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"><div className="mx-auto my-8 w-full max-w-3xl rounded-xl border bg-card p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{takingTest.title}</h2>{takingTest.description && <p className="mt-1 text-sm text-muted-foreground">{takingTest.description}</p>}{studentName && <p className="mt-2 text-xs text-muted-foreground">Student: {studentName}</p>}</div><Button type="button" variant="ghost" size="sm" onClick={() => setTakingTest(null)} disabled={submitting}><X className="size-5"/></Button></div><div className="space-y-5">{(questions[takingTest.id]||[]).map((q,i) => { const id=q.id||String(i); const type=q.question_type||'multiple_choice'; const answer=testAnswers[id]||''; return <div key={id} className="rounded-xl border p-5"><p className="font-semibold">{i+1}. {q.question}</p>{type==='multiple_choice' && <div className="mt-4 grid gap-2">{(['A','B','C','D'] as const).map(letter => { const text=letter==='A'?q.option_a:letter==='B'?q.option_b:letter==='C'?q.option_c:q.option_d; return <label key={letter} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${answer===letter?'border-primary bg-primary/5':'hover:bg-muted/40'}`}><input type="radio" name={`question-${id}`} checked={answer===letter} onChange={() => setTestAnswers(p=>({...p,[id]:letter}))}/><span><b>{letter}.</b> {text}</span></label>; })}</div>}{type==='true_false' && <div className="mt-4 grid gap-2 sm:grid-cols-2">{[['A','True'],['B','False']].map(([value,label]) => <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${answer===value?'border-primary bg-primary/5':''}`}><input type="radio" name={`question-${id}`} checked={answer===value} onChange={() => setTestAnswers(p=>({...p,[id]:value}))}/><span>{label}</span></label>)}</div>}</div>; })}</div><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setTakingTest(null)} disabled={submitting}>Cancel</Button><Button type="button" onClick={submitTest} disabled={submitting || !(questions[takingTest.id]||[]).length}>{submitting?<Loader2 className="size-4 animate-spin"/>:'Submit Test'}</Button></div></div></div>}
  </div>;
}
