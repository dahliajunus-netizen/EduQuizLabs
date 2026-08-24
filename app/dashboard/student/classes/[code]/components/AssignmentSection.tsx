'use client';

import { Button } from '@/components/ui/button';
import { ClipboardList, ChevronDown, ChevronUp, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export type AssignmentItem = { id?: string; name: string; description: string; due_date?: string | null };
export type AssignmentSubmission = { id?: string; nickname: string; class: string; link: string; grade?: number | null; student_id?: string | null };

type Props = { assignments: AssignmentItem[]; submissions: Record<string, AssignmentSubmission[]>; teacher: boolean; studentId: string; gradeInputs: Record<string,string>; setGradeInputs: React.Dispatch<React.SetStateAction<Record<string,string>>>; open: Record<string,boolean>; setOpen: React.Dispatch<React.SetStateAction<Record<string,boolean>>>; displayDate: (value?: string|null)=>string; onSubmit: (assignment: AssignmentItem)=>void; onUndo: (assignment: AssignmentItem)=>void; onDelete: (id:string)=>void; onSaveGrade: (submission: AssignmentSubmission)=>void };

function formatDueDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AssignmentSection({ assignments, submissions, teacher, studentId, gradeInputs, setGradeInputs, open, setOpen, displayDate, onSubmit, onUndo, onDelete, onSaveGrade }: Props) {
  const studentSubmission = (id:string) => submissions[id]?.find(s => String(s.student_id) === String(studentId));
  return <section><h3 className="mb-1 font-semibold">📝 Assignments</h3><p className="mb-3 text-xs text-muted-foreground">{teacher ? 'Click an assignment to view submissions and grades.' : 'Click an assignment to submit or undo your submission.'}</p>{assignments.length ? assignments.map(assignment => { const id=assignment.id!; const submission=studentSubmission(id); const list=submissions[id]||[]; return <div key={id} className="mb-2 overflow-hidden rounded-lg border"><button type="button" className="flex w-full items-start gap-3 p-4 text-left" onClick={()=>teacher ? setOpen(p=>({...p,[id]:!p[id]})) : submission ? onUndo(assignment) : onSubmit(assignment)}><ClipboardList className="size-5 text-primary"/><div className="flex-1"><b>{assignment.name}</b><p className="text-sm text-muted-foreground">{assignment.description}</p>{assignment.due_date && <p className="mt-1 text-xs font-medium">Due: {formatDueDate(assignment.due_date)}</p>}{!teacher&&submission&&<p className="mt-2 text-xs text-primary"><RotateCcw className="mr-1 inline size-3"/>Submitted — click to undo</p>}{!teacher&&!submission&&<p className="mt-2 text-xs text-primary">Click to submit →</p>}</div>{teacher&&(open[id]?<ChevronUp/>:<ChevronDown/>)}</button>{teacher&&open[id]&&<div className="border-t p-4">{list.length===0?<p className="text-sm text-muted-foreground">No submissions yet.</p>:<div className="overflow-x-auto"><table className="w-full text-sm"><tbody>{list.map(s=><tr key={s.id} className="border-b"><td className="p-2">{s.nickname}</td><td className="p-2">{s.class}</td><td className="p-2"><a className="text-primary" href={s.link} target="_blank" rel="noreferrer">Open</a></td><td className="p-2"><div className="flex justify-end gap-2"><Input className="w-20" type="number" min="0" max="100" value={gradeInputs[s.id!] ?? String(s.grade ?? '')} onChange={e=>setGradeInputs(p=>({...p,[s.id!]:e.target.value}))}/><Button type="button" size="sm" onClick={()=>onSaveGrade(s)}><Save className="size-3"/></Button></div></td></tr>)}</tbody></table></div>}</div>}{teacher&&<div className="flex justify-end border-t p-2"><Button type="button" variant="ghost" size="sm" onClick={()=>onDelete(id)}><Trash2 className="mr-1 size-3"/>Delete</Button></div>}</div>}) : <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">No assignments yet.</p>}</section>;
}
