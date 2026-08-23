'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronUp, ClipboardList,
  ExternalLink, Eye, EyeOff, FileText, Link as LinkIcon,
  Loader2, PlusCircle, RotateCcw, Save, Trash2,
} from 'lucide-react';

type Course = { id?: string; course_name: string; class_code: string };
type Material = { id?: string; course_id: string; name: string; link: string };
type Assignment = { id?: string; course_id: string; name: string; description: string; due_date?: string | null };
type Submission = { id?: string; assignment_id: string; student_id?: string | null; nickname: string; class: string; link: string; grade?: number | null };
type Test = { id: string; course_id?: string | null; class_code: string; title: string; description?: string | null; published: boolean };
type Question = { id?: string; test_id: string; question_order: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: 'A' | 'B' | 'C' | 'D'; points: number };
type AddType = 'material' | 'assignment' | 'test';

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
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [message, setMessage] = useState('');

  const [questionModal, setQuestionModal] = useState(false);
  const [q, setQ] = useState<Question | null>(null);
  const [submissionModal, setSubmissionModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionClass, setSubmissionClass] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});

  async function get<T>(u: string): Promise<T> {
    const response = await fetch(u, { headers, cache: 'no-store' });
    const text = await response.text();
    if (!response.ok) throw new Error(text);
    return text ? JSON.parse(text) : [];
  }

  async function del(u: string) {
    const response = await fetch(u, { method: 'DELETE', headers });
    if (!response.ok) throw new Error(await response.text());
  }

  function validUrl(value: string) {
    try {
      const parsed = new URL(value.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function parseDate(value: string) {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1]) ? date : null;
  }

  function dbDate(value: string) {
    const date = parseDate(value);
    return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null;
  }

  function displayDate(value?: string | null) {
    return value ? value.split('-').reverse().join('/') : '';
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('current_user');
      if (!raw) return;
      const user = JSON.parse(raw);
      setStudentId(String(user.student_id ?? user.id ?? user.user_id ?? user.uid ?? user.user?.student_id ?? user.user?.id ?? ''));
      setName(String(user.fullName ?? user.full_name ?? user.name ?? user.user?.fullName ?? user.user?.full_name ?? ''));
      setTeacher(String(user.role ?? user.user?.role ?? '').toLowerCase() === 'teacher');
    } catch {
      // Ignore malformed local storage.
    }
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const classRows = await get<any[]>(`${url}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(code)}&select=*`);
      if (!classRows[0]) throw new Error('Class not found');

      setClassName(classRows[0].class_name ?? '');
      setSchool(classRows[0].school_name ?? '');

      const courseRows = await get<Course[]>(`${url}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(code)}&select=*&order=id.asc`);
      setCourses(courseRows);

      const nextMaterials: Record<string, Material[]> = {};
      const nextAssignments: Record<string, Assignment[]> = {};
      const nextTests: Record<string, Test[]> = {};
      const nextQuestions: Record<string, Question[]> = {};
      const nextSubmissions: Record<string, Submission[]> = {};

      for (const course of courseRows) {
        if (!course.id) continue;
        nextMaterials[course.id] = await get<Material[]>(`${url}/rest/v1/course_materials?course_id=eq.${course.id}&select=*`).catch(() => []);
        nextAssignments[course.id] = await get<Assignment[]>(`${url}/rest/v1/course_assignments?course_id=eq.${course.id}&select=*&order=created_at.asc`).catch(() => []);
        nextTests[course.id] = await get<Test[]>(`${url}/rest/v1/tests?course_id=eq.${course.id}&select=*&order=created_at.asc`).catch(() => []);

        for (const test of nextTests[course.id]) {
          nextQuestions[test.id] = await get<Question[]>(`${url}/rest/v1/test_questions?test_id=eq.${test.id}&select=*&order=question_order.asc`).catch(() => []);
        }

        for (const assignment of nextAssignments[course.id]) {
          if (!assignment.id) continue;
          const filter = teacher
            ? `assignment_id=eq.${assignment.id}`
            : `assignment_id=eq.${assignment.id}&student_id=eq.${encodeURIComponent(studentId)}`;
          nextSubmissions[assignment.id] = await get<Submission[]>(`${url}/rest/v1/assignment_submissions?${filter}&select=*`).catch(() => []);
        }
      }

      setMaterials(nextMaterials);
      setAssignments(nextAssignments);
      setTests(nextTests);
      setQuestions(nextQuestions);
      setSubmissions(nextSubmissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load class');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (code) load();
  }, [code, teacher, studentId]);

  async function createCourse(event: React.FormEvent) {
    event.preventDefault();
    if (!courseName.trim()) return;
    setBusy(true);
    try {
      const response = await fetch(`${url}/rest/v1/class_courses`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ course_name: courseName.trim(), class_code: code }),
      });
      if (!response.ok) throw new Error(await response.text());
      setCourseName('');
      setCourseModal(false);
      await load();
    } catch {
      alert('Failed to create course');
    } finally {
      setBusy(false);
    }
  }

  async function addItem(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedCourse?.id) return;
    setBusy(true);
    setMessage('');
    try {
      let response: Response;
      if (addType === 'material') {
        if (!materialName.trim() || !validUrl(materialLink)) throw new Error('Enter a valid material link');
        response = await fetch(`${url}/rest/v1/course_materials`, {
          method: 'POST', headers: jsonHeaders,
          body: JSON.stringify({ course_id: selectedCourse.id, name: materialName.trim(), link: materialLink.trim() }),
        });
      } else if (addType === 'assignment') {
        const due = dbDate(assignmentDueDate);
        if (!assignmentName.trim() || !assignmentDescription.trim() || !due) throw new Error('Enter a valid due date as DD/MM/YYYY');
        response = await fetch(`${url}/rest/v1/course_assignments`, {
          method: 'POST', headers: jsonHeaders,
          body: JSON.stringify({ course_id: selectedCourse.id, name: assignmentName.trim(), description: assignmentDescription.trim(), due_date: due }),
        });
      } else {
        if (!testTitle.trim()) throw new Error('Enter a test title');
        response = await fetch(`${url}/rest/v1/tests`, {
          method: 'POST', headers: jsonHeaders,
          body: JSON.stringify({ course_id: selectedCourse.id, class_code: code.toUpperCase(), title: testTitle.trim(), description: testDescription.trim() || null, published: false }),
        });
      }
      if (!response.ok) throw new Error(await response.text());
      setAddModal(false);
      setMessage('');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(table: string, id: string) {
    if (!confirm('Delete this item?')) return;
    try {
      await del(`${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`);
      await load();
    } catch {
      alert('Delete failed');
    }
  }

  async function toggleTest(test: Test) {
    const response = await fetch(`${url}/rest/v1/tests?id=eq.${test.id}`, {
      method: 'PATCH', headers: jsonHeaders,
      body: JSON.stringify({ published: !test.published }),
    });
    if (response.ok) await load();
    else alert('Failed to change publication status');
  }

  function newQuestion(test: Test) {
    setQ({
      test_id: test.id,
      question_order: (questions[test.id]?.length || 0) + 1,
      question: '', option_a: '', option_b: '', option_c: '', option_d: '',
      correct_answer: 'A', points: 1,
    });
    setQuestionModal(true);
  }

  async function saveQuestion(event: React.FormEvent) {
    event.preventDefault();
    if (!q) return;
    setBusy(true);
    try {
      const response = await fetch(`${url}/rest/v1/test_questions`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ ...q, points: Math.max(0, Math.floor(Number(q.points) || 0)) }),
      });
      if (!response.ok) throw new Error(await response.text());
      setQuestionModal(false);
      setQ(null);
      await load();
    } catch {
      alert('Failed to save question');
    } finally {
      setBusy(false);
    }
  }

  function studentSubmission(assignmentId: string) {
    return submissions[assignmentId]?.find((submission) => String(submission.student_id) === String(studentId));
  }

  function openSubmit(assignment: Assignment) {
    if (studentSubmission(assignment.id!)) return;
    setSelectedAssignment(assignment);
    setSubmissionClass('');
    setSubmissionLink('');
    setSubmissionModal(true);
  }

  async function submitAssignment(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedAssignment?.id || !studentId || !submissionClass || !validUrl(submissionLink)) return;
    setBusy(true);
    try {
      const response = await fetch(`${url}/rest/v1/assignment_submissions`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ assignment_id: selectedAssignment.id, student_id: studentId, nickname: name, class: submissionClass.toUpperCase(), link: submissionLink.trim(), grade: null }),
      });
      if (!response.ok) throw new Error(await response.text());
      setSubmissionModal(false);
      await load();
      alert('Assignment submitted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  }

  async function undo(assignment: Assignment) {
    const submission = studentSubmission(assignment.id!);
    if (!submission?.id || !confirm('Undo your submission?')) return;
    try {
      await del(`${url}/rest/v1/assignment_submissions?id=eq.${submission.id}&student_id=eq.${studentId}`);
      await load();
    } catch {
      alert('Failed to undo submission');
    }
  }

  async function saveGrade(submission: Submission) {
    const grade = Math.max(0, Math.min(100, Math.trunc(Number(gradeInputs[submission.id!] ?? submission.grade ?? 0))));
    const response = await fetch(`${url}/rest/v1/assignment_submissions?id=eq.${submission.id}`, {
      method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ grade }),
    });
    if (response.ok) await load();
    else alert('Grade must be between 0 and 100');
  }

  if (loading) {
    return <><Navbar /><div className="flex min-h-[80vh] items-center justify-center"><Loader2 className="size-8 animate-spin" /></div></>;
  }

  if (error) {
    return <><Navbar /><main className="container mx-auto p-6"><Card><CardContent className="py-12 text-center"><FileText className="mx-auto mb-3 size-10" /><h1 className="text-xl font-semibold">{error}</h1></CardContent></Card></main></>;
  }

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
          {courses.map((course) => {
            if (!course.id) return null;
            const id = course.id;
            const courseMaterials = materials[id] || [];
            const courseAssignments = assignments[id] || [];
            const courseTests = tests[id] || [];
            const isOpen = !!open[id];

            return (
              <Card key={id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <button className="flex items-center gap-2 font-semibold" onClick={() => setOpen((prev) => ({ ...prev, [id]: !prev[id] }))}>
                    {isOpen ? <ChevronUp /> : <ChevronDown />}<BookOpen className="size-4 text-primary" />{course.course_name}
                  </button>
                  {teacher && <div className="flex gap-2"><Button size="sm" onClick={() => { setSelectedCourse(course); setAddType('material'); setAddModal(true); }}><PlusCircle className="mr-1 size-4" />Add</Button><Button variant="ghost" size="sm" onClick={() => deleteItem('class_courses', id)}><Trash2 size={15} /></Button></div>}
                </CardHeader>

                {isOpen && (
                  <CardContent className="space-y-8 border-t pt-5">
                    <section>
                      <h3 className="mb-3 font-semibold">📚 Materials</h3>
                      {courseMaterials.length ? courseMaterials.map((material) => (
                        <div key={material.id} className="mb-2 flex items-center gap-3 rounded-lg border p-3">
                          <a href={material.link} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2"><LinkIcon className="size-4 text-primary" /><span className="truncate">{material.name}</span><ExternalLink className="ml-auto size-4" /></a>
                          {teacher && <Button variant="ghost" size="sm" onClick={() => deleteItem('course_materials', material.id!)}><Trash2 size={14} /></Button>}
                        </div>
                      )) : <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">No materials yet.</p>}
                    </section>

                    <section>
                      <h3 className="mb-1 font-semibold">📝 Assignments</h3>
                      <p className="mb-3 text-xs text-muted-foreground">{teacher ? 'Click an assignment to view submissions and grades.' : 'Click an assignment to submit or undo your submission.'}</p>
                      {courseAssignments.length ? courseAssignments.map((assignment) => {
                        const submission = studentSubmission(assignment.id!);
                        const list = submissions[assignment.id!] || [];
                        const assignmentOpen = !!openA[assignment.id!];
                        return (
                          <div key={assignment.id} className="mb-2 overflow-hidden rounded-lg border">
                            <button className="flex w-full items-start gap-3 p-4 text-left" onClick={() => teacher ? setOpenA((prev) => ({ ...prev, [assignment.id!]: !prev[assignment.id!] })) : submission ? undo(assignment) : openSubmit(assignment)}>
                              <ClipboardList className="size-5 text-primary" />
                              <div className="flex-1"><b>{assignment.name}</b><p className="text-sm text-muted-foreground">{assignment.description}</p>{assignment.due_date && <p className="mt-1 text-xs">Due: {displayDate(assignment.due_date)}</p>}{!teacher && submission && <p className="mt-2 text-xs text-primary"><RotateCcw className="mr-1 inline size-3" />Submitted — click to undo</p>}{!teacher && !submission && <p className="mt-2 text-xs text-primary">Click to submit →</p>}</div>
                              {teacher && (assignmentOpen ? <ChevronUp /> : <ChevronDown />)}
                            </button>
                            {teacher && assignmentOpen && <div className="border-t p-4">{list.length === 0 ? <p className="text-sm text-muted-foreground">No submissions yet.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>{list.map((item) => <tr key={item.id} className="border-b"><td className="p-2">{item.nickname}</td><td className="p-2">{item.class}</td><td className="p-2"><a className="text-primary" href={item.link} target="_blank" rel="noreferrer">Open</a></td><td className="p-2"><div className="flex justify-end gap-2"><Input className="w-20" type="number" min="0" max="100" value={gradeInputs[item.id!] ?? String(item.grade ?? '')} onChange={(event) => setGradeInputs((prev) => ({ ...prev, [item.id!]: event.target.value }))} /><Button size="sm" onClick={() => saveGrade(item)}><Save className="size-3" /></Button></div></td></tr>)}</tbody></table></div>}</div>}
                            {teacher && <div className="flex justify-end border-t p-2"><Button variant="ghost" size="sm" onClick={() => deleteItem('course_assignments', assignment.id!)}><Trash2 className="mr-1 size-3" />Delete</Button></div>}
                          </div>
                        );
                      }) : <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">No assignments yet.</p>}
                    </section>

                    <section>
                      <h3 className="mb-1 font-semibold">🧪 Tests</h3>
                      <p className="mb-3 text-xs text-muted-foreground">{teacher ? 'Create and publish tests for this course.' : 'Published tests for this course.'}</p>
                      {courseTests.length ? courseTests.map((test) => {
                        const qs = questions[test.id] || [];
                        const testOpen = !!openT[test.id];
                        return (
                          <div key={test.id} className="mb-2 overflow-hidden rounded-lg border">
                            <div className="flex items-start gap-3 p-4">
                              <div className="flex-1"><b>{test.title}</b>{test.description && <p className="text-sm text-muted-foreground">{test.description}</p>}<p className="text-xs text-muted-foreground">{qs.length} question{qs.length === 1 ? '' : 's'} · {test.published ? 'Published' : 'Draft'}</p>{!teacher && test.published && <Link href={`/dashboard/student/tests/${test.id}`}><Button size="sm" className="mt-3">Take Test</Button></Link>}</div>
                              {teacher && <div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => toggleTest(test)}>{test.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button><Button variant="ghost" size="sm" onClick={() => setOpenT((prev) => ({ ...prev, [test.id]: !prev[test.id] }))}>{testOpen ? <ChevronUp /> : <ChevronDown />}</Button><Button variant="ghost" size="sm" onClick={() => deleteItem('tests', test.id)}><Trash2 size={14} /></Button></div>}
                            </div>
                            {teacher && testOpen && <div className="space-y-2 border-t p-4">{qs.map((question, index) => <div key={question.id} className="rounded border p-3"><p className="font-medium">{index + 1}. {question.question}</p><p className="text-xs text-muted-foreground">A: {question.option_a} · B: {question.option_b} · C: {question.option_c} · D: {question.option_d} · Correct: {question.correct_answer} · {question.points} pts</p><Button variant="ghost" size="sm" onClick={() => deleteItem('test_questions', question.id!)}><Trash2 className="mr-1 size-3" />Delete</Button></div>)}<Button variant="outline" size="sm" onClick={() => newQuestion(test)}><PlusCircle className="mr-1 size-4" />Add Question</Button></div>}
                          </div>
                        );
                      }) : <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">No tests yet.</p>}
                    </section>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </main>

      {courseModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Create New Course</CardTitle></CardHeader><CardContent><form onSubmit={createCourse} className="space-y-3"><Input value={courseName} onChange={(event) => setCourseName(event.target.value)} placeholder="Course name" required /><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setCourseModal(false)} className="w-1/2">Cancel</Button><Button className="w-1/2" disabled={busy}>Create</Button></div></form></CardContent></Card></div>}

      {addModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Add to {selectedCourse?.course_name}</CardTitle></CardHeader><CardContent><form onSubmit={addItem} className="space-y-3"><select className="h-10 w-full rounded border bg-background px-2" value={addType} onChange={(event) => setAddType(event.target.value as AddType)}><option value="material">Material</option><option value="assignment">Assignment</option><option value="test">Test</option></select>{addType === 'material' && <><Input placeholder="Material name" value={materialName} onChange={(event) => setMaterialName(event.target.value)} required /><Input type="url" placeholder="https://..." value={materialLink} onChange={(event) => setMaterialLink(event.target.value)} required /></>}{addType === 'assignment' && <><Input placeholder="Assignment name" value={assignmentName} onChange={(event) => setAssignmentName(event.target.value)} required /><textarea className="w-full rounded border p-2" rows={4} placeholder="Description" value={assignmentDescription} onChange={(event) => setAssignmentDescription(event.target.value)} required /><Input placeholder="DD/MM/YYYY" value={assignmentDueDate} onChange={(event) => setAssignmentDueDate(event.target.value)} required /></>}{addType === 'test' && <><Input placeholder="Test title" value={testTitle} onChange={(event) => setTestTitle(event.target.value)} required /><textarea className="w-full rounded border p-2" rows={3} placeholder="Description" value={testDescription} onChange={(event) => setTestDescription(event.target.value)} /></>}{message && <p className="text-sm text-destructive">{message}</p>}<div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setAddModal(false)} className="w-1/2">Cancel</Button><Button className="w-1/2" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : 'Add'}</Button></div></form></CardContent></Card></div>}

      {questionModal && q && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-lg"><CardHeader><CardTitle>Add Question</CardTitle></CardHeader><CardContent><form onSubmit={saveQuestion} className="space-y-2"><Input placeholder="Question" value={q.question} onChange={(event) => setQ({ ...q, question: event.target.value })} required /><Input placeholder="A" value={q.option_a} onChange={(event) => setQ({ ...q, option_a: event.target.value })} required /><Input placeholder="B" value={q.option_b} onChange={(event) => setQ({ ...q, option_b: event.target.value })} required /><Input placeholder="C" value={q.option_c} onChange={(event) => setQ({ ...q, option_c: event.target.value })} required /><Input placeholder="D" value={q.option_d} onChange={(event) => setQ({ ...q, option_d: event.target.value })} required /><div className="grid grid-cols-2 gap-2"><select className="rounded border bg-background px-2" value={q.correct_answer} onChange={(event) => setQ({ ...q, correct_answer: event.target.value as Question['correct_answer'] })}><option>A</option><option>B</option><option>C</option><option>D</option></select><Input type="number" min="0" value={q.points} onChange={(event) => setQ({ ...q, points: Number(event.target.value) })} /></div><div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={() => setQuestionModal(false)}>Cancel</Button><Button className="w-1/2" disabled={busy}>Save Question</Button></div></form></CardContent></Card></div>}

      {submissionModal && selectedAssignment && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Submit Assignment</CardTitle></CardHeader><CardContent><form onSubmit={submitAssignment} className="space-y-3"><Input value={name} disabled /><Input placeholder="Class e.g. 8A" value={submissionClass} onChange={(event) => setSubmissionClass(event.target.value)} required /><Input type="url" placeholder="Submission link" value={submissionLink} onChange={(event) => setSubmissionLink(event.target.value)} required /><div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={() => setSubmissionModal(false)}>Cancel</Button><Button className="w-1/2" disabled={busy}>Submit Work</Button></div></form></CardContent></Card></div>}
    </>
  );
}
