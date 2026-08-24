'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, BookOpen, FileText, Loader2, PlusCircle } from 'lucide-react';
import CourseSection from './components/CourseSection';
import MaterialSection from './components/MaterialSection';
import AssignmentSection from './components/AssignmentSection';
import TestsSection from './components/TestsSection';
import TestMaker from './components/TestMaker';
import QuestionModal, { type QuestionFormState } from './components/QuestionModal';
import SubmissionModal from './components/SubmissionModal';
import type { AddType, Assignment, Course, Material, Question, Submission, Test } from './components/types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const jsonHeaders = { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' };

const emptyQuestion: QuestionFormState = { questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', questionType: 'multiple-choice', correctAnswer: 'A' };

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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>({});
  const [openAssignments, setOpenAssignments] = useState<Record<string, boolean>>({});
  const [openTests, setOpenTests] = useState<Record<string, boolean>>({});
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [courseModal, setCourseModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseError, setCourseError] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [addType, setAddType] = useState<AddType>('material');
  const [materialName, setMaterialName] = useState('');
  const [materialLink, setMaterialLink] = useState('');
  const [assignmentName, setAssignmentName] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');
  const [linkCheckStatus, setLinkCheckStatus] = useState<'idle' | 'checking' | 'safe' | 'unsafe' | 'error'>('idle');
  const [linkCheckReason, setLinkCheckReason] = useState('');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderTest, setBuilderTest] = useState<Test | null>(null);
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testDueDate, setTestDueDate] = useState('');
  const [questionModal, setQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(emptyQuestion);
  const [submissionModal, setSubmissionModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionClass, setSubmissionClass] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');

  async function get<T>(u: string): Promise<T> { const response = await fetch(u, { headers, cache: 'no-store' }); const text = await response.text(); if (!response.ok) throw new Error(text || `Request failed (${response.status})`); return text ? JSON.parse(text) : []; }
  async function del(u: string) { const response = await fetch(u, { method: 'DELETE', headers }); if (!response.ok) throw new Error((await response.text()) || `Delete failed (${response.status})`); }
  async function patch(u: string, body: unknown) { const response = await fetch(u, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(body) }); if (!response.ok) throw new Error((await response.text()) || `Update failed (${response.status})`); }
  const validUrl = (value: string) => { try { const parsed = new URL(value.trim()); return parsed.protocol === 'http:' || parsed.protocol === 'https:'; } catch { return false; } };
  const parseDate = (value: string) => { const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!match) return null; const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])); return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1]) ? date : null; };
  const dbDate = (value: string) => { const date = parseDate(value); if (!date) return null; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
  const displayDate = (value?: string | null) => value ? value.split('-').reverse().join('/') : '';
  const pointsFor = (count: number) => count > 0 ? 100 / count : 0;
  const formatPoints = (count: number) => Number(pointsFor(count).toFixed(2));
  const questionTypeLabel = (type?: Question['question_type']) => ({ 'true-false': 'True / False', 'fill-blank': 'Fill in the Blank', matching: 'Matching', 'multiple-choice': 'Multiple Choice' }[type || 'multiple-choice'] || 'Multiple Choice');

  useEffect(() => { try { const raw = localStorage.getItem('current_user'); if (!raw) return; const u = JSON.parse(raw); setStudentId(String(u.student_id ?? u.id ?? u.user_id ?? u.uid ?? u.user?.student_id ?? u.user?.id ?? '')); setName(String(u.fullName ?? u.full_name ?? u.name ?? u.user?.fullName ?? u.user?.full_name ?? '')); setTeacher(String(u.role ?? u.user?.role ?? '').toLowerCase() === 'teacher'); } catch {} }, []);

  async function load() {
    if (!code) return;
    setLoading(true); setError('');
    try {
      const classes = await get<any[]>(`${url}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(code)}&select=*`);
      if (!classes[0]) throw new Error('Class not found');
      setClassName(classes[0].class_name || ''); setSchool(classes[0].school_name || '');
      const cs = await get<Course[]>(`${url}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(code)}&select=*&order=id.asc`);
      const mm: Record<string, Material[]> = {}; const aa: Record<string, Assignment[]> = {}; const tt: Record<string, Test[]> = {}; const qq: Record<string, Question[]> = {}; const ss: Record<string, Submission[]> = {};
      for (const course of cs) {
        if (!course.id) continue;
        mm[course.id] = await get<Material[]>(`${url}/rest/v1/course_materials?course_id=eq.${encodeURIComponent(course.id)}&select=*`).catch(() => []);
        aa[course.id] = await get<Assignment[]>(`${url}/rest/v1/course_assignments?course_id=eq.${encodeURIComponent(course.id)}&select=*&order=created_at.asc`).catch(() => []);
        tt[course.id] = await get<Test[]>(`${url}/rest/v1/tests?course_id=eq.${encodeURIComponent(course.id)}${teacher ? '' : '&published=eq.true'}&select=*&order=created_at.asc`).catch(() => []);
        for (const test of tt[course.id]) qq[test.id] = await get<Question[]>(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(test.id)}&select=*&order=question_order.asc`).catch(() => []);
        for (const assignment of aa[course.id]) { if (!assignment.id) continue; const filter = teacher ? `assignment_id=eq.${encodeURIComponent(assignment.id)}` : `assignment_id=eq.${encodeURIComponent(assignment.id)}&student_id=eq.${encodeURIComponent(studentId)}`; ss[assignment.id] = await get<Submission[]>(`${url}/rest/v1/assignment_submissions?${filter}&select=*`).catch(() => []); }
      }
      setCourses(cs); setMaterials(mm); setAssignments(aa); setTests(tt); setQuestions(qq); setSubmissions(ss);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load class'); } finally { setLoading(false); }
  }
  useEffect(() => { if (code) void load(); }, [code, teacher, studentId]);

  async function deleteItem(table: string, id: string) { if (!id || !confirm('Delete this item?')) return; try { await del(`${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`); await load(); } catch (e) { alert(e instanceof Error ? e.message : 'Failed to delete item.'); } }
  async function createCourse(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); if (!courseName.trim() || busy) return; setBusy(true); setCourseError(''); try { const response = await fetch(`${url}/rest/v1/class_courses`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ course_name: courseName.trim(), class_code: code }) }); if (!response.ok) throw new Error(await response.text()); setCourseName(''); setCourseModal(false); await load(); } catch (e) { setCourseError(e instanceof Error ? e.message : 'Failed to create course.'); } finally { setBusy(false); } }
  async function checkMaterialLink(value: string) { setLinkCheckStatus('checking'); setLinkCheckReason('Gemini is checking this link...'); try { const response = await fetch('/api/moderate-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: value.trim() }) }); const result = await response.json().catch(() => ({})); if (!response.ok) { setLinkCheckStatus('error'); setLinkCheckReason(result?.reason || 'The link could not be checked.'); return false; } if (result?.safe === true) { setLinkCheckStatus('safe'); setLinkCheckReason(result.reason || 'Link passed the Gemini safety check.'); return true; } setLinkCheckStatus('unsafe'); setLinkCheckReason(result?.reason || 'This link is not allowed as classroom material.'); return false; } catch { setLinkCheckStatus('error'); setLinkCheckReason('The link could not be checked. Please try again.'); return false; } }
  async function addItem(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); if (!selectedCourse?.id || busy) return; setBusy(true); setMessage(''); try { if (addType === 'material') { if (!materialName.trim() || !validUrl(materialLink)) throw new Error('Enter a valid material name and link.'); if (!(await checkMaterialLink(materialLink))) return; const response = await fetch(`${url}/rest/v1/course_materials`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ course_id: selectedCourse.id, name: materialName.trim(), link: materialLink.trim() }) }); if (!response.ok) throw new Error(await response.text()); } else { const due = dbDate(assignmentDueDate); if (!assignmentName.trim() || !assignmentDescription.trim() || !due) throw new Error('Enter a valid due date as DD/MM/YYYY.'); const response = await fetch(`${url}/rest/v1/course_assignments`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ course_id: selectedCourse.id, name: assignmentName.trim(), description: assignmentDescription.trim(), due_date: due }) }); if (!response.ok) throw new Error(await response.text()); } setAddModal(false); setMaterialName(''); setMaterialLink(''); setAssignmentName(''); setAssignmentDescription(''); setAssignmentDueDate(''); setLinkCheckStatus('idle'); setLinkCheckReason(''); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Failed to add item.'); } finally { setBusy(false); } }

  async function createTest(course: Course) { if (!course.id || busy) return; setBusy(true); setMessage(''); try { const response = await fetch(`${url}/rest/v1/tests`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ course_id: course.id, title: 'Untitled Test', description: null, due_date: null, published: false }) }); const text = await response.text(); if (!response.ok) throw new Error(text); const created = text ? JSON.parse(text) : null; const test = Array.isArray(created) ? created[0] : created; if (!test?.id) throw new Error('Test was created but its ID was not returned.'); openBuilder(test as Test); await load(); } catch (e) { alert(e instanceof Error ? e.message : 'Failed to create test.'); } finally { setBusy(false); } }
  function openBuilder(test: Test) { setBuilderTest(test); setTestTitle(test.title || ''); setTestDescription(test.description || ''); setTestDueDate(displayDate(test.due_date)); setMessage(''); setBuilderOpen(true); }
  async function saveTestDetails() { if (!builderTest || !testTitle.trim()) { setMessage('Test title is required.'); return; } const due = dbDate(testDueDate); if (!due) { setMessage('Enter a valid due date as DD/MM/YYYY.'); return; } setBusy(true); try { await patch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(builderTest.id)}`, { title: testTitle.trim(), description: testDescription.trim() || null, due_date: due }); setBuilderTest({ ...builderTest, title: testTitle.trim(), description: testDescription.trim() || null, due_date: due }); setMessage('Test details saved.'); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Failed to save test details.'); } finally { setBusy(false); } }
  function openNewQuestion() { if (!builderTest) return; setEditingQuestion(null); setQuestionForm({ ...emptyQuestion }); setMessage(''); setQuestionModal(true); }
  function openEditQuestion(question: Question) { setEditingQuestion(question); setQuestionForm({ questionText: question.question, optionA: question.option_a || '', optionB: question.option_b || '', optionC: question.option_c || '', optionD: question.option_d || '', questionType: question.question_type || 'multiple-choice', correctAnswer: question.correct_answer || 'A' }); setMessage(''); setQuestionModal(true); }
  async function rebalanceQuestions(testId: string) { const qs = await get<Question[]>(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(testId)}&select=*&order=question_order.asc`).catch(() => []); const points = pointsFor(qs.length); for (let i = 0; i < qs.length; i++) if (qs[i].id) await patch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(qs[i].id)}`, { question_order: i + 1, points }); }
  async function saveQuestion(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); if (!builderTest) return; const f = questionForm; if (!f.questionText.trim()) { setMessage('Question text is required.'); return; } if (f.questionType === 'multiple-choice' && (!f.optionA.trim() || !f.optionB.trim() || !f.optionC.trim() || !f.optionD.trim())) { setMessage('Multiple choice questions require all four answers.'); return; } if ((f.questionType === 'fill-blank' || f.questionType === 'matching') && (!f.optionA.trim() || (f.questionType === 'matching' && !f.optionB.trim()))) { setMessage('Fill in the required answer fields.'); return; } setBusy(true); setMessage(''); try { const body = { test_id: builderTest.id, question: f.questionText.trim(), question_type: f.questionType, option_a: f.questionType === 'true-false' ? 'True' : f.optionA.trim(), option_b: f.questionType === 'true-false' ? 'False' : f.optionB.trim(), option_c: f.questionType === 'multiple-choice' ? f.optionC.trim() : '', option_d: f.questionType === 'multiple-choice' ? f.optionD.trim() : '', correct_answer: f.questionType === 'true-false' ? (f.correctAnswer === 'B' ? 'B' : 'A') : f.questionType === 'matching' ? 'B' : f.questionType === 'fill-blank' ? 'A' : f.correctAnswer, question_order: editingQuestion?.question_order ?? ((questions[builderTest.id]?.length || 0) + 1), points: 0 }; if (editingQuestion?.id) await patch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(editingQuestion.id)}`, body); else { const response = await fetch(`${url}/rest/v1/test_questions`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) }); if (!response.ok) throw new Error(await response.text()); } await rebalanceQuestions(builderTest.id); setQuestionModal(false); setEditingQuestion(null); setQuestionForm({ ...emptyQuestion }); await load(); } catch (e) { alert(e instanceof Error ? e.message : 'Failed to save question.'); } finally { setBusy(false); } }
  async function deleteQuestion(question: Question) { if (!question.id || !confirm('Delete this question?')) return; try { await del(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(question.id)}`); await rebalanceQuestions(question.test_id); await load(); } catch { alert('Failed to delete question.'); } }
  async function deleteTest(test: Test) { if (!confirm(`Delete "${test.title}"?`)) return; try { await del(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`); await load(); } catch { alert('Failed to delete test.'); } }
  async function toggleTest(test: Test) { if (!test.published && (!test.title.trim() || !test.due_date || !(questions[test.id] || []).length)) { alert('Finish the test in Test Maker first: add a title, due date, and at least one question.'); return; } try { await patch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`, { published: !test.published }); await load(); } catch { alert('Failed to change publication status.'); } }
  const studentSubmission = (id: string) => submissions[id]?.find(s => String(s.student_id) === String(studentId));
  function openSubmit(assignment: Assignment) { if (studentSubmission(assignment.id!)) return; setSelectedAssignment(assignment); setSubmissionClass(''); setSubmissionLink(''); setSubmissionModal(true); }
  async function submitAssignment(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); if (!selectedAssignment?.id || !studentId || !submissionClass.trim() || !validUrl(submissionLink)) return; setBusy(true); try { const response = await fetch(`${url}/rest/v1/assignment_submissions`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ assignment_id: selectedAssignment.id, student_id: studentId, nickname: name, class: submissionClass.toUpperCase(), link: submissionLink.trim(), grade: null }) }); if (!response.ok) throw new Error(await response.text()); setSubmissionModal(false); await load(); } catch (e) { alert(e instanceof Error ? e.message : 'Submission failed.'); } finally { setBusy(false); } }
  async function undoSubmission(assignment: Assignment) { const submission = studentSubmission(assignment.id!); if (!submission?.id || !confirm('Undo your submission?')) return; try { await del(`${url}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(submission.id)}&student_id=eq.${encodeURIComponent(studentId)}`); await load(); } catch { alert('Failed to undo submission.'); } }
  async function saveGrade(submission: Submission) { if (!submission.id) return; const raw = Number(gradeInputs[submission.id] ?? submission.grade ?? 0); if (!Number.isFinite(raw) || raw < 0 || raw > 100) { alert('Grade must be between 0 and 100.'); return; } try { await patch(`${url}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(submission.id)}`, { grade: Math.trunc(raw) }); await load(); } catch { alert('Failed to save grade.'); } }

  if (loading) return <><Navbar /><div className="flex min-h-[80vh] items-center justify-center"><Loader2 className="size-8 animate-spin" /></div></>;
  if (error) return <><Navbar /><main className="container mx-auto p-6"><Card><CardContent className="py-12 text-center"><FileText className="mx-auto mb-3 size-10" /><h1 className="text-xl font-semibold">{error}</h1></CardContent></Card></main></>;

  return <>
    <Navbar />
    <main className="container mx-auto space-y-8 px-6 py-8">
      <Link href={teacher ? '/dashboard/teacher' : '/dashboard/student'}><Button variant="ghost" className="gap-2"><ArrowLeft className="size-4" />Back to Dashboard</Button></Link>
      <div className="flex items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">{className}</h1><p className="text-sm text-muted-foreground">School: {school} · Code: <b className="font-mono text-primary">{code}</b></p></div>{teacher && <Button type="button" onClick={() => { setCourseName(''); setCourseError(''); setCourseModal(true); }}><PlusCircle className="mr-2 size-4" />Create New Course</Button>}</div>
      <div className="space-y-3">
        {courses.length === 0 && teacher && <Card><CardContent className="py-10 text-center"><BookOpen className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="text-muted-foreground">No courses yet.</p></CardContent></Card>}
        {courses.map(course => course.id && <CourseSection key={course.id} course={course} isOpen={!!openCourses[course.id]} teacher={teacher} onToggle={() => setOpenCourses(p => ({ ...p, [course.id!]: !p[course.id!] }))} onAdd={() => { setSelectedCourse(course); setAddType('material'); setMessage(''); setLinkCheckStatus('idle'); setLinkCheckReason(''); setAddModal(true); }} onDelete={() => deleteItem('class_courses', course.id!)}>
          <MaterialSection materials={materials[course.id] || []} teacher={teacher} onDelete={id => deleteItem('course_materials', id)} />
          <AssignmentSection assignments={assignments[course.id] || []} submissions={submissions} teacher={teacher} studentId={studentId} gradeInputs={gradeInputs} setGradeInputs={setGradeInputs} open={openAssignments} setOpen={setOpenAssignments} displayDate={displayDate} onSubmit={openSubmit} onUndo={undoSubmission} onDelete={id => deleteItem('course_assignments', id)} onSaveGrade={saveGrade} />
          <TestsSection tests={tests[course.id] || []} questions={questions} teacher={teacher} open={openTests} busy={busy} displayDate={displayDate} formatPoints={formatPoints} questionTypeLabel={questionTypeLabel} onCreate={() => createTest(course)} onTogglePublish={toggleTest} onEdit={openBuilder} onDelete={deleteTest} onToggleQuestions={id => setOpenTests(p => ({ ...p, [id]: !p[id] }))} onEditQuestion={openEditQuestion} onDeleteQuestion={deleteQuestion} />
        </CourseSection>)}
      </div>
    </main>

    {courseModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Create New Course</CardTitle></CardHeader><CardContent><form onSubmit={createCourse} className="space-y-4"><Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="e.g. Mathematics" autoFocus disabled={busy} />{courseError && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><b>Could not create course</b><p className="mt-1 break-words">{courseError}</p></div>}<div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" disabled={busy} onClick={() => setCourseModal(false)}>Cancel</Button><Button type="submit" className="w-1/2" disabled={busy || !courseName.trim()}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : 'Create'}</Button></div></form></CardContent></Card></div>}
    {addModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Add to {selectedCourse?.course_name}</CardTitle></CardHeader><CardContent><form onSubmit={addItem} className="space-y-3"><select className="h-10 w-full rounded border bg-background px-2" value={addType} onChange={e => setAddType(e.target.value as AddType)}><option value="material">Material</option><option value="assignment">Assignment</option></select>{addType === 'material' ? <><Input placeholder="Material name" value={materialName} onChange={e => { setMaterialName(e.target.value); setLinkCheckStatus('idle'); }} required /><Input type="url" placeholder="https://..." value={materialLink} onChange={e => { setMaterialLink(e.target.value); setLinkCheckStatus('idle'); setLinkCheckReason(''); }} required />{materialLink && validUrl(materialLink) && <div className="rounded-md border bg-muted/30 p-3 text-sm">{linkCheckStatus === 'idle' && <span className="text-muted-foreground">Gemini Link Safety will automatically check this link when you press Add.</span>}{linkCheckStatus === 'checking' && <span>Gemini is checking this link...</span>}{linkCheckStatus === 'safe' && <span className="text-green-600">✓ {linkCheckReason}</span>}{(linkCheckStatus === 'unsafe' || linkCheckStatus === 'error') && <span className="text-red-600">✕ {linkCheckReason}</span>}</div>}</> : <><Input placeholder="Assignment name" value={assignmentName} onChange={e => setAssignmentName(e.target.value)} required /><textarea className="w-full rounded border bg-background p-2" rows={4} placeholder="Description" value={assignmentDescription} onChange={e => setAssignmentDescription(e.target.value)} required /><Input placeholder="DD/MM/YYYY" value={assignmentDueDate} onChange={e => setAssignmentDueDate(e.target.value)} required /></>}{message && <p className="text-sm text-destructive">{message}</p>}<div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={() => setAddModal(false)}>Cancel</Button><Button type="submit" className="w-1/2" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : 'Add'}</Button></div></form></CardContent></Card></div>}
    {builderOpen && builderTest && <TestMaker title={testTitle} setTitle={setTestTitle} description={testDescription} setDescription={setTestDescription} dueDate={testDueDate} setDueDate={setTestDueDate} questions={questions[builderTest.id] || []} busy={busy} message={message} onSaveDetails={saveTestDetails} onAddQuestion={openNewQuestion} onEditQuestion={q => openEditQuestion(q as Question)} onDeleteQuestion={q => q.id && deleteQuestion({ ...q, test_id: builderTest.id, question_order: 0 })} onClose={() => { setBuilderOpen(false); setMessage(''); }} pointsFor={formatPoints} />}
    <QuestionModal open={questionModal} editing={!!editingQuestion} form={questionForm} setForm={setQuestionForm} onSubmit={saveQuestion} onClose={() => setQuestionModal(false)} busy={busy} message={message} />
    {submissionModal && selectedAssignment && <SubmissionModal name={name} className={submissionClass} setClassName={setSubmissionClass} link={submissionLink} setLink={setSubmissionLink} busy={busy} onSubmit={submitAssignment} onCancel={() => setSubmissionModal(false)} />}
  </>;
}
