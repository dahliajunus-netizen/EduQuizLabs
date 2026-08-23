'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronUp, ClipboardList, ExternalLink,
  Eye, EyeOff, FileText, Link as LinkIcon, Loader2, PlusCircle, RotateCcw,
  Save, Trash2, Pencil, X
} from 'lucide-react';

type Course = { id?: string; course_name: string; class_code: string };
type Material = { id?: string; course_id: string; name: string; link: string };
type Assignment = { id?: string; course_id: string; name: string; description: string; due_date?: string | null };
type Submission = { id?: string; assignment_id: string; student_id?: string | null; nickname: string; class: string; link: string; grade?: number | null };
type Test = {
  id: string;
  course_id?: string | null;
  class_code: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  published: boolean;
};
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
  points: number;
};
type AddType = 'material' | 'assignment';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const jsonHeaders = { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' };

export default function ClassDetailsPage() {
  const params = useParams();
  const code = String(Array.isArray(params.code) ? params.code[0] : params.code || '');

  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Record<string, Material[]>>({});
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({});
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [tests, setTests] = useState<Record<string, Test[]>>({});
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});

  const [teacher, setTeacher] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [openA, setOpenA] = useState<Record<string, boolean>>({});
  const [openT, setOpenT] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const [courseModal, setCourseModal] = useState(false);
  const [courseName, setCourseName] = useState('');

  const [addModal, setAddModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [addType, setAddType] = useState<AddType>('material');
  const [materialName, setMaterialName] = useState('');
  const [materialLink, setMaterialLink] = useState('');
  const [assignmentName, setAssignmentName] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');

  const [testBuilder, setTestBuilder] = useState(false);
  const [builderTest, setBuilderTest] = useState<Test | null>(null);
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testDueDate, setTestDueDate] = useState('');
  const [questionModal, setQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [message, setMessage] = useState('');

  const [submissionModal, setSubmissionModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionClass, setSubmissionClass] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});

  async function get<T>(u: string): Promise<T> {
    const r = await fetch(u, { headers, cache: 'no-store' });
    const text = await r.text();
    if (!r.ok) throw new Error(text);
    return text ? JSON.parse(text) : [];
  }

  async function del(u: string) {
    const r = await fetch(u, { method: 'DELETE', headers });
    if (!r.ok) throw new Error(await r.text());
  }

  async function patch(u: string, body: unknown) {
    const r = await fetch(u, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    return r;
  }

  const validUrl = (v: string) => {
    try {
      const u = new URL(v.trim());
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const parseDate = (v: string) => {
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return d.getFullYear() === +m[3] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[1] ? d : null;
  };

  const dbDate = (v: string) => {
    const d = parseDate(v);
    return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;
  };

  const displayDate = (v?: string | null) => v ? v.split('-').reverse().join('/') : '';

  const pointsFor = (count: number) => count > 0 ? 100 / count : 0;
  const formatPoints = (count: number) => Number(pointsFor(count).toFixed(2));

  useEffect(() => {
    try {
      const raw = localStorage.getItem('current_user');
      if (!raw) return;
      const u = JSON.parse(raw);
      setStudentId(String(u.student_id ?? u.id ?? u.user_id ?? u.uid ?? u.user?.student_id ?? u.user?.id ?? ''));
      setName(String(u.fullName ?? u.full_name ?? u.name ?? u.user?.fullName ?? u.user?.full_name ?? ''));
      setTeacher(String(u.role ?? u.user?.role ?? '').toLowerCase() === 'teacher');
    } catch {
      // Ignore malformed local storage.
    }
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const classes = await get<any[]>(`${url}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(code)}&select=*`);
      if (!classes[0]) throw new Error('Class not found');
      setClassName(classes[0].class_name);
      setSchool(classes[0].school_name);

      const cs = await get<Course[]>(`${url}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(code)}&select=*&order=id.asc`);
      const mm: Record<string, Material[]> = {};
      const aa: Record<string, Assignment[]> = {};
      const tt: Record<string, Test[]> = {};
      const qq: Record<string, Question[]> = {};
      const ss: Record<string, Submission[]> = {};

      for (const c of cs) {
        if (!c.id) continue;
        mm[c.id] = await get<Material[]>(`${url}/rest/v1/course_materials?course_id=eq.${encodeURIComponent(c.id)}&select=*`).catch(() => []);
        aa[c.id] = await get<Assignment[]>(`${url}/rest/v1/course_assignments?course_id=eq.${encodeURIComponent(c.id)}&select=*&order=created_at.asc`).catch(() => []);

        // Teachers can work on drafts. Students receive published tests only.
        const testFilter = teacher ? '' : '&published=eq.true';
        tt[c.id] = await get<Test[]>(`${url}/rest/v1/tests?course_id=eq.${encodeURIComponent(c.id)}${testFilter}&select=*&order=created_at.asc`).catch(() => []);
        for (const t of tt[c.id]) {
          qq[t.id] = await get<Question[]>(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(t.id)}&select=*&order=question_order.asc`).catch(() => []);
        }

        for (const a of aa[c.id]) {
          if (!a.id) continue;
          const filter = teacher
            ? `assignment_id=eq.${encodeURIComponent(a.id)}`
            : `assignment_id=eq.${encodeURIComponent(a.id)}&student_id=eq.${encodeURIComponent(studentId)}`;
          ss[a.id] = await get<Submission[]>(`${url}/rest/v1/assignment_submissions?${filter}&select=*`).catch(() => []);
        }
      }

      setCourses(cs);
      setMaterials(mm);
      setAssignments(aa);
      setTests(tt);
      setQuestions(qq);
      setSubmissions(ss);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load class');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (code) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, teacher, studentId]);

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!courseName.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`${url}/rest/v1/class_courses`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ course_name: courseName.trim(), class_code: code })
      });
      if (!r.ok) throw new Error(await r.text());
      setCourseName('');
      setCourseModal(false);
      await load();
    } catch {
      alert('Failed to create course');
    } finally {
      setBusy(false);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourse?.id) return;
    setBusy(true);
    setMessage('');
    try {
      if (addType === 'material') {
        if (!materialName.trim() || !validUrl(materialLink)) throw new Error('Enter a valid material link');
        const r = await fetch(`${url}/rest/v1/course_materials`, {
          method: 'POST', headers: jsonHeaders,
          body: JSON.stringify({ course_id: selectedCourse.id, name: materialName.trim(), link: materialLink.trim() })
        });
        if (!r.ok) throw new Error(await r.text());
      } else {
        const due = dbDate(assignmentDueDate);
        if (!assignmentName.trim() || !assignmentDescription.trim() || !due) throw new Error('Enter a valid due date as DD/MM/YYYY');
        const r = await fetch(`${url}/rest/v1/course_assignments`, {
          method: 'POST', headers: jsonHeaders,
          body: JSON.stringify({ course_id: selectedCourse.id, name: assignmentName.trim(), description: assignmentDescription.trim(), due_date: due })
        });
        if (!r.ok) throw new Error(await r.text());
      }
      setAddModal(false);
      setMaterialName('');
      setMaterialLink('');
      setAssignmentName('');
      setAssignmentDescription('');
      setAssignmentDueDate('');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to add item');
    } finally {
      setBusy(false);
    }
  }

  async function createTest(course: Course) {
    if (!course.id) return;
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch(`${url}/rest/v1/tests`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({
          course_id: course.id,
          class_code: code.toUpperCase(),
          title: 'Untitled Test',
          description: null,
          due_date: null,
          published: false
        })
      });
      if (!r.ok) throw new Error(await r.text());
      const created = await r.json();
      const test = Array.isArray(created) ? created[0] : created;
      if (!test?.id) throw new Error('Test was created but its ID was not returned.');
      openBuilder(test as Test);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create test');
    } finally {
      setBusy(false);
    }
  }

  function openBuilder(t: Test) {
    setBuilderTest(t);
    setTestTitle(t.title || '');
    setTestDescription(t.description || '');
    setTestDueDate(displayDate(t.due_date));
    setMessage('');
    setTestBuilder(true);
  }

  async function saveTestDetails() {
    if (!builderTest) return;
    if (!testTitle.trim()) {
      setMessage('Test title is required.');
      return;
    }
    const due = dbDate(testDueDate);
    if (!due) {
      setMessage('Enter a valid due date as DD/MM/YYYY.');
      return;
    }
    setBusy(true);
    try {
      await patch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(builderTest.id)}`, {
        title: testTitle.trim(),
        description: testDescription.trim() || null,
        due_date: due
      });
      setBuilderTest({ ...builderTest, title: testTitle.trim(), description: testDescription.trim() || null, due_date: due });
      setMessage('Test details saved.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to save test details.');
    } finally {
      setBusy(false);
    }
  }

  function openNewQuestion() {
    if (!builderTest) return;
    setEditingQuestion(null);
    setQuestionText('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectAnswer('A');
    setQuestionModal(true);
  }

  function openEditQuestion(question: Question) {
    setEditingQuestion(question);
    setQuestionText(question.question);
    setOptionA(question.option_a);
    setOptionB(question.option_b);
    setOptionC(question.option_c);
    setOptionD(question.option_d);
    setCorrectAnswer(question.correct_answer);
    setQuestionModal(true);
  }

  async function rebalanceQuestions(testId: string) {
    const qs = await get<Question[]>(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(testId)}&select=*&order=question_order.asc`).catch(() => []);
    const points = pointsFor(qs.length);
    for (let i = 0; i < qs.length; i++) {
      if (!qs[i].id) continue;
      await patch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(qs[i].id)}`, {
        question_order: i + 1,
        points
      });
    }
  }

  async function saveQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!builderTest) return;
    if (!questionText.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setMessage('Question text and all four answers are required.');
      return;
    }
    setBusy(true);
    try {
      const body = {
        test_id: builderTest.id,
        question: questionText.trim(),
        option_a: optionA.trim(),
        option_b: optionB.trim(),
        option_c: optionC.trim(),
        option_d: optionD.trim(),
        correct_answer: correctAnswer,
        question_order: editingQuestion?.question_order ?? ((questions[builderTest.id]?.length || 0) + 1),
        // Never manually entered: recalculated for the whole test below.
        points: 0
      };

      if (editingQuestion?.id) {
        await patch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(editingQuestion.id)}`, body);
      } else {
        const r = await fetch(`${url}/rest/v1/test_questions`, {
          method: 'POST', headers: jsonHeaders, body: JSON.stringify(body)
        });
        if (!r.ok) throw new Error(await r.text());
      }

      await rebalanceQuestions(builderTest.id);
      setQuestionModal(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save question');
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(question: Question) {
    if (!question.id || !confirm('Delete this question?')) return;
    try {
      await del(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(question.id)}`);
      await rebalanceQuestions(question.test_id);
      await load();
    } catch {
      alert('Failed to delete question.');
    }
  }

  async function deleteTest(t: Test) {
    if (!confirm(`Delete "${t.title}"? This will remove its questions too if the database relationship is configured with cascade delete.`)) return;
    try {
      await del(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(t.id)}`);
      await load();
    } catch {
      alert('Failed to delete test.');
    }
  }

  async function toggleTest(t: Test) {
    if (!t.published) {
      const qs = questions[t.id] || [];
      if (!t.title.trim() || !t.due_date || qs.length === 0) {
        alert('Finish the test in Test Maker first: add a title, due date, and at least one question.');
        return;
      }
    }
    try {
      await patch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(t.id)}`, { published: !t.published });
      await load();
    } catch {
      alert('Failed to change publication status.');
    }
  }

  const studentSubmission = (id: string) => submissions[id]?.find(s => String(s.student_id) === String(studentId));

  function openSubmit(a: Assignment) {
    if (studentSubmission(a.id!)) return;
    setSelectedAssignment(a);
    setSubmissionClass('');
    setSubmissionLink('');
    setSubmissionModal(true);
  }

  async function submitAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssignment?.id || !studentId || !submissionClass || !validUrl(submissionLink)) return;
    setBusy(true);
    try {
      const r = await fetch(`${url}/rest/v1/assignment_submissions`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ assignment_id: selectedAssignment.id, student_id: studentId, nickname: name, class: submissionClass.toUpperCase(), link: submissionLink.trim(), grade: null })
      });
      if (!r.ok) throw new Error(await r.text());
      setSubmissionModal(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  }

  async function undo(a: Assignment) {
    const s = studentSubmission(a.id!);
    if (!s?.id || !confirm('Undo your submission?')) return;
    try {
      await del(`${url}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(s.id)}&student_id=eq.${encodeURIComponent(studentId)}`);
      await load();
    } catch {
      alert('Failed to undo submission');
    }
  }

  async function saveGrade(s: Submission) {
    const raw = Number(gradeInputs[s.id!] ?? s.grade ?? 0);
    if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
      alert('Grade must be between 0 and 100.');
      return;
    }
    const g = Math.trunc(raw);
    try {
      await patch(`${url}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(s.id!)}`, { grade: g });
      await load();
    } catch {
      alert('Failed to save grade.');
    }
  }

  if (loading) return <><Navbar /><div className="flex min-h-[80vh] items-center justify-center"><Loader2 className="size-8 animate-spin" /></div></>;
  if (error) return <><Navbar /><main className="container mx-auto p-6"><Card><CardContent className="py-12 text-center"><FileText className="mx-auto mb-3 size-10" /><h1 className="text-xl font-semibold">{error}</h1></CardContent></Card></main></>;

  return (
    <>
      <Navbar />
      <main className="container mx-auto space-y-8 px-6 py-8">
        <Link href={teacher ? '/dashboard/teacher' : '/dashboard/student'}>
          <Button variant="ghost" className="gap-2"><ArrowLeft className="size-4" />Back to Dashboard</Button>
        </Link>

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{className}</h1>
            <p className="text-sm text-muted-foreground">School: {school} · Code: <b className="font-mono text-primary">{code}</b></p>
          </div>
          {teacher && <Button onClick={() => setCourseModal(true)}><PlusCircle className="mr-2 size-4" />Create New Course</Button>}
        </div>

        <div className="space-y-3">
          {courses.map(c => {
            if (!c.id) return null;
            const id = c.id;
            const ma = materials[id] || [];
            const aa = assignments[id] || [];
            const tt = tests[id] || [];
            return (
              <Card key={id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <button className="flex items-center gap-2 font-semibold" onClick={() => setOpen(p => ({ ...p, [id]: !p[id] }))}>
                    {open[id] ? <ChevronUp /> : <ChevronDown />}<BookOpen className="size-4 text-primary" />{c.course_name}
                  </button>
                  {teacher && <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setSelectedCourse(c); setAddType('material'); setAddModal(true); }}><PlusCircle className="mr-1 size-4" />Add</Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem('class_courses', id)}><Trash2 size={15} /></Button>
                  </div>}
                </CardHeader>

                {open[id] && <CardContent className="space-y-8 border-t pt-5">
                  <section>
                    <h3 className="mb-3 font-semibold">📚 Materials</h3>
                    {ma.length ? ma.map(m => <div key={m.id} className="mb-2 flex items-center gap-3 rounded-lg border p-3">
                      <a href={m.link} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2"><LinkIcon className="size-4 text-primary" /><span className="truncate">{m.name}</span><ExternalLink className="ml-auto size-4" /></a>
                      {teacher && <Button variant="ghost" size="sm" onClick={() => deleteItem('course_materials', m.id!)}><Trash2 size={14} /></Button>}
                    </div>) : <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">No materials yet.</p>}
                  </section>

                  <section>
                    <h3 className="mb-1 font-semibold">📝 Assignments</h3>
                    <p className="mb-3 text-xs text-muted-foreground">{teacher ? 'Click an assignment to view submissions and grades.' : 'Click an assignment to submit or undo your submission.'}</p>
                    {aa.length ? aa.map(a => {
                      const s = studentSubmission(a.id!);
                      const list = submissions[a.id!] || [];
                      return <div key={a.id} className="mb-2 overflow-hidden rounded-lg border">
                        <button className="flex w-full items-start gap-3 p-4 text-left" onClick={() => teacher ? setOpenA(p => ({ ...p, [a.id!]: !p[a.id!] })) : s ? undo(a) : openSubmit(a)}>
                          <ClipboardList className="size-5 text-primary" />
                          <div className="flex-1"><b>{a.name}</b><p className="text-sm text-muted-foreground">{a.description}</p>{a.due_date && <p className="mt-1 text-xs">Due: {displayDate(a.due_date)}</p>}{!teacher && s && <p className="mt-2 text-xs text-primary"><RotateCcw className="mr-1 inline size-3" />Submitted — click to undo</p>}{!teacher && !s && <p className="mt-2 text-xs text-primary">Click to submit →</p>}</div>
                          {teacher && (openA[a.id!] ? <ChevronUp /> : <ChevronDown />)}
                        </button>
                        {teacher && openA[a.id!] && <div className="border-t p-4">{list.length === 0 ? <p className="text-sm text-muted-foreground">No submissions yet.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>{list.map(sub => <tr key={sub.id} className="border-b"><td className="p-2">{sub.nickname}</td><td className="p-2">{sub.class}</td><td className="p-2"><a className="text-primary" href={sub.link} target="_blank" rel="noreferrer">Open</a></td><td className="p-2"><div className="flex justify-end gap-2"><Input className="w-20" type="number" min="0" max="100" value={gradeInputs[sub.id!] ?? String(sub.grade ?? '')} onChange={e => setGradeInputs(p => ({ ...p, [sub.id!]: e.target.value }))} /><Button size="sm" onClick={() => saveGrade(sub)}><Save className="size-3" /></Button></div></td></tr>)}</tbody></table></div>}</div>}
                        {teacher && <div className="flex justify-end border-t p-2"><Button variant="ghost" size="sm" onClick={() => deleteItem('course_assignments', a.id!)}><Trash2 className="mr-1 size-3" />Delete</Button></div>}
                      </div>;
                    }) : <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">No assignments yet.</p>}
                  </section>

                  <section>
                    <div className="mb-3 flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold">🧪 Tests</h3>
                        <p className="text-xs text-muted-foreground">{teacher ? 'Drafts and published tests for this course.' : 'Published tests for this course.'}</p>
                      </div>
                      {teacher && <Button size="sm" onClick={() => createTest(c)} disabled={busy}>
                        <PlusCircle className="mr-1 size-4" />Test Maker
                      </Button>}
                    </div>

                    {tt.length ? tt.map(t => {
                      const qs = questions[t.id] || [];
                      const points = formatPoints(qs.length);
                      return <div key={t.id} className="mb-2 overflow-hidden rounded-lg border">
                        <div className="flex items-start gap-3 p-4">
                          <div className="flex-1">
                            <b>{t.title}</b>
                            {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                            {t.due_date && <p className="mt-1 text-xs text-muted-foreground">Due: {displayDate(t.due_date)}</p>}
                            <p className="text-xs text-muted-foreground">{qs.length} question{qs.length === 1 ? '' : 's'} · {t.published ? 'Published' : 'Draft'}{qs.length ? ` · ${points} points/question` : ''}</p>
                            {!teacher && t.published && <Link href={`/dashboard/student/tests/${t.id}`}><Button size="sm" className="mt-3">Take Test</Button></Link>}
                          </div>
                          {teacher && <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => toggleTest(t)} title={t.published ? 'Unpublish' : 'Publish'}>{t.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
                            <Button variant="outline" size="sm" onClick={() => openBuilder(t)}><Pencil className="mr-1 size-4" />Edit</Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteTest(t)}><Trash2 size={14} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setOpenT(p => ({ ...p, [t.id]: !p[t.id] }))}>{openT[t.id] ? <ChevronUp /> : <ChevronDown />}</Button>
                          </div>}
                        </div>
                        {teacher && openT[t.id] && <div className="space-y-2 border-t p-4">
                          {qs.length === 0 && <p className="text-sm text-muted-foreground">No questions yet. Open Test Maker to add them.</p>}
                          {qs.map((question, i) => <div key={question.id} className="rounded border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium">{i + 1}. {question.question}</p>
                                <p className="mt-1 text-xs text-muted-foreground">A: {question.option_a} · B: {question.option_b} · C: {question.option_c} · D: {question.option_d}</p>
                                <p className="mt-1 text-xs">Correct: <b>{question.correct_answer}</b> · {formatPoints(qs.length)} pts</p>
                              </div>
                              <div className="flex shrink-0 gap-1"><Button variant="ghost" size="sm" onClick={() => openEditQuestion(question)}><Pencil className="size-3" /></Button><Button variant="ghost" size="sm" onClick={() => deleteQuestion(question)}><Trash2 className="size-3" /></Button></div>
                            </div>
                          </div>)}
                          <Button variant="outline" size="sm" onClick={() => openBuilder(t)}><Pencil className="mr-1 size-4" />Open Test Maker</Button>
                        </div>}
                      </div>;
                    }) : <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">No published tests yet.</p>}
                  </section>
                </CardContent>}
              </Card>
            );
          })}
        </div>
      </main>

      {courseModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Create New Course</CardTitle></CardHeader><CardContent><form onSubmit={createCourse} className="space-y-3"><Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Course name" required /><div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={() => setCourseModal(false)}>Cancel</Button><Button className="w-1/2" disabled={busy}>Create</Button></div></form></CardContent></Card></div>}

      {addModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Add to {selectedCourse?.course_name}</CardTitle></CardHeader><CardContent><form onSubmit={addItem} className="space-y-3"><select className="h-10 w-full rounded border bg-background px-2" value={addType} onChange={e => setAddType(e.target.value as AddType)}><option value="material">Material</option><option value="assignment">Assignment</option></select>{addType === 'material' && <><Input placeholder="Material name" value={materialName} onChange={e => setMaterialName(e.target.value)} required /><Input type="url" placeholder="https://..." value={materialLink} onChange={e => setMaterialLink(e.target.value)} required /></>}{addType === 'assignment' && <><Input placeholder="Assignment name" value={assignmentName} onChange={e => setAssignmentName(e.target.value)} required /><textarea className="w-full rounded border bg-background p-2" rows={4} placeholder="Description" value={assignmentDescription} onChange={e => setAssignmentDescription(e.target.value)} required /><Input placeholder="DD/MM/YYYY" value={assignmentDueDate} onChange={e => setAssignmentDueDate(e.target.value)} required /></>} {message && <p className="text-sm text-destructive">{message}</p>}<div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={() => setAddModal(false)}>Cancel</Button><Button className="w-1/2" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : 'Add'}</Button></div></form></CardContent></Card></div>}

      {testBuilder && builderTest && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"><div className="mx-auto my-6 w-full max-w-4xl"><Card><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>Test Maker</CardTitle><p className="mt-1 text-sm text-muted-foreground">Build the entire test here. Publishing is done from the Tests section.</p></div><Button variant="ghost" size="sm" onClick={() => { setTestBuilder(false); setMessage(''); }}><X /></Button></CardHeader><CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><label className="text-sm font-medium">Test title</label><Input value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="Test title" /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Due date</label><Input value={testDueDate} onChange={e => setTestDueDate(e.target.value)} placeholder="DD/MM/YYYY" /></div>
        </div>
        <div className="space-y-2"><label className="text-sm font-medium">Description</label><textarea className="w-full rounded border bg-background p-2" rows={3} value={testDescription} onChange={e => setTestDescription(e.target.value)} placeholder="Describe the test" /></div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3"><div><b>{questions[builderTest.id]?.length || 0} questions</b><p className="text-xs text-muted-foreground">100 points total · {questions[builderTest.id]?.length ? `${formatPoints(questions[builderTest.id].length)} points per question` : 'add questions to calculate points'}</p></div><Button onClick={saveTestDetails} disabled={busy}><Save className="mr-2 size-4" />Save Test Details</Button></div>
        {message && <p className="text-sm text-destructive">{message}</p>}
        <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Questions</h3><Button onClick={openNewQuestion}><PlusCircle className="mr-2 size-4" />Add Question</Button></div>
          {(questions[builderTest.id] || []).length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No questions yet. Add your first question.</div>}
          {(questions[builderTest.id] || []).map((question, i, arr) => <div key={question.id} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-medium">{i + 1}. {question.question}</p><div className="mt-2 grid gap-1 text-sm md:grid-cols-2"><span>A. {question.option_a}</span><span>B. {question.option_b}</span><span>C. {question.option_c}</span><span>D. {question.option_d}</span></div><p className="mt-2 text-xs text-muted-foreground">Correct answer: <b>{question.correct_answer}</b> · {formatPoints(arr.length)} points</p></div><div className="flex shrink-0 gap-1"><Button variant="outline" size="sm" onClick={() => openEditQuestion(question)}><Pencil className="mr-1 size-3" />Edit</Button><Button variant="ghost" size="sm" onClick={() => deleteQuestion(question)}><Trash2 className="size-3" /></Button></div></div></div>)}
        </div>
        <div className="flex justify-end"><Button variant="outline" onClick={() => { setTestBuilder(false); setMessage(''); }}>Done — Return to Tests</Button></div>
      </CardContent></Card></div></div>}

      {questionModal && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-2xl"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</CardTitle><Button variant="ghost" size="sm" onClick={() => setQuestionModal(false)}><X /></Button></CardHeader><CardContent><form onSubmit={saveQuestion} className="space-y-3"><div><label className="text-sm font-medium">Question text</label><textarea className="mt-1 w-full rounded border bg-background p-2" rows={3} value={questionText} onChange={e => setQuestionText(e.target.value)} required /></div><div className="grid gap-3 md:grid-cols-2"><div><label className="text-sm font-medium">A</label><Input value={optionA} onChange={e => setOptionA(e.target.value)} required /></div><div><label className="text-sm font-medium">B</label><Input value={optionB} onChange={e => setOptionB(e.target.value)} required /></div><div><label className="text-sm font-medium">C</label><Input value={optionC} onChange={e => setOptionC(e.target.value)} required /></div><div><label className="text-sm font-medium">D</label><Input value={optionD} onChange={e => setOptionD(e.target.value)} required /></div></div><div><label className="text-sm font-medium">Correct answer</label><select className="mt-1 h-10 w-full rounded border bg-background px-2" value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value as 'A' | 'B' | 'C' | 'D')}><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div><div className="rounded border bg-muted/30 p-3 text-sm text-muted-foreground">No points are entered manually. This test is always worth 100 points total, and the system automatically recalculates every question to 100 ÷ total questions.</div><div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={() => setQuestionModal(false)}>Cancel</Button><Button className="w-1/2" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : editingQuestion ? 'Save Changes' : 'Add Question'}</Button></div></form></CardContent></Card></div>}

      {submissionModal && selectedAssignment && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Submit Assignment</CardTitle></CardHeader><CardContent><form onSubmit={submitAssignment} className="space-y-3"><Input value={name} disabled /><Input placeholder="Class e.g. 8A" value={submissionClass} onChange={e => setSubmissionClass(e.target.value)} required /><Input type="url" placeholder="Submission link" value={submissionLink} onChange={e => setSubmissionLink(e.target.value)} required /><div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={() => setSubmissionModal(false)}>Cancel</Button><Button className="w-1/2" disabled={busy}>Submit</Button></div></form></CardContent></Card></div>}
    </>
  );
}
