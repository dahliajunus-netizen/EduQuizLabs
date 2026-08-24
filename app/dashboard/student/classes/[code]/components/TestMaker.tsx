'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Pencil, PlusCircle, Save, Trash2, X, Eye, EyeOff, Lock } from 'lucide-react';

export type BuilderQuestion = { id?:string; question:string; option_a:string; option_b:string; option_c:string; option_d:string; correct_answer:'A'|'B'|'C'|'D'; points:number };
type Props={title:string;setTitle:(v:string)=>void;description:string;setDescription:(v:string)=>void;dueDate:string;setDueDate:(v:string)=>void;questions:BuilderQuestion[];busy?:boolean;message?:string;onSaveDetails:()=>void;onAddQuestion:()=>void;onEditQuestion:(q:BuilderQuestion)=>void;onDeleteQuestion:(q:BuilderQuestion)=>void;onClose:()=>void;pointsFor:(n:number)=>number};
const url=process.env.NEXT_PUBLIC_SUPABASE_URL!; const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
const marker='[[EQ_PASSWORD:';
function stripMarker(v:string){return v.replace(/^\[\[EQ_PASSWORD:[^\]]+\]\]\s*/,'');}
function encodePassword(v:string){return btoa(encodeURIComponent(v));}

export default function TestMaker({title,setTitle,description,setDescription,dueDate,setDueDate,questions,busy,message,onSaveDetails,onAddQuestion,onEditQuestion,onDeleteQuestion,onClose,pointsFor}:Props){
 const [password,setPassword]=useState(''); const [showPassword,setShowPassword]=useState(false); const [savingPassword,setSavingPassword]=useState(false); const [passwordMessage,setPasswordMessage]=useState('');
 async function saveAll(){
   setPasswordMessage(''); onSaveDetails();
   if(!title.trim()) return;
   setSavingPassword(true);
   try{
     await new Promise(resolve=>setTimeout(resolve,300));
     const r=await fetch(`${url}/rest/v1/tests?title=eq.${encodeURIComponent(title.trim())}&select=id,description&order=created_at.desc&limit=1`,{headers,cache:'no-store'});
     const rows=await r.json(); if(!r.ok||!rows[0]) throw new Error('Could not find the test to save its password.');
     const clean=stripMarker(description.trim());
     const stored=password.trim()?`${marker}${encodePassword(password.trim())}]] ${clean}`:clean;
     const p=await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(rows[0].id)}`,{method:'PATCH',headers,body:JSON.stringify({description:stored||null})});
     if(!p.ok) throw new Error(await p.text());
     setPasswordMessage(password.trim()?'Test password saved.':'Test password removed.');
   }catch(e){setPasswordMessage(e instanceof Error?e.message:'Failed to save test password.');}finally{setSavingPassword(false);}
 }
 return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"><div className="mx-auto my-6 w-full max-w-4xl"><Card><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>Test Maker</CardTitle><p className="mt-1 text-sm text-muted-foreground">Build the entire test here.</p></div><Button type="button" variant="ghost" size="sm" onClick={onClose}><X/></Button></CardHeader><CardContent className="space-y-6">
   <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium">Test title</label><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Test title"/></div><div className="space-y-2"><label className="text-sm font-medium">Due date</label><Input value={dueDate} onChange={e=>setDueDate(e.target.value)} placeholder="DD/MM/YYYY"/></div></div>
   <div className="space-y-2"><label className="text-sm font-medium">Description</label><textarea className="w-full rounded border bg-background p-2" rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the test"/></div>
   <div className="rounded-lg border p-4"><div className="mb-3 flex items-center gap-2"><Lock className="size-4"/><div><p className="font-medium">Test Password <span className="text-xs font-normal text-muted-foreground">(optional)</span></p><p className="text-xs text-muted-foreground">Students must enter this before starting the test.</p></div></div><div className="flex gap-2"><Input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Leave empty for no password"/><Button type="button" variant="outline" size="icon" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff className="size-4"/>:<Eye className="size-4"/>}</Button></div>{passwordMessage&&<p className="mt-2 text-sm text-muted-foreground">{passwordMessage}</p>}</div>
   <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3"><div><b>{questions.length} questions</b><p className="text-xs text-muted-foreground">100 points total · {questions.length?`${pointsFor(questions.length)} points per question`:'add questions to calculate points'}</p></div><Button type="button" onClick={saveAll} disabled={busy||savingPassword}><Save className="mr-2 size-4"/>{savingPassword?'Saving...':'Save Test Details'}</Button></div>
   {message&&<p className="text-sm text-destructive">{message}</p>}
   <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Questions</h3><Button type="button" onClick={onAddQuestion} disabled={busy}><PlusCircle className="mr-2 size-4"/>Add Question</Button></div>{questions.length===0&&<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No questions yet. Add your first question.</div>}{questions.map((q,i)=>{const tf=q.option_a==='True'&&q.option_b==='False'&&!q.option_c&&!q.option_d;return <div key={q.id??i} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-medium">{i+1}. {q.question}</p>{tf?<p className="mt-2 text-sm">True · False</p>:<div className="mt-2 grid gap-1 text-sm md:grid-cols-2"><span>A. {q.option_a}</span><span>B. {q.option_b}</span><span>C. {q.option_c}</span><span>D. {q.option_d}</span></div>}<p className="mt-2 text-xs text-muted-foreground">Correct answer: <b>{tf?(q.correct_answer==='A'?'True':'False'):q.correct_answer}</b> · {pointsFor(questions.length)} points</p></div><div className="flex shrink-0 gap-1"><Button type="button" variant="outline" size="sm" onClick={()=>onEditQuestion(q)}><Pencil className="mr-1 size-3"/>Edit</Button><Button type="button" variant="ghost" size="sm" onClick={()=>onDeleteQuestion(q)}><Trash2 className="size-3"/></Button></div></div></div>})}</div>
   <div className="flex justify-end"><Button type="button" variant="outline" onClick={onClose}>{busy?<Loader2 className="size-4 animate-spin"/>:'Done — Return to Tests'}</Button></div>
 </CardContent></Card></div></div>;
}
