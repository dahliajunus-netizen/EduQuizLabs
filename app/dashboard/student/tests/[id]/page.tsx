'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

type Test = { id: string; class_code: string; title: string; description: string | null; published: boolean };
type Question = { id: string; test_id: string; question_order: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: 'A'|'B'|'C'|'D'; points: number };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
function getStudentId(){ try { const raw=localStorage.getItem('current_user'); if(!raw)return null; const u=JSON.parse(raw); return String(u.student_id ?? u.id ?? u.user_id ?? u.uid ?? '').trim() || null; } catch{return null;} }

export default function TakeTestPage(){
  const params=useParams<{id:string}>(); const router=useRouter(); const id=String(params?.id||'');
  const [test,setTest]=useState<Test|null>(null); const [questions,setQuestions]=useState<Question[]>([]); const [answers,setAnswers]=useState<Record<string,string>>({}); const [loading,setLoading]=useState(true); const [submitting,setSubmitting]=useState(false); const [result,setResult]=useState<number|null>(null); const [already,setAlready]=useState(false);
  useEffect(()=>{ if(!id)return; (async()=>{ try{
    const tr=await fetch(`${url}/rest/v1/tests?id=eq.${encodeURIComponent(id)}&published=eq.true&select=*`,{headers,cache:'no-store'}); const td=await tr.json(); if(!tr.ok||!td[0]) throw new Error('Test not found or not published.'); setTest(td[0]);
    const qr=await fetch(`${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(id)}&select=*&order=question_order.asc`,{headers,cache:'no-store'}); if(!qr.ok)throw new Error(await qr.text()); setQuestions(await qr.json());
    const sid=getStudentId(); if(!sid)throw new Error('Student UUID not found. Please sign in again.'); const sr=await fetch(`${url}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(sid)}&select=*`,{headers,cache:'no-store'}); if(sr.ok){const data=await sr.json(); if(data[0]){setAlready(true);setResult(Math.min(100,Number(data[0].score)||0));}}
  }catch(e){console.error(e);alert(e instanceof Error?e.message:'Failed to load test.');router.push('/dashboard/student/tests');}finally{setLoading(false);}})();},[id,router]);
  async function submit(){ if(already||!test||!questions.length)return; const sid=getStudentId(); if(!sid){alert('Student UUID not found. Please sign in again.');return;} if(questions.some(q=>!answers[q.id])){alert('Please answer every question before submitting.');return;} setSubmitting(true); try{
    const latest=await fetch(`${url}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(id)}&student_id=eq.${encodeURIComponent(sid)}&select=id,score`,{headers,cache:'no-store'}); if(latest.ok&& (await latest.json()).length){setAlready(true);alert('You have already submitted this test.');return;}
    const total=questions.reduce((s,q)=>s+Math.max(0,Number(q.points)||0),0); const earned=questions.reduce((s,q)=>s+(answers[q.id]===q.correct_answer?Math.max(0,Number(q.points)||0):0),0); const score=total>0?Math.min(100,Math.round((earned/total)*10000)/100):0;
    const r=await fetch(`${url}/rest/v1/test_submissions`,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({test_id:id,student_id:sid,answers,score})}); if(!r.ok)throw new Error(await r.text()); setResult(score);setAlready(true);
  }catch(e){console.error(e);alert(e instanceof Error?e.message:'Failed to submit test.');}finally{setSubmitting(false);}}
  if(loading)return <div className="min-h-screen bg-background"><Navbar/><div className="flex h-[70vh] items-center justify-center"><Loader2 className="size-8 animate-spin"/></div></div>;
  return <div className="min-h-screen bg-background"><Navbar/><main className="container mx-auto max-w-3xl space-y-6 px-6 py-8"><Link href="/dashboard/student/tests"><Button variant="ghost" className="gap-2"><ArrowLeft className="size-4"/>Back to Tests</Button></Link>{test&&<><div><h1 className="text-3xl font-bold">{test.title}</h1><p className="text-muted-foreground">Class: {test.class_code}</p>{test.description&&<p className="mt-2 text-sm text-muted-foreground">{test.description}</p>}</div>{already&&result!==null?<Card><CardContent className="py-10 text-center"><CheckCircle2 className="mx-auto mb-4 size-12 text-primary"/><h2 className="text-2xl font-bold">Test Submitted</h2><p className="mt-2 text-muted-foreground">Your automatic score is</p><p className="mt-1 text-5xl font-bold text-primary">{Math.min(100,result)}<span className="text-xl">/100</span></p></CardContent></Card>:<><div className="space-y-4">{questions.map((q,i)=><Card key={q.id}><CardHeader><CardTitle className="text-lg">{i+1}. {q.question}</CardTitle><p className="text-xs text-muted-foreground">{Math.max(0,Number(q.points)||0)} point{Number(q.points)===1?'':'s'}</p></CardHeader><CardContent className="grid gap-2">{(['A','B','C','D'] as const).map(letter=>{const text=q[`option_${letter.toLowerCase()}` as 'option_a'|'option_b'|'option_c'|'option_d'];return <label key={letter} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent"><input type="radio" name={q.id} checked={answers[q.id]===letter} onChange={()=>setAnswers(a=>({...a,[q.id]:letter}))}/><span><b>{letter}.</b> {text}</span></label>})}</CardContent></Card>)}</div><Button className="w-full" size="lg" onClick={submit} disabled={submitting||!questions.length}>{submitting?<><Loader2 className="mr-2 size-4 animate-spin"/>Submitting...</>:'Submit Test'}</Button></>}</>}</main></div>;
}
