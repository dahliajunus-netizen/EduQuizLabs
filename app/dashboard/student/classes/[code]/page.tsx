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
  const dbDateTime = (value: string) => { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); };
  const displayDate = (value?: string | null) => {
    if (!value) return '';
    if (value.includes('T') || value.includes(':')) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    return value.split('-').reverse().join('/');
  };
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
  async function addItem(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); if (!selectedCourse?.id || busy) return; setBusy(true); setMessage(''); try { if (addType === 'material') { if (!materialName.trim() || !validUrl(materialLink)) throw new Error('Enter a valid material name and link.'); if (!(await checkMaterialLink(materialLink))) return; const response = await fetch(`${url}/rest/v1/course_materials`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ course_id: selectedCourse.id, name: materialName.trim(), link: materialLink.trim() }) }); if (!response.ok) throw new Error(await response.text()); } else { const due = dbDateTime(assignmentDueDate); if (!assignmentName.trim() || !assignmentDescription.trim() || !due) throw new Error('Enter a valid due date and time.'); const response = await fetch(`${url}/rest/v1/course_assignments`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ course_id: selectedCourse.id, name: assignmentName.trim(), description: assignmentDescription.trim(), due_date: due }) }); if (!response.ok) throw new Error(await response.text()); } setAddModal(false); setMaterialName(''); setMaterialLink(''); setAssignmentName(''); setAssignmentDescription(''); setAssignmentDueDate(''); setLinkCheckStatus('idle'); setLinkCheckReason(''); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Failed to add item.'); } finally { setBusy(false); } }

  async function createTest(course: Course) { if (!course.id || busy) return; setBusy(true); setMessage(''); try { const response = await fetch(`${url}/rest/v1/tests`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ course_id: course.id, title: 'Untitled Test', description: null, due_date: null, published: false }) }); const text = await response.text(); if (!response.ok) throw new Error(text); const created = text ? JSON.parse(text) : null; const test = Array.isArray(created) ? created[0] : created; if (!test?.id) throw new Error('Test was created but its ID was not returned.'); openBuilder(test as Test); await load(); } catch (e) { alert(e instanceof Error ? e.message : 'Failed to create test.'); } finally { setBusy(false); } }
  function openBuilder(test: Test) { setBuilderTest(test); setTestTitle(test.title || ''); setTestDescription(test.description || ''); setTestDueDate(displayDate(test.due_date)); setMessage(''); setBuilderOpen(true); }
  async function saveTestDetails() { if (!builderTest || !testTitle.trim()) { setMessage('Test title is required.'); return; } const due = dbDate(testDueDate); if (!due) { setMessage('Enter a valid due date as DD/MM/YYYY.'); return; } setBusy(true); try { await patch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(builderTest.id)}`, { title: testTitle.trim(), description: testDescription.trim() || null, due_date: due }); setBuilderTest({ ...builderTest, title: testTitle.trim(), description: testDescription.trim() || null, due_date: due }); setMessage('Test details saved.'); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Failed to save test details.'); } finally { setBusy(false); } }
  function openNewQuestion() { if (!builderTest) return; setEditingQuestion(null); setQuestionForm({ ...emptyQuestion }); setMessage(''); setQuestionModal(true); }
  function openEditQuestion(question: Question) { setEditingQuestion(question); setQuestionForm({ questionText: question.question, optionA: question.option_a || '', optionB: question.option_b || '', optionC: question.option_c || '', optionD: question.option_d || '', questionType: question.question_type || 'multiple-choice', correctAnswer: question.correct_answer || 'A' }); setMessage(''); setQuestionModal(true); }
  async function rebalanceQuestions(testId: string) { const qs = await get<Question[]>(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(testId)}&select=*&order=question_order.asc`).catch(() => []); const points = pointsFor(qs.length); for (let i = 0; i < qs.length; i++) if (qs[i].id) await patch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(qs[i].id)}`, { question_order: i + 1, points }); }
  async function saveQuestion(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); if (!builderTest || busy) return; if (!questionForm.questionText.trim()) { setMessage('Question text is required.'); return; } if (questionForm.questionType === 'multiple-choice' && [questionForm.optionA, questionForm.optionB, questionForm.optionC, questionForm.optionD].some(v => !v.trim())) { setMessage('Complete all four choices.'); return; } if ((questionForm.questionType === 'true-false') && !['A','B'].includes(questionForm.correctAnswer)) { setMessage('Choose True or False.'); return; } if (questionForm.questionType === 'fill-blank' && !questionForm.correctAnswer.trim()) { setMessage('Enter the correct answer.'); return; } setBusy(true); try { const payload = { test_id: builderTest.id, question_order: editingQuestion?.question_order ?? ((questions[builderTest.id] || []).length + 1), question: questionForm.questionText.trim(), option_a: questionForm.questionType === 'true-false' ? 'True' : questionForm.questionType === 'fill-blank' ? questionForm.correctAnswer.trim() : questionForm.optionA.trim(), option_b: questionForm.questionType === 'true-false' ? 'False' : questionForm.optionB.trim(), option_c: questionForm.questionType === 'multiple-choice' ? questionForm.optionC.trim() : '', option_d: questionForm.questionType === 'multiple-choice' ? questionForm.optionD.trim() : '', correct_answer: questionForm.correctAnswer.trim(), points: pointsFor(Math.max(1, editingQuestion ? (questions[builderTest.id] || []).length : (questions[builderTest.id] || []).length + 1)), question_type: questionForm.questionType }; if (editingQuestion?.id) await patch(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(editingQuestion.id)}`, payload); else { const response = await fetch(`${url}/rest/v1/test_questions`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(await response.text()); } setQuestionModal(false); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Failed to save question.'); } finally { setBusy(false); } }
  async function deleteQuestion(question: Question) { if (!question.id || !confirm('Delete this question?')) return; setBusy(true); try { await del(`${url}/rest/v1/test_questions?id=eq.${encodeURIComponent(question.id)}`); await rebalanceQuestions(question.test_id || builderTest?.id || ''); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Failed to delete question.'); } finally { setBusy(false); } }

  const activeCourses = courses.filter(course => (tests[course.id] || []).some(() => true) || (materials[course.id] || []).length || (assignments[course.id] || []).length || teacher);

  return <><Navbar /><main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6"><div className="flex items-center justify-between gap-3"><div><Link href={`/dashboard/${teacher ? 'teacher' : 'student'}`}><Button variant="outline" size="sm"><ArrowLeft className="mr-2 size-4"/>Back to Dashboard</Button></Link><h1 className="mt-4 text-3xl font-bold">{className || 'Class'}</h1><p className="text-muted-foreground">{school}</p></div>{teacher&&<Button type="button" onClick={()=>setCourseModal(true)}><PlusCircle className="mr-2 size-4"/>Create New Course</Button>}</div>
    {loading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin"/>Loading...</div>}
    {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    {courses.map(course => <Card key={course.id}><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><BookOpen className="size-5"/>{course.course_name}</CardTitle>{teacher&&<Button type="button" variant="outline" onClick={()=>{setSelectedCourse(course);setAddModal(true);}}> <PlusCircle className="mr-2 size-4"/>Add</Button>}</div></CardHeader><CardContent className="space-y-5"><MaterialSection materials={materials[course.id]||[]} teacher={teacher} onDelete={id=>deleteItem('course_materials',id)}/><AssignmentSection assignments={assignments[course.id]||[]} submissions={submissions} teacher={teacher} studentId={studentId} gradeInputs={gradeInputs} setGradeInputs={setGradeInputs} onGrade={async(id,grade)=>{const n=Math.max(0,Math.min(100,Number(grade)));if(!Number.isFinite(n))return;setBusy(true);try{await patch(`${url}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(id)}`,{grade:n});await load();}catch(e){setMessage(e instanceof Error?e.message:'Failed to grade.');}finally{setBusy(false);}}} onSubmit={a=>{setSelectedAssignment(a);setSubmissionClass('');setSubmissionLink('');setSubmissionModal(true);}} onUndo={async id=>{await deleteItem('assignment_submissions',id);}} onDelete={id=>deleteItem('course_assignments',id)}/><TestsSection tests={tests[course.id]||[]} questions={questions} teacher={teacher} open={openTests} busy={busy} displayDate={displayDate} formatPoints={formatPoints} questionTypeLabel={questionTypeLabel} onCreate={()=>createTest(course)} onTogglePublish={async test=>{try{setBusy(true);await patch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(test.id)}`,{published:!test.published});await load();}catch(e){setMessage(e instanceof Error?e.message:'Failed to update test.');}finally{setBusy(false);}}} onEdit={openBuilder} onDelete={test=>deleteItem('tests',test.id)} onToggleQuestions={id=>setOpenTests(v=>({...v,[id]:!v[id]}))} onEditQuestion={openEditQuestion} onDeleteQuestion={deleteQuestion}/></CardContent></Card>)}
    {courseModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Create New Course</CardTitle></CardHeader><CardContent><form onSubmit={createCourse} className="space-y-4"><Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="e.g. Mathematics" autoFocus disabled={busy} />{courseError && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><b>Could not create course</b><p className="mt-1 break-words">{courseError}</p></div>}<div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" disabled={busy} onClick={() => setCourseModal(false)}>Cancel</Button><Button type="submit" className="w-1/2" disabled={busy || !courseName.trim()}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : 'Create'}</Button></div></form></CardContent></Card></div>}
    {addModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Add to {selectedCourse?.course_name}</CardTitle></CardHeader><CardContent><form onSubmit={addItem} className="space-y-3"><select className="h-10 w-full rounded border bg-background px-2" value={addType} onChange={e => setAddType(e.target.value as AddType)}><option value="material">Material</option><option value="assignment">Assignment</option></select>{addType === 'material' ? <><Input placeholder="Material name" value={materialName} onChange={e => { setMaterialName(e.target.value); setLinkCheckStatus('idle'); }} required /><Input type="url" placeholder="https://..." value={materialLink} onChange={e => { setMaterialLink(e.target.value); setLinkCheckStatus('idle'); setLinkCheckReason(''); }} required />{materialLink && validUrl(materialLink) && <div className="rounded-md border bg-muted/30 p-3 text-sm">{linkCheckStatus === 'idle' && <span className="text-muted-foreground">Gemini Link Safety will automatically check this link when you press Add.</span>}{linkCheckStatus === 'checking' && <span>Gemini is checking this link...</span>}{linkCheckStatus === 'safe' && <span className="text-green-600">✓ {linkCheckReason}</span>}{(linkCheckStatus === 'unsafe' || linkCheckStatus === 'error') && <span className="text-red-600">✕ {linkCheckReason}</span>}</div>}</> : <><Input placeholder="Assignment name" value={assignmentName} onChange={e => setAssignmentName(e.target.value)} required /><textarea className="w-full rounded border bg-background p-2" rows={4} placeholder="Description" value={assignmentDescription} onChange={e => setAssignmentDescription(e.target.value)} required /><div><label className="mb-1 block text-sm font-medium">Due date & time</label><Input type="datetime-local" value={assignmentDueDate} onChange={e => setAssignmentDueDate(e.target.value)} required /><p className="mt-1 text-xs text-muted-foreground">Set the exact deadline, including hour and minute.</p></div></>}{message && <p className="text-sm text-destructive">{message}</p>}<div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={() => setAddModal(false)}>Cancel</Button><Button type="submit" className="w-1/2" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : 'Add'}</Button></div></form></CardContent></Card></div>}
    {builderOpen && builderTest && <TestMaker title={testTitle} setTitle={setTestTitle} description={testDescription} setDescription={setTestDescription} dueDate={testDueDate} setDueDate={setTestDueDate} questions={questions[builderTest.id] || []} busy={busy} message={message} onSaveDetails={saveTestDetails} onAddQuestion={openNewQuestion} onEditQuestion={q => openEditQuestion(q as Question)} onDeleteQuestion={q => q.id && deleteQuestion({ ...q, test_id: builderTest.id, question_order: 0 })} onClose={() => { setBuilderOpen(false); setMessage(''); }} pointsFor={formatPoints} testId={builderTest.id} />}
    <QuestionModal open={questionModal} editing={!!editingQuestion} form={questionForm} setForm={setQuestionForm} onSubmit={saveQuestion} onClose={() => setQuestionModal(false)} busy={busy} message={message} />
    {submissionModal && selectedAssignment && <SubmissionModal name={name} className={submissionClass} setClassName={setSubmissionClass} link={submissionLink} setLink={setSubmissionLink} busy={busy} onSubmit={submitAssignment} onCancel={() => setSubmissionModal(false)} />}
  </main></>;
}
