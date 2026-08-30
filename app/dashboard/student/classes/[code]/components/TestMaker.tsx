'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Pencil, PlusCircle, Save, Trash2, X } from 'lucide-react';

export type BuilderQuestion = { id?:string; question:string; option_a:string; option_b:string; option_c:string; option_d:string; correct_answer:'A'|'B'|'C'|'D'; points:number };
type Props={title:string;setTitle:(v:string)=>void;description:string;setDescription:(v:string)=>void;dueDate:string;setDueDate:(v:string)=>void;questions:BuilderQuestion[];busy?:boolean;message?:string;onSaveDetails:()=>void;onAddQuestion:()=>void;onEditQuestion:(q:BuilderQuestion)=>void;onDeleteQuestion:(q:BuilderQuestion)=>void;onClose:()=>void;pointsFor:(n:number)=>number;testId?:string};
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
const getHeaders=()=>{let token='';try{token=localStorage.getItem('supabase_access_token')||'';}catch{}return {apikey:key,Authorization:`Bearer ${token||key}`,'Content-Type':'application/json',Prefer:'return=representation'}};

function parseDueDate(value:string){
  const digits=value.replace(/\D/g,'');
  if(!digits)return null;
  if(digits.length!==8)return null;
  const day=Number(digits.slice(0,2)),month=Number(digits.slice(2,4)),year=Number(digits.slice(4,8));
  const d=new Date(year,month-1,day);
  if(d.getFullYear()!==year||d.getMonth()!==month-1||d.getDate()!==day)return null;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

export default function TestMaker({title,setTitle,description,setDescription,dueDate,setDueDate,questions,busy,message,onSaveDetails,onAddQuestion,onEditQuestion,onDeleteQuestion,onClose,pointsFor,testId}:Props){
 const [saving,setSaving]=useState(false);
 const [saveMessage,setSaveMessage]=useState('');
 const handleDueDateChange=(raw:string)=>{const digits=raw.replace(/\D/g,'').slice(0,8);let formatted=digits;if(digits.length>4)formatted=`${digits.slice(0,2)} / ${digits.slice(2,4)} / ${digits.slice(4)}`;else if(digits.length>2)formatted=`${digits.slice(0,2)} / ${digits.slice(2)}`;setDueDate(formatted);};
 const saveDetails=async()=>{
   if(saving||busy||!testId)return;
   const cleanTitle=title.trim();
   if(!cleanTitle){setSaveMessage('Test title is required.');return;}
   const due=parseDueDate(dueDate);
   if(dueDate.trim()&&!due){setSaveMessage('Enter a valid due date as DD / MM / YYYY.');return;}
   setSaving(true);setSaveMessage('');
   try{
     const response=await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(testId)}`,{method:'PATCH',headers:getHeaders(),body:JSON.stringify({title:cleanTitle,description:description.trim()||null,due_date:due})});
     const text=await response.text();
     if(!response.ok)throw new Error(text||`Failed to save test details (${response.status})`);
     setTitle(cleanTitle);setSaveMessage('Test details saved successfully.');
     try{await onSaveDetails();}catch{}
   }catch(e){setSaveMessage(e instanceof Error?e.message:'Failed to save test details.');}
   finally{setSaving(false);}
 };
 const shownMessage=saveMessage||message||'';
 const success=shownMessage.toLowerCase().includes('saved')||shownMessage.toLowerCase().includes('success');
 return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"><div className="mx-auto my-6 w-full max-w-4xl"><Card><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>Test Maker</CardTitle><p className="mt-1 text-sm text-muted-foreground">Build the entire test here.</p></div><Button type="button" variant="ghost" size="sm" onClick={onClose}><X/></Button></CardHeader><CardContent className="space-y-6">
   <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium">Test title</label><Input name="test-title" autoComplete="off" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Test title" disabled={saving}/></div><div className="space-y-2"><label className="text-sm font-medium">Due date</label><Input name="test-due-date" type="text" inputMode="numeric" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={dueDate} onChange={e=>handleDueDateChange(e.target.value)} placeholder="DD / MM / YYYY" maxLength={14} disabled={saving}/></div></div>
   <div className="space-y-2"><label className="text-sm font-medium">Description</label><textarea name="test-description" autoComplete="off" className="w-full rounded border bg-background p-2" rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the test" disabled={saving}/></div>
   <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3"><div><b>{questions.length} questions</b><p className="text-xs text-muted-foreground">100 points total · {questions.length?`${pointsFor(questions.length)} points per question`:'add questions to calculate points'}</p></div><Button type="button" onClick={saveDetails} disabled={busy||saving||!testId}><Save className="mr-2 size-4"/>{saving?'Saving...':'Save Test Details'}</Button></div>
   {shownMessage&&<p className={`text-sm ${success?'text-green-600 dark:text-green-400':'text-destructive'}`}>{shownMessage}</p>}
   <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Questions</h3><Button type="button" onClick={onAddQuestion} disabled={busy||saving}><PlusCircle className="mr-2 size-4"/>Add Question</Button></div>{questions.length===0&&<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No questions yet. Add your first question.</div>}{questions.map((q,i)=>{const tf=q.option_a==='True'&&q.option_b==='False'&&!q.option_c&&!q.option_d;return <div key={q.id??i} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-medium">{i+1}. {q.question}</p>{tf?<p className="mt-2 text-sm">True · False</p>:<div className="mt-2 grid gap-1 text-sm md:grid-cols-2"><span>A. {q.option_a}</span><span>B. {q.option_b}</span><span>C. {q.option_c}</span><span>D. {q.option_d}</span></div>}<p className="mt-2 text-xs text-muted-foreground">Correct answer: <b>{tf?(q.correct_answer==='A'?'True':'False'):q.correct_answer}</b> · {pointsFor(questions.length)} points</p></div><div className="flex shrink-0 gap-1"><Button type="button" variant="outline" size="sm" onClick={()=>onEditQuestion(q)}><Pencil className="mr-1 size-3"/>Edit</Button><Button type="button" variant="ghost" size="sm" onClick={()=>onDeleteQuestion(q)}><Trash2 className="size-3"/></Button></div></div></div>})}</div>
   <div className="flex justify-end"><Button type="button" variant="outline" onClick={onClose}>{busy?<Loader2 className="size-4 animate-spin"/>:'Done — Return to Tests'}</Button></div>
 </CardContent></Card></div></div>;
}
