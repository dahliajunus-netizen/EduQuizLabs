'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, PlusCircle, Loader2, CalendarDays, BarChart3, X, Radio } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

type StudentClass={id:string;class_name:string;code:string;school:string|null;course_id:string|null;student_id?:string|null};
type TeacherClass={id:string;code:string;school_name:string|null;class_name:string;teacher_id?:string|null};
type Course={id:string;course_name:string;class_code:string};
type Assignment={id:string;course_id:string;name:string;description?:string|null;created_at?:string;due_date:string|null};
type Submission={id:string;assignment_id:string;student_id:string;grade:number|null;created_at:string};
type Test={id:string;course_id:string;title:string;created_at?:string|null};
type TestSubmission={id:string;test_id:string;student_id:string;score:number|null;submitted_at:string};
type GradeHistoryItem={name:string;grade:number;type:'assignment'|'test'};
type CurrentUser={id?:string;student_id?:string;user_id?:string;uid?:string};
type DashboardData={classes:StudentClass[];courses:Course[];assignments:Assignment[];submissions:Submission[];tests:Test[];testSubmissions:TestSubmission[]};

const EMPTY:DashboardData={classes:[],courses:[],assignments:[],submissions:[],tests:[],testSubmissions:[]};
const CACHE_TTL=15000;
let cache:{studentId:string;expires:number;data:DashboardData}|null=null;

function getStudentId(){try{const raw=localStorage.getItem('current_user');if(!raw)return null;const u:CurrentUser=JSON.parse(raw);const id=u.student_id??u.id??u.user_id??u.uid;return id?String(id).trim():null;}catch{return null;}}
function inFilter(values:string[]){return values.map(v=>`"${String(v).replace(/"/g,'\\"')}"`).join(',');}

export default function StudentDashboard(){
 const {language}=useLanguage();
 const [classCode,setClassCode]=useState('');const [data,setData]=useState<DashboardData>(EMPTY);const [loading,setLoading]=useState(true);const [joining,setJoining]=useState(false);const [showGrades,setShowGrades]=useState(false);const [codeError,setCodeError]=useState<string|null>(null);const controllerRef=useRef<AbortController|null>(null);
 const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'';const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
 const headers=useMemo(()=>({apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}),[SUPABASE_KEY]);
 const text=language==='id'?{title:'Dasbor Siswa',desc:'Pantau tugas sekolah, bergabung dengan kelas menggunakan kode, dan lihat tugas yang akan datang.',codeTitle:'Masukkan Kode Kelas',placeholder:'Masukkan kode (contoh: A3F92)',join:'Gabung Kelas',classes:'Kelas yang Anda Ikuti',noneClasses:'Anda belum bergabung dengan kelas mana pun. Masukkan kode yang valid di atas!',school:'Sekolah:',active:'Aktif',assignments:'Tugas',assignmentCount:'tugas',due:'Tugas Mendatang',today:'Jatuh tempo hari ini',tomorrow:'Jatuh tempo besok',inDays:'Jatuh tempo dalam',days:'hari',overdue:'Terlambat',noDate:'Tidak ada batas waktu',average:'Nilai Rata-Rata',noGrades:'Belum ada nilai',history:'Riwayat Nilai',grades:'nilai',test:'Ujian',assignment:'Tugas',noAssignments:'Tidak ada tugas.',invalid:'Kode tidak valid',joined:'Anda sudah bergabung dengan kelas ini',network:'Terjadi kesalahan jaringan',unknown:'Kesalahan tidak diketahui'}:{title:'Student Dashboard',desc:'Track your coursework, join classes with a code, and view upcoming assignments.',codeTitle:'Class Code Input',placeholder:'Enter code (e.g., A3F92)',join:'Join Class',classes:'Classes You Are In',noneClasses:"You haven't joined any classes yet. Enter a valid code above!",school:'School:',active:'Active',assignments:'Assignments Due',assignmentCount:'assignments',due:'Assignments Due',today:'Due today',tomorrow:'Due tomorrow',inDays:'Due in',days:'days',overdue:'Overdue',noDate:'No due date',average:'Average Grades',noGrades:'No grades yet',history:'Grade History',grades:'grades',test:'Test',assignment:'Assignment',noAssignments:'No assignments found.',invalid:'Code is invalid',joined:'You have already joined this class.',network:'Network error joining class.',unknown:'Unknown error'};

 const getJson=useCallback(async<T>(path:string,signal?:AbortSignal):Promise<T>=>{const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers,signal,cache:'no-store'});if(!r.ok)throw new Error(await r.text());return r.json();},[SUPABASE_URL,headers]);
 const load=useCallback(async(force=false)=>{
  const sid=getStudentId();if(!sid){setData(EMPTY);setLoading(false);return;}
  if(!force&&cache?.studentId===sid&&cache.expires>Date.now()){setData(cache.data);setLoading(false);return;}
  controllerRef.current?.abort();const controller=new AbortController();controllerRef.current=controller;setLoading(true);
  try{
   const classes=await getJson<StudentClass[]>(`student_classes?student_id=eq.${encodeURIComponent(sid)}&select=id,class_name,code,school,course_id,student_id`,controller.signal);
   if(!classes.length){cache={studentId:sid,expires:Date.now()+CACHE_TTL,data:EMPTY};setData(EMPTY);return;}
   const codes=[...new Set(classes.map(c=>c.code).filter(Boolean))];
   const courses=await getJson<Course[]>(`class_courses?class_code=in.(${inFilter(codes)})&select=id,course_name,class_code&order=id.asc`,controller.signal);
   if(!courses.length){const next={...EMPTY,classes};cache={studentId:sid,expires:Date.now()+CACHE_TTL,data:next};setData(next);return;}
   const courseIds=[...new Set(courses.map(c=>c.id).filter(Boolean))];const cf=inFilter(courseIds);
   const [assignments,tests]=await Promise.all([
    getJson<Assignment[]>(`course_assignments?course_id=in.(${cf})&select=id,course_id,name,description,created_at,due_date&order=due_date.asc.nullslast`,controller.signal),
    getJson<Test[]>(`tests?course_id=in.(${cf})&published=eq.true&select=id,course_id,title,created_at&order=created_at.asc`,controller.signal)
   ]);
   const af=assignments.length?inFilter(assignments.map(a=>a.id)):'';const tf=tests.length?inFilter(tests.map(t=>t.id)):'';
   const [submissions,testSubmissions]=await Promise.all([
    af?getJson<Submission[]>(`assignment_submissions?assignment_id=in.(${af})&student_id=eq.${encodeURIComponent(sid)}&select=id,assignment_id,student_id,grade,created_at&order=created_at.desc`,controller.signal):Promise.resolve([] as Submission[]),
    tf?getJson<TestSubmission[]>(`test_submissions?test_id=in.(${tf})&student_id=eq.${encodeURIComponent(sid)}&select=id,test_id,student_id,score,submitted_at&order=submitted_at.desc`,controller.signal):Promise.resolve([] as TestSubmission[])
   ]);
   const next={classes,courses,assignments,submissions,tests,testSubmissions};cache={studentId:sid,expires:Date.now()+CACHE_TTL,data:next};if(!controller.signal.aborted)setData(next);
  }catch(e){if((e as Error).name!=='AbortError')console.error('[Student Dashboard]',e);}finally{if(!controller.signal.aborted)setLoading(false);}
 },[getJson]);
 useEffect(()=>{void load();return()=>controllerRef.current?.abort();},[load]);

 const join=async(e:FormEvent)=>{e.preventDefault();const code=classCode.trim().toUpperCase();if(!code)return;setCodeError(null);setJoining(true);try{const sid=getStudentId();if(!sid)throw new Error('Student UUID not found in current_user. Please sign in again.');const found=(await getJson<TeacherClass[]>(`teacher_classes?code=ilike.${encodeURIComponent(code)}&select=id,code,class_name,school_name,teacher_id&limit=1`))[0];if(!found){setCodeError(text.invalid);return;}const actual=String(found.code);const existing=await getJson<{id:string}[]>(`student_classes?student_id=eq.${encodeURIComponent(sid)}&code=ilike.${encodeURIComponent(actual)}&select=id&limit=1`);if(existing.length){setCodeError(text.joined);return;}const r=await fetch(`${SUPABASE_URL}/rest/v1/student_classes`,{method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({class_name:found.class_name,code:actual,school:found.school_name??null,course_id:null,student_id:sid})});if(!r.ok){const body=await r.text();throw new Error(body||text.network);}cache=null;setClassCode('');await load(true);}catch(e){setCodeError(e instanceof Error?e.message:text.network);}finally{setJoining(false);}};

 const latest=useMemo(()=>{const m=new Map<string,Submission>();for(const s of data.submissions)if(!m.has(s.assignment_id))m.set(s.assignment_id,s);return m},[data.submissions]);
 const coursesById=useMemo(()=>new Map(data.courses.map(c=>[c.id,c])),[data.courses]);const testsById=useMemo(()=>new Map(data.tests.map(t=>[t.id,t])),[data.tests]);
 const grades=useMemo<GradeHistoryItem[]>(()=>[...data.assignments.map(a=>{const s=latest.get(a.id);const g=Number(s?.grade);return s&&s.grade!==null&&!Number.isNaN(g)?{name:a.name,grade:g,type:'assignment' as const}:null}).filter((x):x is GradeHistoryItem=>!!x),...data.testSubmissions.map(s=>{const t=testsById.get(s.test_id);const g=Number(s.score);return t&&s.score!==null&&!Number.isNaN(g)?{name:t.title,grade:g,type:'test' as const}:null}).filter((x):x is GradeHistoryItem=>!!x)],[data.assignments,data.testSubmissions,latest,testsById]);
 const average=grades.length?Math.round(grades.reduce((a,b)=>a+b.grade,0)/grades.length*100)/100:null;
 const assignments=useMemo(()=>[...data.assignments].filter(a=>!latest.has(a.id)).sort((a,b)=>{if(!a.due_date)return 1;if(!b.due_date)return-1;return new Date(a.due_date).getTime()-new Date(b.due_date).getTime()}),[data.assignments,latest]);
 const countByClass=useMemo(()=>{const m=new Map<string,number>();for(const a of data.assignments){if(latest.has(a.id))continue;const c=coursesById.get(a.course_id);if(c)m.set(c.class_code,(m.get(c.class_code)||0)+1)}return m},[data.assignments,latest,coursesById]);
 const due=useCallback((date:string|null)=>{if(!date)return{text:noDate};const d=new Date(date),n=new Date();const t=new Date(n.getFullYear(),n.getMonth(),n.getDate()),x=new Date(d.getFullYear(),d.getMonth(),d.getDate());const diff=Math.round((x.getTime()-t.getTime())/86400000);if(diff<0)return{text:text.overdue,cls:'text-red-500'};if(diff===0)return{text:text.today,cls:'text-orange-500'};if(diff===1)return{text:text.tomorrow,cls:'text-yellow-500'};return{text:`${text.inDays} ${diff} ${text.days}`,cls:'text-primary'}},[text]);
 const fmt=useCallback((date:string|null)=>date?new Date(date).toLocaleDateString(language==='id'?'id-ID':'en-US',{day:'numeric',month:'short',year:'numeric'}):text.noDate,[language,text]);

 return <div className="min-h-screen bg-background"><Navbar/><main className="container mx-auto px-6 py-8 space-y-8">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-bold tracking-tight">{text.title}</h1><p className="text-muted-foreground">{text.desc}</p></div><Link href="/dashboard/student/live-quiz"><Button className="gap-2"><Radio className="size-4"/>Join Live Quiz</Button></Link></div>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="size-5 text-primary"/>{text.codeTitle}</CardTitle></CardHeader><CardContent><form onSubmit={join} className="flex gap-3"><Input value={classCode} onChange={e=>{setClassCode(e.target.value);setCodeError(null)}} placeholder={text.placeholder} className="uppercase"/><Button disabled={joining}>{joining?<Loader2 className="size-4 animate-spin"/>:text.join}</Button></form>{codeError&&<p className="mt-2 text-xs font-medium text-red-500">{codeError}</p>}</CardContent></Card><Card className="cursor-pointer hover:bg-accent/20" onClick={()=>setShowGrades(true)}><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="size-5 text-primary"/>{text.average}</CardTitle></CardHeader><CardContent>{loading?<Loader2 className="size-6 animate-spin"/>:average===null?<><p className="text-4xl font-bold text-muted-foreground">—</p><p className="text-sm text-muted-foreground">{text.noGrades}</p></>:<><p className="text-4xl font-bold text-primary">{average}</p><p className="text-sm text-muted-foreground">{grades.length} {text.grades}</p></>}</CardContent></Card></div>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"><Card><CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="size-5 text-primary"/>{text.classes}</CardTitle></CardHeader><CardContent className="space-y-3">{loading&&!data.classes.length?<Loader2 className="mx-auto size-7 animate-spin"/>:!data.classes.length?<p className="py-6 text-center text-sm text-muted-foreground">{text.noneClasses}</p>:data.classes.map(c=><Link key={c.id} href={`/dashboard/student/classes/${encodeURIComponent(c.code)}`} className="block rounded-2xl border p-4 hover:bg-accent/30"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-bold truncate">{c.class_name}</p><p className="text-xs text-muted-foreground">{text.school} {c.school||'—'}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{text.active}</span></div><p className="mt-3 text-xs font-semibold text-muted-foreground">{countByClass.get(c.code)||0} {text.assignmentCount}</p></Link>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5 text-primary"/>{text.due}</CardTitle></CardHeader><CardContent className="space-y-3">{loading&&!assignments.length?<Loader2 className="mx-auto size-7 animate-spin"/>:!assignments.length?<p className="py-6 text-center text-sm text-muted-foreground">{text.noAssignments}</p>:assignments.slice(0,10).map(a=>{const c=coursesById.get(a.course_id);const d=due(a.due_date);return <Link key={a.id} href={c?`/dashboard/student/classes/${encodeURIComponent(c.class_code)}/assignments/${encodeURIComponent(a.id)}`:'#'} className="block rounded-2xl border p-4 hover:bg-accent/30"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold truncate">{a.name}</p><p className="mt-1 text-xs text-muted-foreground">{c?.course_name||text.assignment}</p></div><span className={`shrink-0 text-xs font-bold ${d.cls||'text-muted-foreground'}`}>{d.text}</span></div><p className="mt-2 text-xs text-muted-foreground">{fmt(a.due_date)}</p></Link>})}</CardContent></Card></div>
  {showGrades&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={()=>setShowGrades(false)}><Card className="max-h-[80vh] w-full max-w-2xl overflow-hidden" onClick={e=>e.stopPropagation()}><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{text.history}</CardTitle><Button variant="ghost" size="icon" onClick={()=>setShowGrades(false)}><X className="size-5"/></Button></CardHeader><CardContent className="max-h-[60vh] overflow-y-auto space-y-2">{grades.length?grades.map((g,i)=><div key={`${g.type}-${g.name}-${i}`} className="flex items-center gap-3 rounded-xl border p-3"><span className="flex-1 font-medium">{g.name}</span><span className="text-xs text-muted-foreground">{g.type==='test'?text.test:text.assignment}</span><span className="font-black">{g.grade}</span></div>):<p className="py-8 text-center text-sm text-muted-foreground">{text.noGrades}</p>}</CardContent></Card></div>}
 </main></div>;
}
