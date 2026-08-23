'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronUp, ClipboardList, Copy,
  ExternalLink, FileText, Eye, EyeOff, Link as LinkIcon, Loader2,
  PlusCircle, RotateCcw, Save, ShieldAlert, ShieldCheck, Trash2, X,
} from 'lucide-react';

type ClassData = { id?: string; class_name: string; school_name: string; code: string; teacher_id?: string };
type Course = { id?: string; course_name: string; class_code: string };
type Material = { id?: string; course_id: string; name: string; link: string };
type Assignment = { id?: string; course_id: string; name: string; description: string; due_date?: string | null; created_at?: string };
type Submission = { id?: string; assignment_id: string; student_id?: string | null; nickname: string; class: string; link: string; grade?: number | null; created_at?: string };
type Test = { id: string; course_id?: string | null; class_code: string; title: string; description?: string | null; published: boolean; created_at?: string };
type Question = { id?: string; test_id: string; question_order: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: 'A'|'B'|'C'|'D'; points: number };
type AddType = 'material' | 'assignment' | 'test';

auto const nope = 0;

export default function ClassDetailsPage() {
  const params = useParams();
  const code = Array.isArray(params.code) ? params.code[0] : String(params.code || '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authHeaders = { apikey: supabaseAnonKey || '', Authorization: `Bearer ${supabaseAnonKey || ''}` };
  const jsonHeaders = { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' };

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Record<string, Material[]>>({});
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({});
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [tests, setTests] = useState<Record<string, Test[]>>({});
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentFullName, setStudentFullName] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>({});
  const [openAssignments, setOpenAssignments] = useState<Record<string, boolean>>({});
  const [openTests, setOpenTests] = useState<Record<string, boolean>>({});
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [savingGrades, setSavingGrades] = useState<Record<string, boolean>>({});

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [addType, setAddType] = useState<AddType>('material');
  const [creatingItem, setCreatingItem] = useState(false);
  const [checkingLink, setCheckingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [materialLink, setMaterialLink] = useState('');
  const [assignmentName, setAssignmentName] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionClass, setSubmissionClass] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [undoingSubmission, setUndoingSubmission] = useState(false);

  const getJson = async <T,>(url: string): Promise<T> => {
    const r = await fetch(url, { headers: authHeaders, cache: 'no-store' });
    const text = await r.text();
    if (!r.ok) throw new Error(text || 'Request failed.');
    return text ? JSON.parse(text) : ([] as T);
  };

  const deleteFrom = async (url: string) => {
    const r = await fetch(url, { method: 'DELETE', headers: authHeaders });
    if (!r.ok) throw new Error((await r.text()) || 'Delete failed.');
  };

  const isValidHttpUrl = (value: string) => {
    try { const u = new URL(value.trim()); return u.protocol === 'http:' || u.protocol === 'https:'; }
    catch { return false; }
  };

  useEffect(() => {
    try {
      let role = localStorage.getItem('user_role') || '';
      let id = '';
      let name = '';
      const read = (u: any) => {
        role ||= u?.role || u?.user?.role || u?.user?.user_metadata?.role || '';
        id ||= u?.student_id || u?.id || u?.user_id || u?.uid || u?.user?.student_id || u?.user?.id || '';
        name ||= u?.fullName || u?.full_name || u?.name || u?.user?.fullName || u?.user?.full_name || u?.user?.name || '';
      };
      const raw = localStorage.getItem('current_user');
      if (raw) { try { read(JSON.parse(raw)); } catch {} }
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i); if (!k || (!k.includes('supabase') && !k.includes('auth'))) continue;
        const v = localStorage.getItem(k); if (!v) continue; try { read(JSON.parse(v)); } catch {}
      }
      setIsTeacher(String(role).toLowerCase() === 'teacher');
      setStudentId(String(id).trim());
      setStudentFullName(String(name).trim());
    } catch (e) { console.error(e); }
  }, []);

  const parseDate = (v: string) => {
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) return null;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return d.getFullYear() === Number(m[3]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[1]) ? d : null;
  };
  const dateDb = (v: string) => { const d = parseDate(v); return d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : null; };
  const dateValid = (v: string) => { const d = parseDate(v); if (!d) return false; const t = new Date(); t.setHours(0,0,0,0); d.setHours(0,0,0,0); return d >= t; };
  const displayDate = (v?: string | null) => v && v.includes('-') ? v.split('-').reverse().join('/') : v || 'No due date';
  const todayInput = () => { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; };
  const dateInput = (v: string) => { let d=v.replace(/\D/g,'').slice(0,8); if(d.length>=5)d=`${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`; else if(d.length>=3)d=`${d.slice(0,2)}/${d.slice(2)}`; setAssignmentDueDate(d); };

  async function loadClass() {
    if (!code || !supabaseUrl || !supabaseAnonKey) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const classes = await getJson<ClassData[]>(`${supabaseUrl}/rest/v1/teacher_classes?code=eq.${encodeURIComponent(code)}&select=*`);
      if (!classes[0]) { setError('Class not found.'); return; }
      setClassData(classes[0]);
      const cs = await getJson<Course[]>(`${supabaseUrl}/rest/v1/class_courses?class_code=eq.${encodeURIComponent(code)}&select=*&order=id.asc`);
      setCourses(cs);
      const mm: Record<string,Material[]>={}, am: Record<string,Assignment[]>={}, tm: Record<string,Test[]>={}, qm: Record<string,Question[]>={};
      await Promise.all(cs.map(async c => {
        if (!c.id) return;
        mm[c.id]=await getJson<Material[]>(`${supabaseUrl}/rest/v1/course_materials?course_id=eq.${encodeURIComponent(c.id)}&select=*&order=id.asc`).catch(()=>[]);
        am[c.id]=await getJson<Assignment[]>(`${supabaseUrl}/rest/v1/course_assignments?course_id=eq.${encodeURIComponent(c.id)}&select=*&order=created_at.asc`).catch(()=>[]);
        tm[c.id]=await getJson<Test[]>(`${supabaseUrl}/rest/v1/tests?course_id=eq.${encodeURIComponent(c.id)}&select=*&order=created_at.asc`).catch(()=>[]);
        await Promise.all((tm[c.id]||[]).map(async t => { qm[t.id]=await getJson<Question[]>(`${supabaseUrl}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(t.id)}&select=*&order=question_order.asc`).catch(()=>[]); }));
      }));
      setMaterials(mm); setAssignments(am); setTests(tm); setQuestions(qm);
      const sm: Record<string,Submission[]>={};
      for (const a of Object.values(am).flat()) if (a.id) {
        const q = isTeacher ? `assignment_id=eq.${encodeURIComponent(a.id)}` : studentId ? `assignment_id=eq.${encodeURIComponent(a.id)}&student_id=eq.${encodeURIComponent(studentId)}` : '';
        sm[a.id]=q ? await getJson<Submission[]>(`${supabaseUrl}/rest/v1/assignment_submissions?${q}&select=*&order=created_at.asc`).catch(()=>[]) : [];
      }
      setSubmissions(sm);
    } catch(e) { console.error(e); setError('Something went wrong while loading this class.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadClass(); }, [code, supabaseUrl, supabaseAnonKey, isTeacher, studentId]);

  const handleCopyCode = async () => { if (!classData?.code) return; try { await navigator.clipboard.writeText(classData.code); setCopiedCode(true); setTimeout(()=>setCopiedCode(false),1500); } catch {} };

  async function createCourse(e: React.FormEvent) {
    e.preventDefault(); if(!isTeacher||!courseName.trim()||!supabaseUrl)return; setCreatingCourse(true);
    try { const r=await fetch(`${supabaseUrl}/rest/v1/class_courses`,{method:'POST',headers:jsonHeaders,body:JSON.stringify({course_name:courseName.trim(),class_code:code})}); if(!r.ok)throw new Error(await r.text()); setCourseName('');setIsCourseModalOpen(false);await loadClass(); }
    catch(e){console.error(e);alert('Failed to create course.');} finally{setCreatingCourse(false);}
  }
  async function deleteCourse(id:string){ if(!confirm('Delete this course and its content?'))return; try{await deleteFrom(`${supabaseUrl}/rest/v1/class_courses?id=eq.${encodeURIComponent(id)}`);await loadClass();}catch(e){alert('Failed to delete course.');} }
  async function checkLink(link:string){ const r=await fetch('/api/moderate-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:link})});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.reason||d?.error||'Unable to check this link.');return d?.safe===true; }

  function openAdd(c:Course){setSelectedCourse(c);setAddType('material');setMaterialName('');setMaterialLink('');setAssignmentName('');setAssignmentDescription('');setAssignmentDueDate(todayInput());setTestTitle('');setTestDescription('');setLinkError(null);setIsAddModalOpen(true);}
  function closeAdd(){if(creatingItem)return;setIsAddModalOpen(false);setSelectedCourse(null);setLinkError(null);}

  async function createItem(e:React.FormEvent){
    e.preventDefault(); if(!selectedCourse?.id||!supabaseUrl)return; setCreatingItem(true);setLinkError(null);
    try{
      if(addType==='material'){
        if(!materialName.trim()||!isValidHttpUrl(materialLink))throw new Error('Enter a valid HTTP or HTTPS material link.');
        setCheckingLink(true);const link=new URL(materialLink.trim()).toString();if(!(await checkLink(link)))throw new Error('This link is not allowed.');
        const r=await fetch(`${supabaseUrl}/rest/v1/course_materials`,{method:'POST',headers:jsonHeaders,body:JSON.stringify({course_id:selectedCourse.id,name:materialName.trim(),link})});if(!r.ok)throw new Error(await r.text());
      } else if(addType==='assignment'){
        const due=dateDb(assignmentDueDate);if(!assignmentName.trim()||!assignmentDescription.trim()||!due||!dateValid(assignmentDueDate))throw new Error('Enter a valid due date today or later.');
        const r=await fetch(`${supabaseUrl}/rest/v1/course_assignments`,{method:'POST',headers:jsonHeaders,body:JSON.stringify({course_id:selectedCourse.id,name:assignmentName.trim(),description:assignmentDescription.trim(),due_date:due})});if(!r.ok)throw new Error(await r.text());
      } else {
        if(!testTitle.trim())throw new Error('Enter a test title.');
        const r=await fetch(`${supabaseUrl}/rest/v1/tests`,{method:'POST',headers:jsonHeaders,body:JSON.stringify({course_id:selectedCourse.id,class_code:code.toUpperCase(),title:testTitle.trim(),description:testDescription.trim()||null,published:false})});if(!r.ok)throw new Error(await r.text());
      }
      closeAdd(); await loadClass();
    }catch(e){setLinkError(e instanceof Error?e.message:'Failed to add item.');}finally{setCreatingItem(false);setCheckingLink(false);}
  }

  async function deleteMaterial(id:string){if(!confirm('Delete this material?'))return;try{await deleteFrom(`${supabaseUrl}/rest/v1/course_materials?id=eq.${encodeURIComponent(id)}`);await loadClass();}catch{alert('Failed to delete material.');}}
  async function deleteAssignment(id:string){if(!confirm('Delete this assignment?'))return;try{await deleteFrom(`${supabaseUrl}/rest/v1/course_assignments?id=eq.${encodeURIComponent(id)}`);await loadClass();}catch{alert('Failed to delete assignment.');}}
  async function deleteTest(id:string){if(!confirm('Delete this test and its questions/submissions?'))return;try{await deleteFrom(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(id)}`);await loadClass();}catch{alert('Failed to delete test.');}}
  async function togglePublished(t:Test){try{const r=await fetch(`${supabaseUrl}/rest/v1/tests?id=eq.${encodeURIComponent(t.id)}`,{method:'PATCH',headers:jsonHeaders,body:JSON.stringify({published:!t.published})});if(!r.ok)throw new Error(await r.text());setTests(p=>Object.fromEntries(Object.entries(p).map(([k,v])=>[k,v.map(x=>x.id===t.id?{...x,published:!x.published}:x)])));}catch{alert('Failed to change publication status.');}}

  function addQuestion(t:Test){setSelectedTest(t);setQuestion({test_id:t.id,question_order:(questions[t.id]?.length||0)+1,question:'',option_a:'',option_b:'',option_c:'',option_d:'',correct_answer:'A',points:1});setIsQuestionModalOpen(true);}
  async function saveQuestion(e:React.FormEvent){e.preventDefault();if(!question||!question.question.trim()||!question.option_a.trim()||!question.option_b.trim()||!question.option_c.trim()||!question.option_d.trim())return;setSavingQuestion(true);try{const body={...question,points:Math.max(0,Math.floor(Number(question.points)||0))};const r=await fetch(`${supabaseUrl}/rest/v1/test_questions`,{method:'POST',headers:jsonHeaders,body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());setIsQuestionModalOpen(false);setQuestion(null);await loadClass();}catch{alert('Failed to save question.');}finally{setSavingQuestion(false);}}
  async function deleteQuestion(id:string){if(!confirm('Delete this question?'))return;try{await deleteFrom(`${supabaseUrl}/rest/v1/test_questions?id=eq.${encodeURIComponent(id)}`);await loadClass();}catch{alert('Failed to delete question.');}}

  const studentSubmission=(id:string)=>studentId?(submissions[id]||[]).find(s=>String(s.student_id)===String(studentId)):undefined;
  function openSubmission(a:Assignment){if(!studentId){alert('Your student UUID could not be found. Please sign in again.');return;}if(studentSubmission(a.id!)){return;}setSelectedAssignment(a);setSubmissionClass('');setSubmissionLink('');setLinkError(null);setIsSubmissionModalOpen(true);}
  async function submitAssignment(e:React.FormEvent){e.preventDefault();if(!selectedAssignment?.id||!studentId||!submissionClass.trim()||!isValidHttpUrl(submissionLink))return;setSubmittingAssignment(true);setLinkError(null);try{const existing=await getJson<Submission[]>(`${supabaseUrl}/rest/v1/assignment_submissions?assignment_id=eq.${encodeURIComponent(selectedAssignment.id)}&student_id=eq.${encodeURIComponent(studentId)}&select=*`);if(existing.length){await loadClass();throw new Error('You have already submitted this assignment.');}setCheckingLink(true);const link=new URL(submissionLink.trim()).toString();if(!(await checkLink(link)))throw new Error('This link is not allowed.');const r=await fetch(`${supabaseUrl}/rest/v1/assignment_submissions`,{method:'POST',headers:jsonHeaders,body:JSON.stringify({assignment_id:selectedAssignment.id,student_id:studentId,nickname:studentFullName,class:submissionClass.trim().toUpperCase(),link,grade:null})});if(!r.ok)throw new Error(await r.text());setIsSubmissionModalOpen(false);await loadClass();alert('Assignment submitted successfully!');}catch(e){setLinkError(e instanceof Error?e.message:'Failed to submit assignment.');}finally{setCheckingLink(false);setSubmittingAssignment(false);}}
  async function undoSubmission(a:Assignment){const s=studentSubmission(a.id!);if(!s?.id)return;if(!confirm('Undo your submission? You can submit again.'))return;setUndoingSubmission(true);try{await deleteFrom(`${supabaseUrl}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(s.id)}&student_id=eq.${encodeURIComponent(studentId)}`);await loadClass();}catch{alert('Failed to undo submission.');}finally{setUndoingSubmission(false);}}
  async function loadAssignmentSubmissions(id:string){try{const d=await getJson<Submission[]>(`${supabaseUrl}/rest/v1/assignment_submissions?assignment_id=eq.${encodeURIComponent(id)}&select=*&order=created_at.asc`);setSubmissions(p=>({...p,[id]:d}));}catch{}}
  async function saveGrade(s:Submission){if(!s.id)return;const raw=gradeInputs[s.id]??String(s.grade??'');const grade=Math.max(0,Math.min(100,Math.trunc(Number(raw))));if(!Number.isFinite(grade)){alert('Grade must be between 0 and 100.');return;}setSavingGrades(p=>({...p,[s.id!]:true}));try{const r=await fetch(`${supabaseUrl}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(s.id)}`,{method:'PATCH',headers:jsonHeaders,body:JSON.stringify({grade})});if(!r.ok)throw new Error(await r.text());await loadClass();}catch{alert('Failed to save grade.');}finally{setSavingGrades(p=>({...p,[s.id!]:false}));}}

  if(loading)return <div className="min-h-screen bg-background"><Navbar/><div className="flex h-[80vh] items-center justify-center"><Loader2 className="size-8 animate-spin"/></div></div>;
  if(error||!classData)return <div className="min-h-screen bg-background"><Navbar/><main className="container mx-auto px-6 py-8"><Link href={isTeacher?'/dashboard/teacher':'/dashboard/student'}><Button variant="ghost" className="gap-2"><ArrowLeft className="size-4"/>Back</Button></Link><Card><CardContent className="py-12 text-center"><FileText className="mx-auto mb-4 size-10 text-muted-foreground"/><h1 className="text-xl font-semibold">{error||'Class not found'}</h1></CardContent></Card></main></div>;

  return <div className="min-h-screen bg-background"><Navbar/><main className="container mx-auto space-y-8 px-6 py-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link href={isTeacher?'/dashboard/teacher':'/dashboard/student'}><Button variant="ghost" className="-ml-3 mb-3 gap-2"><ArrowLeft className="size-4"/>Back to Dashboard</Button></Link><h1 className="text-3xl font-bold">{classData.class_name}</h1><div className="mt-1 flex gap-4 text-sm text-muted-foreground"><span>School: {classData.school_name}</span><span>Code: <b className="font-mono text-primary">{classData.code}</b>{isTeacher&&<button onClick={handleCopyCode} className="ml-2">{copiedCode?'✓':<Copy className="inline size-3.5"/>}</button>}</span></div></div>{isTeacher&&<Button onClick={()=>setIsCourseModalOpen(true)} className="gap-2"><PlusCircle size={18}/>Create New Course</Button>}</div>
    <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Courses</h2><span className="text-sm text-muted-foreground">{courses.length} {courses.length===1?'course':'courses'}</span></div>{courses.length===0?<Card><CardContent className="py-10 text-center text-muted-foreground">{isTeacher?'Create your first course.':'Your teacher has not created any courses yet.'}</CardContent></Card>:<div className="space-y-3">{courses.map(c=>{if(!c.id)return null;const cid=c.id,open=!!openCourses[cid],ma=materials[cid]||[],aa=assignments[cid]||[],tt=tests[cid]||[];return <Card key={cid} className="overflow-hidden"><CardHeader className="flex flex-row items-center justify-between gap-3 py-4"><div className="flex min-w-0 items-center gap-2"><Button variant="ghost" size="sm" className="size-8 p-0" onClick={()=>setOpenCourses(p=>({...p,[cid]:!p[cid]}))}>{open?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</Button><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4 text-primary"/><span className="truncate">{c.course_name}</span></CardTitle></div>{isTeacher&&<div className="flex gap-1"><Button size="sm" onClick={()=>openAdd(c)} className="gap-2"><PlusCircle size={15}/>Add</Button><Button variant="ghost" size="sm" className="size-8 p-0" onClick={()=>deleteCourse(cid)}><Trash2 size={15}/></Button></div>}</CardHeader>{open&&<CardContent className="space-y-8 border-t pt-5">
      <section className="space-y-3"><h3 className="font-semibold">📚 Materials</h3>{ma.length===0?<p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No materials yet.</p>:ma.map(m=><div key={m.id} className="flex items-center gap-3 rounded-lg border p-3"><a href={m.link} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3"><LinkIcon className="size-5 text-primary"/><span className="truncate font-medium">{m.name}</span><ExternalLink className="ml-auto size-4 text-muted-foreground"/></a>{isTeacher&&<Button variant="ghost" size="sm" onClick={()=>m.id&&deleteMaterial(m.id)}><Trash2 size={15}/></Button>}</div>)}</section>
      <section className="space-y-3"><div><h3 className="font-semibold">📝 Assignments</h3><p className="text-xs text-muted-foreground">{isTeacher?'Click an assignment to view submissions and grades.':'Click an assignment to submit your work.'}</p></div>{aa.length===0?<p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No assignments yet.</p>:aa.map(a=>{if(!a.id)return null;const s=studentSubmission(a.id),openA=!!openAssignments[a.id],list=submissions[a.id]||[];return <div key={a.id} className="overflow-hidden rounded-lg border"><button className="flex w-full items-start gap-3 p-4 text-left hover:bg-primary/5" onClick={()=>isTeacher?(setOpenAssignments(p=>({...p,[a.id!]:!p[a.id!]})),!openA&&loadAssignmentSubmissions(a.id!)):s?undoSubmission(a):openSubmission(a)} disabled={undoingSubmission}><ClipboardList className="mt-0.5 size-5 text-primary"/><div className="min-w-0 flex-1"><div className="flex justify-between"><b>{a.name}</b>{isTeacher&&(openA?<ChevronUp size={16}/>:<ChevronDown size={16}/>)}</div><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.description}</p>{a.due_date&&<p className="mt-2 text-xs">Due: {displayDate(a.due_date)}</p>}{isTeacher?<p className="mt-2 text-xs text-primary">{list.length} submission{list.length===1?'':'s'}</p>:s?<p className="mt-2 flex items-center gap-1 text-xs text-primary"><RotateCcw size={13}/>Submitted — click to undo</p>:<p className="mt-2 text-xs text-primary">Click to submit →</p>}</div></button>{isTeacher&&openA&&<div className="border-t p-4">{list.length===0?<p className="text-sm text-muted-foreground">No submissions yet.</p>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Class</th><th className="p-2 text-left">Submission</th><th className="p-2 text-right">Grade</th></tr></thead><tbody>{list.map(sub=><tr key={sub.id} className="border-b"><td className="p-2">{sub.nickname}</td><td className="p-2">{sub.class}</td><td className="p-2"><a href={sub.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open Link</a></td><td className="p-2"><div className="flex justify-end gap-2"><Input className="w-20" type="number" min="0" max="100" value={gradeInputs[sub.id!]??String(sub.grade??'')} onChange={e=>setGradeInputs(p=>({...p,[sub.id!]:e.target.value}))}/><Button size="sm" onClick={()=>saveGrade(sub)} disabled={savingGrades[sub.id!]}>{savingGrades[sub.id!]?<Loader2 className="size-3 animate-spin"/>:<Save className="size-3"/>}</Button></div></td></tr>)}</tbody></table></div>}</div>}{isTeacher&&<div className="flex justify-end border-t p-2"><Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={()=>deleteAssignment(a.id!)}><Trash2 className="mr-1 size-3"/>Delete Assignment</Button></div>}</div>})}</section>
      <section className="space-y-3"><div><h3 className="font-semibold">🧪 Tests</h3><p className="text-xs text-muted-foreground">{isTeacher?'Create, manage, and publish tests for this course.':'Published tests for this course.'}</p></div>{tt.length===0?<p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No tests yet.</p>:tt.map(t=>{const qs=questions[t.id]||[],openT=!!openTests[t.id];return <div key={t.id} className="overflow-hidden rounded-lg border"><div className="flex items-start gap-3 p-4"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">🧪</div><div className="min-w-0 flex-1"><p className="font-semibold">{t.title}</p>{t.description&&<p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}<p className="mt-1 text-xs text-muted-foreground">{qs.length} question{qs.length===1?'':'s'} {isTeacher&&`· ${t.published?'Published':'Draft'}`}</p>{!isTeacher&&t.published&&<Link href={`/dashboard/student/tests/${t.id}`}><Button size="sm" className="mt-3">Take Test</Button></Link>}</div>{isTeacher&&<div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>togglePublished(t)}>{t.published?<><EyeOff className="mr-1 size-3.5"/>Unpublish</>:<><Eye className="mr-1 size-3.5"/>Publish</>}</Button><Button variant="ghost" size="sm" onClick={()=>setOpenTests(p=>({...p,[t.id]:!p[t.id]}))}>{openT?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</Button><Button variant="ghost" size="sm" onClick={()=>deleteTest(t.id)}><Trash2 size={15}/></Button></div>}</div>{isTeacher&&openT&&<div className="border-t p-4 space-y-3">{qs.map((q,i)=><div key={q.id} className="flex items-start justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{i+1}. {q.question}</p><p className="text-xs text-muted-foreground">A: {q.option_a} · B: {q.option_b} · C: {q.option_c} · D: {q.option_d} · Correct: {q.correct_answer} · {q.points} pts</p></div><Button variant="ghost" size="sm" onClick={()=>q.id&&deleteQuestion(q.id)}><Trash2 size={14}/></Button></div>)}<Button variant="outline" size="sm" onClick={()=>addQuestion(t)}><PlusCircle className="mr-2 size-4"/>Add Question</Button></div>}</div>})}</section>
    </CardContent>}</Card>})}</div>}</section>
  </main>

  {isCourseModalOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Create New Course</CardTitle></CardHeader><CardContent><form onSubmit={createCourse} className="space-y-4"><Input autoFocus placeholder="Course name" value={courseName} onChange={e=>setCourseName(e.target.value)} required/><div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={()=>setIsCourseModalOpen(false)}>Cancel</Button><Button className="w-1/2" disabled={creatingCourse}>{creatingCourse?<Loader2 className="size-4 animate-spin"/>:'Create Course'}</Button></div></form></CardContent></Card></div>}
  {isAddModalOpen&&<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Add to {selectedCourse?.course_name}</CardTitle></CardHeader><CardContent><form onSubmit={createItem} className="space-y-4"><select value={addType} onChange={e=>setAddType(e.target.value as AddType)} className="h-10 w-full rounded-md border bg-background px-3"><option value="material">Material</option><option value="assignment">Assignment</option><option value="test">Test</option></select>{addType==='material'&&<><Input placeholder="Material name" value={materialName} onChange={e=>setMaterialName(e.target.value)} required/><Input type="url" placeholder="https://..." value={materialLink} onChange={e=>setMaterialLink(e.target.value)} required/></>}{addType==='assignment'&&<><Input placeholder="Assignment name" value={assignmentName} onChange={e=>setAssignmentName(e.target.value)} required/><textarea rows={4} placeholder="Description" value={assignmentDescription} onChange={e=>setAssignmentDescription(e.target.value)} className="w-full rounded-md border bg-background p-2 text-sm" required/><Input placeholder="DD/MM/YYYY" value={assignmentDueDate} onChange={e=>dateInput(e.target.value)} required/></>}{addType==='test'&&<><Input placeholder="Test title" value={testTitle} onChange={e=>setTestTitle(e.target.value)} required/><textarea rows={3} placeholder="Description (optional)" value={testDescription} onChange={e=>setTestDescription(e.target.value)} className="w-full rounded-md border bg-background p-2 text-sm"/></>}{linkError&&<p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{linkError}</p>}{checkingLink&&<p className="text-sm text-muted-foreground">Checking link...</p>}<div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={closeAdd}>Cancel</Button><Button className="w-1/2" disabled={creatingItem||checkingLink}>{creatingItem?<Loader2 className="size-4 animate-spin"/>:`Add ${addType==='material'?'Material':addType==='assignment'?'Assignment':'Test'}`}</Button></div></form></CardContent></Card></div>}
  {isQuestionModalOpen&&question&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-lg"><CardHeader><CardTitle>Add Question to {selectedTest?.title}</CardTitle></CardHeader><CardContent><form onSubmit={saveQuestion} className="space-y-3"><Input placeholder="Question" value={question.question} onChange={e=>setQuestion({...question,question:e.target.value})} required/><Input placeholder="A" value={question.option_a} onChange={e=>setQuestion({...question,option_a:e.target.value})} required/><Input placeholder="B" value={question.option_b} onChange={e=>setQuestion({...question,option_b:e.target.value})} required/><Input placeholder="C" value={question.option_c} onChange={e=>setQuestion({...question,option_c:e.target.value})} required/><Input placeholder="D" value={question.option_d} onChange={e=>setQuestion({...question,option_d:e.target.value})} required/><div className="grid grid-cols-2 gap-3"><select value={question.correct_answer} onChange={e=>setQuestion({...question,correct_answer:e.target.value as Question['correct_answer']})} className="h-10 rounded-md border bg-background px-3"><option>A</option><option>B</option><option>C</option><option>D</option></select><Input type="number" min="0" value={question.points} onChange={e=>setQuestion({...question,points:Number(e.target.value)})} placeholder="Points"/></div><div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={()=>setIsQuestionModalOpen(false)}>Cancel</Button><Button className="w-1/2" disabled={savingQuestion}>{savingQuestion?<Loader2 className="size-4 animate-spin"/>:<><Save className="mr-2 size-4"/>Save Question</>}</Button></div></form></CardContent></Card></div>}
  {isSubmissionModalOpen&&selectedAssignment&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Submit Assignment</CardTitle><p className="text-sm text-muted-foreground">{selectedAssignment.name}</p></CardHeader><CardContent><form onSubmit={submitAssignment} className="space-y-4"><Input value={studentFullName} disabled/><Input placeholder="Class, e.g. 8A" value={submissionClass} onChange={e=>setSubmissionClass(e.target.value.toUpperCase())} required/><Input type="url" placeholder="Submission link" value={submissionLink} onChange={e=>setSubmissionLink(e.target.value)} required/>{linkError&&<p className="text-sm text-destructive">{linkError}</p>}<div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={()=>setIsSubmissionModalOpen(false)} disabled={submittingAssignment}>Cancel</Button><Button className="w-1/2" disabled={submittingAssignment||checkingLink}>{submittingAssignment?<Loader2 className="size-4 animate-spin"/>:'Submit Work'}</Button></div></form></CardContent></Card></div>}
  </div>;
}
