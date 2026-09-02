'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, ChevronDown, ChevronUp, Save, Trash2, CheckCircle2, Clock3, ExternalLink, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';

export type AssignmentItem = { id?: string; name: string; description: string; due_date?: string | null };
export type AssignmentSubmission = { id?: string; nickname: string; class: string; link: string; grade?: number | null; student_id?: string | null; assignment_id?: string | null };
type Props = { assignments: AssignmentItem[]; submissions: Record<string, AssignmentSubmission[]>; teacher: boolean; studentId: string; gradeInputs: Record<string,string>; setGradeInputs: React.Dispatch<React.SetStateAction<Record<string,string>>>; open: Record<string,boolean>; setOpen: React.Dispatch<React.SetStateAction<Record<string,boolean>>>; displayDate: (value?: string|null)=>string; onSubmit: (assignment: AssignmentItem)=>void; onUndo: (assignment: AssignmentItem)=>void; onDelete: (id:string)=>void; onSaveGrade: (submission: AssignmentSubmission)=>void };
function formatDueDate(value?: string | null) { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

export default function AssignmentSection({ assignments, submissions, teacher, studentId, gradeInputs, setGradeInputs, open, setOpen, displayDate, onSubmit, onUndo, onDelete, onSaveGrade }: Props) {
 const [persistedSubmissions, setPersistedSubmissions] = useState<Record<string, AssignmentSubmission[]>>(submissions);

 useEffect(() => {
  const hasSubmissionData = Object.values(submissions).some(list => list?.length > 0);
  if (teacher || hasSubmissionData) setPersistedSubmissions(submissions);
 }, [submissions, teacher]);

 useEffect(() => {
  if (teacher || !studentId || assignments.length === 0) return;
  let cancelled = false;
  const loadStudentSubmissions = async () => {
   try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;
    let token = '';
    try { token = localStorage.getItem('supabase_access_token') || ''; } catch {}
    const response = await fetch(`${supabaseUrl}/rest/v1/assignment_submissions?student_id=eq.${encodeURIComponent(studentId)}&select=*`, {
     headers: { apikey: supabaseKey, Authorization: `Bearer ${token || supabaseKey}` },
     cache: 'no-store'
    });
    if (!response.ok) return;
    const rows = await response.json() as AssignmentSubmission[];
    if (cancelled) return;
    const next: Record<string, AssignmentSubmission[]> = {};
    for (const row of rows) {
     const assignmentId = row.assignment_id;
     if (assignmentId) (next[assignmentId] ||= []).push(row);
    }
    setPersistedSubmissions(prev => {
     const merged = { ...prev };
     for (const assignment of assignments) {
      if (assignment.id) merged[assignment.id] = next[assignment.id] || [];
     }
     return merged;
    });
   } catch {}
  };
  void loadStudentSubmissions();
  return () => { cancelled = true; };
 }, [teacher, studentId, assignments]);

 const studentSubmission=(id:string)=>persistedSubmissions[id]?.find(s=>String(s.student_id)===String(studentId));
 const handleUndo = async (assignment: AssignmentItem) => {
  await onUndo(assignment);
  if (assignment.id) setPersistedSubmissions(prev => ({ ...prev, [assignment.id]: [] }));
 };
 return <section className="space-y-4">
  <div><h3 className="flex items-center gap-2 text-lg font-black tracking-tight"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="size-4.5"/></span>Assignments</h3><p className="mt-1 text-xs text-muted-foreground">{teacher?'Review submissions, grades, and student work.':'Complete your coursework and keep track of your submissions.'}</p></div>
  {assignments.length ? <div className="space-y-3">{assignments.map(assignment=>{const id=assignment.id!;const submission=studentSubmission(id);const list=persistedSubmissions[id]||[];return <div key={id} className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all hover:border-primary/20 hover:shadow-lg">
   <button type="button" className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-muted/20 sm:p-5" onClick={()=>teacher?setOpen(p=>({...p,[id]:!p[id]})):submission?void handleUndo(assignment):onSubmit(assignment)}>
    <span className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl ${submission?'bg-primary/10 text-primary':'bg-muted text-muted-foreground'}`}>{submission?<CheckCircle2 className="size-5"/>:<ClipboardList className="size-5"/>}</span>
    <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-bold">{assignment.name}</span>{submission&&!teacher&&<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary">Submitted</span>}</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">{assignment.description}</span>{assignment.due_date&&<span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2 py-1 text-xs font-semibold text-muted-foreground"><Clock3 className="size-3.5"/>Due {formatDueDate(assignment.due_date)}</span>}{!teacher&&!submission&&<span className="mt-2 flex items-center gap-1 text-xs font-bold text-primary"><Circle className="size-2.5 fill-current"/>Click to submit</span>}{!teacher&&submission&&<span className="mt-2 block text-xs font-semibold text-muted-foreground">Click to undo your submission</span>}</span>
    {teacher&&(open[id]?<ChevronUp className="mt-1 size-5 text-muted-foreground"/>:<ChevronDown className="mt-1 size-5 text-muted-foreground"/>)}
   </button>
   {teacher&&open[id]&&<div className="border-t border-border/70 bg-muted/10 p-4 sm:p-5">{list.length===0?<div className="rounded-xl border border-dashed p-6 text-center"><ClipboardList className="mx-auto size-6 text-muted-foreground/60"/><p className="mt-2 text-sm font-semibold">No submissions yet</p><p className="mt-1 text-xs text-muted-foreground">Student submissions will appear here.</p></div>:<div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[620px] text-sm"><thead className="bg-muted/40"><tr className="border-b text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><th className="p-3">Student</th><th className="p-3">Class</th><th className="p-3">Submission</th><th className="p-3 text-right">Grade</th></tr></thead><tbody>{list.map(s=><tr key={s.id} className="border-b last:border-0 hover:bg-muted/20"><td className="p-3 font-semibold">{s.nickname}</td><td className="p-3 text-muted-foreground">{s.class}</td><td className="p-3"><a className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline" href={s.link} target="_blank" rel="noreferrer">Open submission <ExternalLink className="size-3.5"/></a></td><td className="p-3"><div className="flex justify-end gap-2"><Input className="h-9 w-20 rounded-lg" type="number" min="0" max="100" value={gradeInputs[s.id!]??String(s.grade??'')} onChange={e=>setGradeInputs(p=>({...p,[s.id!]:e.target.value}))}/><Button type="button" size="sm" className="rounded-lg" onClick={()=>onSaveGrade(s)}><Save className="size-3.5"/></Button></div></td></tr>)}</tbody></table></div>}
    {teacher&&<div className="mt-3 flex justify-end"><Button type="button" variant="ghost" size="sm" className="rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={()=>onDelete(id)}><Trash2 className="mr-1.5 size-3.5"/>Delete assignment</Button></div>}</div>}
  </div>})}</div>:<div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><ClipboardList className="size-6"/></div><p className="mt-3 text-sm font-bold">No assignments yet</p><p className="mt-1 text-xs text-muted-foreground">Assignments for this course will appear here.</p></div>}
 </section>;
}
