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
  ArrowLeft, BookOpen, ChevronDown, ChevronUp, ClipboardList, ExternalLink,
  Eye, EyeOff, FileText, Link as LinkIcon, Loader2, PlusCircle, RotateCcw,
  Save, Trash2
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

  const [courseModal, setCourseModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [busy, setBusy] = useState(false);

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
    const r = await fetch(u, { headers, cache: 'no-store' });
    const text = await r.text();
    if (!r.ok) throw new Error(text);
    return text ? JSON.parse(text) : [];
  }

  async function del(u: string) {
    const r = await fetch(u, { method: 'DELETE', headers });
    if (!r.ok) throw new Error(await r.text());
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
        mm[c.id] = await get<Material[]>(`${url}/rest/v1/course_materials?course_id=eq.${c.id}&select=*`).catch(() => []);
        aa[c.id] = await get<Assignment[]>(`${url}/rest/v1/course_assignments?course_id=eq.${c.id}&select=*&order=created_at.asc`).catch(() => []);
        tt[c.id] = await get<Test[]>(`${url}/rest/v1/tests?course_id=eq.${c.id}&select=*&order=created_at.asc`).catch(() => []);
        for (const t of tt[c.id]) {
          qq[t.id] = await get<Question[]>(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(t.id)}&select=*&order=question_order.asc`).catch(() => []);
        }
        for (const a of aa[c.id]) {
          if (!a.id) continue;
          const filter = teacher
            ? `assignment_id=eq.${a.id}`
            : `assignment_id=eq.${a.id}&student_id=eq.${encodeURIComponent(studentId)}`;
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
      } else if (addType === 'assignment') {
        const due = dbDate(assignmentDueDate);
        if (!assignmentName.trim() || !assignmentDescription.trim() || !due) throw new Error('Enter a valid due date as DD/MM/YYYY');
        const r = await fetch(`${url}/rest/v1/course_assignments`, {
          method: 'POST', headers: jsonHeaders,
          body: JSON.stringify({ course_id: selectedCourse.id, name: assignmentName.trim(), description: assignmentDescription.trim(), due_date: due })
        });
        if (!r.ok) throw new Error(await r.text());
      } else {
        if (!testTitle.trim()) throw new Error('Enter a test title');
        const r = await fetch(`${url}/rest/v1/tests`, {
          method: 'POST', headers: jsonHeaders,
          body: JSON.stringify({ course_id: selectedCourse.id, class_code: code.toUpperCase(), title: testTitle.trim(), description: testDescription.trim() || null, published: false })
        });
        if (!r.ok) throw new Error(await r.text());
      }
      setAddModal(false);
      setTestTitle('');
      setTestDescription('');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to add item');
    } finally {
      setBusy(false);
    }
  }

  async function rebalanceQuestions(testId: string) {
    const qs = await get<Question[]>(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(testId)}&select=*&order=question_order.asc`).catch(() => []);
    const points = qs.length ? 100 / qs.length : 0;
    for (let i = 0; i < qs.length; i++) {
      await fetch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(qs[i].id!)}`, {
        method: 'PATCH', headers: jsonHeaders,
        body: JSON.stringify({ question_order: i + 1, points })
      });
    }
  }

  async function deleteItem(table: string, id: string) {
    if (!confirm('Delete this item?')) return;
    try {
      await del(`${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`);
      if (table === 'test_questions') await rebalanceQuestions(id);
      await load();
    } catch {
      alert('Delete failed');
    }
  }

  async function toggleTest(t: Test) {
    const r = await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(t.id)}`, {
      method: 'PATCH', headers: jsonHeaders,
      body: JSON.stringify({ published: !t.published })
    });
    if (r.ok) await load(); else alert('Failed to change publication status');
  }

  function openTestMaker(course: Course) {
    setSelectedCourse(course);
    setAddType('test');
    setMessage('');
    setAddModal(true);
  }

  function newQuestion(t: Test) {
    setQ({
      test_id: t.id,
      question_order: (questions[t.id]?.length || 0) + 1,
      question: '', option_a: '', option_b: '', option_c: '', option_d: '',
      correct_answer: 'A', points: 0
    });
    setQuestionModal(true);
  }

  async function saveQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!q) return;
    setBusy(true);
    try {
      const r = await fetch(`${url}/rest/v1/test_questions`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ ...q, points: 0 })
      });
      if (!r.ok) throw new Error(await r.text());
      await rebalanceQuestions(q.test_id);
      setQuestionModal(false);
      setQ(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save question');
    } finally {
      setBusy(false);
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
    const g = Math.max(0, Math.min(100, Math.trunc(Number(gradeInputs[s.id!] ?? s.grade ?? 0))));
    const r = await fetch(`${url}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(s.id!)}`, {
      method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ grade: g })
    });
    if (r.ok) await load(); else alert('Grade must be between 0 and 100');
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
                    <Button size="sm" variant="outline" onClick={() => openTestMaker(c)}>Test Maker</Button>
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
                    <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">🧪 Tests</h3><p className="text-xs text-muted-foreground">{teacher ? 'Create, edit and publish tests for this course.' : 'Published tests for this course.'}</p></div></div>
                    {tt.length ? tt.map(t => {
                      const qs = questions[t.id] || [];
                      const points = qs.length ? 100 / qs.length : 0;
                      return <div key={t.id} className="mb-2 overflow-hidden rounded-lg border">
                        <div className="flex items-start gap-3 p-4"><div className="flex-1"><b>{t.title}</b>{t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}<p className="text-xs text-muted-foreground">{qs.length} question{qs.length === 1 ? '' : 's'} · {t.published ? 'Published' : 'Draft'}{qs.length ? ` · ${Number(points.toFixed(2))} points/question` : ''}</p>{!teacher && t.published && <Link href={`/dashboard/student/tests/${t.id}`}><Button size="sm" className="mt-3">Take Test</Button></Link>}</div>
                          {teacher && <div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => toggleTest(t)}>{t.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button><Button variant="ghost" size="sm" onClick={() => setOpenT(p => ({ ...p, [t.id]: !p[t.id] }))}>{openT[t.id] ? <ChevronUp /> : <ChevronDown />}</Button><Button variant="ghost" size="sm" onClick={() => deleteItem('tests', t.id)}><Trash2 size={14} /></Button></div>}
                        </div>
                        {teacher && openT[t.id] && <div className="space-y-2 border-t p-4">{qs.map((question, i) => <div key={question.id} className="rounded border p-3"><p className="font-medium">{i + 1}. {question.question}</p><p className="text-xs text-muted-foreground">A: {question.option_a} · B: {question.option_b} · C: {question.option_c} · D: {question.option_d} · {Number(question.points.toFixed(2))} pts</p><Button variant="ghost" size="sm" onClick={() => deleteItem('test_questions', question.id!)}><Trash2 className="mr-1 size-3" />Delete</Button></div>)}<Button variant="outline" size="sm" onClick={() => newQuestion(t)}><PlusCircle className="mr-1 size-4" />Add Question</Button></div>}
                      </div>;
                    }) : <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">No tests yet.</p>}
                  </section>
                </CardContent>}
              </Card>
            );
          })}
        </div>
      </main>

      {courseModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Create New Course</CardTitle></CardHeader><CardContent><form onSubmit={createCourse} className="space-y-3"><Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Course name" required /><div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={() => setCourseModal(false)}>Cancel</Button><Button className="w-1/2" disabled={busy}>Create</Button></div></form></CardContent></Card></div>}

      {addModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>{addType === 'test' ? 'Test Maker' : `Add to ${selectedCourse?.course_name}`}</CardTitle></CardHeader><CardContent><form onSubmit={addItem} className="space-y-3">{addType !== 'test' && <select className="h-10 w-full rounded border bg-background px-2" value={addType} onChange={e => setAddType(e.target.value as AddType)}><option value="material">Material</option><option value="assignment">Assignment</option><option value="test">Test</option></select>}{addType === 'material' && <><Input placeholder="Material name" value={materialName} onChange={e => setMaterialName(e.target.value)} required /><Input type="url" placeholder="https://..." value={materialLink} onChange={e => setMaterialLink(e.target.value)} required /></>}{addType === 'assignment' && <><Input placeholder="Assignment name" value={assignmentName} onChange={e => setAssignmentName(e.target.value)} required /><textarea className="w-full rounded border p-2" rows={4} placeholder="Description" value={assignmentDescription} onChange={e => setAssignmentDescription(e.target.value)} required /><Input placeholder="DD/MM/YYYY" value={assignmentDueDate} onChange={e => setAssignmentDueDate(e.target.value)} required /></>}{addType === 'test' && <><Input placeholder="Test title" value={testTitle} onChange={e => setTestTitle(e.target.value)} required /><textarea className="w-full rounded border p-2" rows={3} placeholder="Description" value={testDescription} onChange={e => setTestDescription(e.target.value)} /><p className="text-xs text-muted-foreground">The test is worth 100 points total. Points per question are calculated automatically.</p></>}{message && <p className="text-sm text-destructive">{message}</p>}<div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={() => setAddModal(false)}>Cancel</Button><Button className="w-1/2" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : 'Create'}</Button></div></form></CardContent></Card></div>}

      {questionModal && q && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-lg"><CardHeader><CardTitle>Add Question</CardTitle></CardHeader><CardContent><form onSubmit={saveQuestion} className="space-y-2"><Input placeholder="Question" value={q.question} onChange={e => setQ({ ...q, question: e.target.value })} required /><Input placeholder="A" value={q.option_a} onChange={e => setQ({ ...q, option_a: e.target.value })} required /><Input placeholder="B" value={q.option_b} onChange={e => setQ({ ...q, option_b: e.target.value })} required /><Input placeholder="C" value={q.option_c} onChange={e => setQ({ ...q, option_c: e.target.value })} required /><Input placeholder="D" value={q.option_d} onChange={e => setQ({ ...q, option_d: e.target.value })} required /><div className="rounded border bg-muted/30 p-3 text-sm text-muted-foreground">Points are automatic: 100 total ÷ {Math.max(1, (questions[q.test_id]?.length || 0) + 1)} questions = {Number((100 / Math.max(1, (questions[q.test_id]?.length || 0) + 1)).toFixed(2))} points each.</div><div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={() => setQuestionModal(false)}>Cancel</Button><Button className="w-1/2" disabled={busy}>Save Question</Button></div></form></CardContent></Card></div>}

      {submissionModal && selectedAssignment && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Submit Assignment</CardTitle></CardHeader><CardContent><form onSubmit={submitAssignment} className="space-y-3"><Input value={name} disabled /><Input placeholder="Class e.g. 8A" value={submissionClass} onChange={e => setSubmissionClass(e.target.value)} required /><Input type="url" placeholder="Submission link" value={submissionLink} onChange={e => setSubmissionLink(e.target.value)} required /><div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={() => setSubmissionModal(false)}>Cancel</Button><Button className="w-1/2" disabled={busy}>Submit Work</Button></div></form></CardContent></Card></div>}
    </>
  );
}
