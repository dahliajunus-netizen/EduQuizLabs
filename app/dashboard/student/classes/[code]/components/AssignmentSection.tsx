'use client';

import { Button } from '@/components/ui/button';
import { ClipboardList, ChevronDown, ChevronUp, RotateCcw, Save, Trash2, CheckCircle2, Clock3 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export type AssignmentItem = { id?: string; name: string; description: string; due_date?: string | null };
export type AssignmentSubmission = { id?: string; nickname: string; class: string; link: string; grade?: number | null; student_id?: string | null };

type Props = { assignments: AssignmentItem[]; submissions: Record<string, AssignmentSubmission[]>; teacher: boolean; studentId: string; gradeInputs: Record<string,string>; setGradeInputs: React.Dispatch<React.SetStateAction<Record<string,string>>>; open: Record<string,boolean>; setOpen: React.Dispatch<React.SetStateAction<Record<string,boolean>>>; displayDate: (value?: string|null)=>string; onSubmit: (assignment: AssignmentItem)=>void; onUndo: (assignment: AssignmentItem)=>void; onDelete: (id:string)=>void; onSaveGrade: (submission: AssignmentSubmission)=>void };

function formatDueDate(value?: string | null) { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }

export default function AssignmentSection({ assignments, submissions, teacher, studentId, gradeInputs, setGradeInputs, open, setOpen, onSubmit, onUndo, onDelete, onSaveGrade }: Props) {
  const studentSubmission = (id:string) => submissions[id]?.find(s => String(s.student_id) === String(studentId));
  return <section className="space-y-3">
    <div><h3 className="flex items-center gap-2 text-base font-bold tracking-tight"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><ClipboardList className="size-4" /></span>Assignments</h3><p className="mt-0.5 text-xs text-muted-foreground">{teacher ? 'Open an assignment to review submissions and grades.' : 'Open an assignment to submit or undo your submission.'}</p></div>
    {assignments.length ? assignments.map(assignment => { const id=assignment.id!; const submission=studentSubmission(id); const list=submissions[id]||[]; return <div key={id} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md">
      <button type="button" className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/30 sm:p-5" onClick={()=>teacher ? setOpen(p=>({...p,[id]:!p[id]})) : submission ? onUndo(assignment) : onSubmit(assignment)}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><ClipboardList className="size-5" /></span>
        <span className="min-w-0 flex-1"><span className="block font-semibold">{assignment.name}</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">{assignment.description}</span>{assignment.due_date&&<span className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground"><Clock3 className="size-3.5" />Due {formatDueDate(assignment.due_date)}</span>}{!teacher&&submission&&<span className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary"><CheckCircle2 className="size-3.5"/>Submitted · click to undo</span>}{!teacher&&!submission&&<span className="mt-2 block text-xs font-semibold text-primary">Click to submit →</span>}</span>
        {teacher&&(open[id]?<ChevronUp className="mt-1 size-5 text-muted-foreground"/>:<ChevronDown className="mt-1 size-5 text-muted-foreground"/>)}
      </button>
      {teacher&&open[id]&&<div className="border-t border-border/70 bg-muted/10 p-4 sm:p-5">{list.length===0?<p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">No submissions yet.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="p-2">Student</th><th className="p-2">Class</th><th className="p-2">Submission</th><th className="p-2 text-right">Grade</th></tr></thead><tbody>{list.map(s=><tr key={s.id} className="border-b last:border-0"><td className="p-2 font-medium">{s.nickname}</td><td className="p-2 text-muted-foreground">{s.class}</td><td className="p-2"><a className="font-medium text-primary hover:underline" href={s.link} target="_blank" rel="noreferrer">Open submission ↗</a></td><td className="p-2"><div className="flex justify-end gap-2"><Input className="h-9 w-20 rounded-lg" type="number" min="0" max="100" value={gradeInputs[s.id!] ?? String(s.grade ?? '')} onChange={e=>setGradeInputs(p=>({...p,[s.id!]:e.target.value}))}/><Button type="button" size="sm" className="rounded-lg" onClick={()=>onSaveGrade(s)}><Save className="size-3"/></Button></div></td></tr>)}</tbody></table></div>}</div>}
      {teacher&&<div className="flex justify-end border-t border-border/60 px-3 py-2"><Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={()=>onDelete(id)}><Trash2 className="mr-1 size-3.5"/>Delete</Button></div>}
    </div>}) : <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center"><ClipboardList className="mx-auto size-7 text-muted-foreground/60"/><p className="mt-2 text-sm font-medium">No assignments yet</p></div>}
  </section>;
}
