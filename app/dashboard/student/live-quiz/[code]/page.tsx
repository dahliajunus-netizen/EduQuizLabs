'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, Loader2, Trophy, Wifi, Zap, ArrowLeft, Lock, Sparkles } from 'lucide-react';

type Quiz = { id:string; title:string; status:string; current_question:number; question_started_at?:string|null; game_code?:string|null };
type Q = { id:string; question_order:number; question:string; option_a:string; option_b:string; option_c:string; option_d:string; correct_answer:string; time_limit_seconds:number };
type Player = { id:string; nickname:string; score:number; total_response_time_ms:number; correct_answers:number };

const url=(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'');
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
const shapes=[
  {letter:'A',symbol:'▲',className:'bg-red-500 hover:bg-red-600'},
  {letter:'B',symbol:'◆',className:'bg-blue-500 hover:bg-blue-600'},
  {letter:'C',symbol:'●',className:'bg-yellow-500 hover:bg-yellow-600'},
  {letter:'D',symbol:'■',className:'bg-green-500 hover:bg-green-600'},
];

function sid(){try{const u=JSON.parse(localStorage.getItem('current_user')||'{}');const id=u.student_id??u.id??u.user_id??u.uid;return id?String(id):null;}catch{return null;}}
async function api(path:string,opts:RequestInit={}){const r=await fetch(`${url}/rest/v1/${path}`,{...opts,headers:{...headers,...(opts.headers||{})},cache:'no-store'});const text=await r.text();if(!r.ok)throw new Error(text||`Request failed (${r.status})`);if(!text.trim())return null;return JSON.parse(text);}

export default function LiveQuizGame(){
  const params=useParams<{code:string}>();
  const search=useSearchParams();
  const code=String(params?.code||'').toUpperCase();
  const nickname=search.get('name')||'Player';

  const [quiz,setQuiz]=useState<Quiz|null>(null);
  const [questions,setQuestions]=useState<Q[]>([]);
  const [player,setPlayer]=useState<Player|null>(null);
  const [answer,setAnswer]=useState('');
  const [answered,setAnswered]=useState(false);
  const [error,setError]=useState('');
  const [remaining,setRemaining]=useState(30);
  const [joining,setJoining]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [ranking,setRanking]=useState<Player[]>([]);

  async function load(){
    try{
      const qr=await api(`live_quizzes?game_code=eq.${encodeURIComponent(code)}&select=*`);
      if(!qr?.[0])throw new Error('Game not found.');
      const qz=qr[0] as Quiz;
      setQuiz(qz);
      const qs=await api(`live_quiz_questions?quiz_id=eq.${encodeURIComponent(qz.id)}&select=*&order=question_order.asc`);
      setQuestions(qs||[]);
      const ps=await api(`live_quiz_players?quiz_id=eq.${encodeURIComponent(qz.id)}&nickname=eq.${encodeURIComponent(nickname)}&select=*`);
      if(ps?.[0])setPlayer(ps[0]);
      if(qz.status==='finished'){
        const all=await api(`live_quiz_players?quiz_id=eq.${encodeURIComponent(qz.id)}&select=*&order=correct_answers.desc,total_response_time_ms.asc`);
        setRanking(all||[]);
      }
    }catch(e){setError(e instanceof Error?e.message:'Could not load quiz.');}
  }

  useEffect(()=>{load();const t=window.setInterval(load,800);return()=>window.clearInterval(t);},[code,nickname]);

  const currentIndex=quiz?.current_question??-1;
  const currentQ=questions[currentIndex];
  const answering=quiz?.status==='answering';
  const revealing=quiz?.status==='question_reveal';

  useEffect(()=>{
    setAnswered(false);
    setAnswer('');
    setSubmitting(false);
  },[quiz?.current_question,quiz?.status,currentQ?.id]);

  useEffect(()=>{
    if(!answering||!quiz?.question_started_at)return;
    const start=new Date(quiz.question_started_at).getTime();
    const tick=()=>setRemaining(Math.max(0,Math.ceil((30000-(Date.now()-start))/1000)));
    tick();
    const t=window.setInterval(tick,100);
    return()=>window.clearInterval(t);
  },[answering,quiz?.question_started_at,quiz?.current_question]);

  async function join(){
    if(player||!quiz||joining)return;
    setJoining(true);setError('');
    try{
      const rows=await api('live_quiz_players',{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({quiz_id:quiz.id,student_id:sid(),nickname})});
      setPlayer(rows?.[0]||null);
    }catch(e){setError(e instanceof Error?e.message:'Could not join the lobby.');}
    finally{setJoining(false);}
  }

  async function submit(value:string){
    if(!quiz||!player||answered||submitting||!answering||!currentQ||remaining<=0)return;
    setAnswer(value);setAnswered(true);setSubmitting(true);setError('');
    try{
      const start=quiz.question_started_at?new Date(quiz.question_started_at).getTime():Date.now();
      const elapsed=Math.min(30000,Math.max(0,Date.now()-start));
      const correct=value===currentQ.correct_answer;
      await api('live_quiz_answers',{method:'POST',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({quiz_id:quiz.id,question_id:currentQ.id,player_id:player.id,answer:value,correct,response_time_ms:elapsed,points_earned:correct?1:0})});
      const nextCorrect=Number(player.correct_answers||0)+(correct?1:0);
      const nextTime=Number(player.total_response_time_ms||0)+elapsed;
      const nextScore=Number(player.score||0)+(correct?1:0);
      const rows=await api(`live_quiz_players?id=eq.${encodeURIComponent(player.id)}`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({correct_answers:nextCorrect,total_response_time_ms:nextTime,score:nextScore})});
      setPlayer(rows?.[0]||{...player,correct_answers:nextCorrect,total_response_time_ms:nextTime,score:nextScore});
    }catch(e){setAnswered(false);setSubmitting(false);setError(e instanceof Error?e.message:'Could not submit answer.');}
  }

  if(error&&!quiz)return <main className="flex min-h-screen items-center justify-center px-5"><Card className="w-full max-w-md rounded-[2rem]"><CardContent className="p-8 text-center"><h1 className="text-2xl font-black">Unable to join game</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p></CardContent></Card></main>;

  if(!quiz)return <main className="flex min-h-screen items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-4 font-semibold text-muted-foreground shadow-lg"><Loader2 className="size-5 animate-spin text-primary"/>Connecting to live quiz…</div></main>;

  if(!player)return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.2),transparent_48%)] px-5"><Card className="w-full max-w-md overflow-hidden rounded-[2rem] border-0 shadow-2xl"><div className="bg-primary p-9 text-center text-primary-foreground"><Zap className="mx-auto size-9"/><p className="mt-4 text-[11px] font-black uppercase tracking-[0.3em]">Live Quiz</p><h1 className="mt-2 text-3xl font-black">{quiz.title}</h1></div><CardContent className="space-y-5 p-7 text-center"><div className="rounded-2xl border bg-muted/30 p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Playing as</p><p className="mt-1 text-xl font-black">{nickname}</p></div><Button size="lg" className="h-13 w-full rounded-2xl font-black" onClick={join} disabled={joining}>{joining?<><Loader2 className="mr-2 size-5 animate-spin"/>Joining…</>:<>Join Lobby <Zap className="ml-2 size-5"/></>}</Button>{error&&<p className="text-sm text-destructive">{error}</p>}</CardContent></Card></main>;

  if(quiz.status==='lobby')return <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5"><div className="w-full max-w-xl text-center"><div className="mx-auto flex size-24 animate-pulse items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-2xl"><Wifi className="size-10"/></div><p className="mt-7 text-[11px] font-black uppercase tracking-[0.35em] text-primary">Connected to host</p><h1 className="mt-2 text-5xl font-black">You're in!</h1><p className="mt-4 text-muted-foreground">Keep your eyes on the teacher's screen. Your device is your answer controller.</p><div className="mx-auto mt-8 rounded-[2rem] border bg-card p-6 shadow-xl"><div className="flex items-center justify-center gap-2"><span className="size-2.5 animate-pulse rounded-full bg-green-500"/><span className="font-bold">Waiting for the host to start</span></div><div className="mt-6 grid grid-cols-4 gap-2.5">{shapes.map(s=><div key={s.letter} className={`flex h-16 items-center justify-center rounded-2xl ${s.className} text-3xl font-black text-white`}>{s.symbol}</div>)}</div></div></div></main>;

  if(quiz.status==='finished')return <main className="min-h-screen px-4 py-8"><div className="mx-auto max-w-2xl"><Card className="overflow-hidden rounded-[2rem] border-0 shadow-2xl"><CardHeader className="bg-primary/5 p-10 text-center"><Trophy className="mx-auto size-16 text-primary"/><p className="mt-5 text-[11px] font-black uppercase tracking-[0.3em] text-primary">Game complete</p><CardTitle className="mt-2 text-4xl font-black">Quiz Finished!</CardTitle><p className="mt-3 text-muted-foreground"><b className="text-foreground">{player.correct_answers}</b> correct</p></CardHeader><CardContent className="p-5"><div className="space-y-2">{ranking.map((p,i)=><div key={p.id} className={`flex items-center gap-3 rounded-2xl border p-4 ${p.id===player.id?'border-primary bg-primary/10':''}`}><span className="flex size-9 items-center justify-center rounded-xl bg-muted font-black">{i+1}</span><span className="flex-1 truncate font-bold">{p.nickname}{p.id===player.id&&<span className="ml-2 text-xs text-primary">YOU</span>}</span><span className="text-sm font-black">{p.correct_answers} correct</span></div>)}</div><Button variant="outline" className="mt-6 w-full rounded-xl" onClick={()=>window.location.reload()}><ArrowLeft className="mr-2 size-4"/>Back</Button></CardContent></Card></div></main>;

  if(!currentQ)return <main className="flex min-h-screen items-center justify-center text-center"><div><Loader2 className="mx-auto size-9 animate-spin text-primary"/><p className="mt-4 font-black">Waiting for the next question…</p></div></main>;

  if(revealing)return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.15),transparent_50%)] px-5"><div className="w-full max-w-3xl text-center"><div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="size-8"/></div><p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-primary">Get ready</p><h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">{currentQ.question}</h1><div className="mx-auto mt-8 rounded-[2rem] border bg-card p-7 shadow-xl"><Lock className="mx-auto size-8 text-primary"/><p className="mt-3 font-black">Answers are being revealed…</p><p className="mt-1 text-sm text-muted-foreground">You can answer when all four choices appear.</p><div className="mt-6 grid grid-cols-4 gap-2">{shapes.map(s=><div key={s.letter} className={`flex h-16 items-center justify-center rounded-2xl ${s.className} text-3xl font-black text-white opacity-40`}>{s.symbol}</div>)}</div></div></div></main>;

  const progress=Math.max(0,Math.min(100,(remaining/30)*100));
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.1),transparent_45%)] px-3 py-3 sm:px-5 sm:py-5"><div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-4xl flex-col"><div className="mb-3 flex items-center justify-between rounded-2xl border bg-card/85 px-4 py-3 shadow-sm"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Live Quiz</p><p className="text-sm font-black">Question {currentIndex+1} <span className="text-muted-foreground">/ {questions.length}</span></p></div><div className={`relative flex items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-xl font-black ${remaining<=5?'bg-destructive/10 text-destructive animate-pulse':'bg-primary/10 text-primary'}`}><div className="absolute inset-y-0 left-0 bg-current opacity-[0.08]" style={{width:`${progress}%`}}/><Clock className="relative size-5"/><span className="relative tabular-nums">{remaining}s</span></div></div><Card className="flex flex-1 flex-col overflow-hidden rounded-[2rem] border-0 shadow-2xl"><CardHeader className="px-5 pb-4 pt-6 text-center sm:px-8 sm:pt-8"><div className="mx-auto inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 text-[10px] font-black tracking-wider text-green-700 dark:text-green-300"><span className="size-1.5 animate-pulse rounded-full bg-green-500"/>ANSWERS ARE OPEN</div><CardTitle className="mt-4 text-xl sm:text-2xl">Choose your answer</CardTitle><p className="mt-1 text-xs text-muted-foreground">Tap once — your answer locks immediately.</p></CardHeader><CardContent className="flex flex-1 flex-col justify-center p-3 sm:p-6"><div className="grid grid-cols-2 gap-3 sm:gap-5">{shapes.map(s=>{const selected=answer===s.letter;return <button key={s.letter} disabled={answered||submitting||remaining<=0} onClick={()=>submit(s.letter)} className={`group relative flex min-h-[37vh] max-h-80 flex-col items-center justify-center overflow-hidden rounded-[1.6rem] ${s.className} text-white shadow-xl transition-all duration-150 hover:-translate-y-1 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-65 ${selected?'scale-[0.98] ring-8 ring-white/70 brightness-110':''}`}><span className="text-[clamp(4rem,14vw,7.5rem)] leading-none drop-shadow-md">{s.symbol}</span><span className="mt-3 rounded-xl bg-black/10 px-3 py-1 text-xs font-black tracking-widest">{s.letter}</span>{selected&&<span className="absolute right-3 top-3 rounded-full bg-white/20 p-2"><Check className="size-4"/></span>}</button>})}</div><div className="mt-4 min-h-9 text-center">{answered?<div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm font-black text-green-700 dark:text-green-300"><Check className="size-4"/>Answer locked — wait for the next question.</div>:remaining<=0?<p className="font-black text-destructive">Time's up.</p>:<p className="text-xs text-muted-foreground">Faster correct answers improve your ranking.</p>}{error&&<p className="mt-2 text-sm text-destructive">{error}</p>}</div></CardContent></Card></div></main>;
}
