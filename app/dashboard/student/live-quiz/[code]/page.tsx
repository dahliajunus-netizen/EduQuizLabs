'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
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
  const router=useRouter();
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
  const loadInFlight=useRef(false);
  const lastStateKey=useRef('');

  async function load(){
    if(loadInFlight.current)return;
    loadInFlight.current=true;
    try{
      const qr=await api(`live_quizzes?game_code=eq.${encodeURIComponent(code)}&select=*`);
      if(!qr?.[0])throw new Error('Game not found.');
      const qz=qr[0] as Quiz;
      setQuiz(prev=>prev?.status===qz.status&&prev?.current_question===qz.current_question&&prev?.question_started_at===qz.question_started_at?prev:qz);
      const [qs,ps]=await Promise.all([
        api(`live_quiz_questions?quiz_id=eq.${encodeURIComponent(qz.id)}&select=*&order=question_order.asc`),
        api(`live_quiz_players?quiz_id=eq.${encodeURIComponent(qz.id)}&nickname=eq.${encodeURIComponent(nickname)}&select=*`),
      ]);
      if(Array.isArray(qs))setQuestions(qs);
      if(ps?.[0])setPlayer(ps[0]);
      if(qz.status==='finished'){
        const all=await api(`live_quiz_players?quiz_id=eq.${encodeURIComponent(qz.id)}&select=*&order=correct_answers.desc,total_response_time_ms.asc`);
        setRanking(all||[]);
      }
    }catch(e){setError(e instanceof Error?e.message:'Could not load quiz.');}
    finally{loadInFlight.current=false;}
  }

  useEffect(()=>{void load();const t=window.setInterval(()=>void load(),1000);return()=>window.clearInterval(t);},[code,nickname]);
  const currentIndex=quiz?.current_question??-1;
  const currentQ=questions[currentIndex];
  const answering=quiz?.status==='answering';
  const revealing=quiz?.status==='question_reveal';

  useEffect(()=>{
    const stateKey=`${quiz?.id||''}:${quiz?.current_question??-1}:${currentQ?.id||''}`;
    if(stateKey===lastStateKey.current)return;
    lastStateKey.current=stateKey;
    setAnswered(false);setAnswer('');setSubmitting(false);setRemaining(30);
  },[quiz?.id,quiz?.current_question,currentQ?.id]);

  useEffect(()=>{
    if(!answering||!quiz?.question_started_at)return;
    const start=new Date(quiz.question_started_at).getTime();
    const tick=()=>setRemaining(Math.max(0,Math.ceil((30000-(Date.now()-start))/1000)));
    tick();const t=window.setInterval(tick,100);return()=>window.clearInterval(t);
  },[answering,quiz?.question_started_at,quiz?.current_question]);

  async function join(){
    if(player||!quiz||joining)return;
    setJoining(true);setError('');
    try{const rows=await api('live_quiz_players',{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({quiz_id:quiz.id,student_id:sid(),nickname})});setPlayer(rows?.[0]||null);}
    catch(e){setError(e instanceof Error?e.message:'Could not join the lobby.');}
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

  if(error&&!quiz)return <main className="flex min-h-screen items-center justify-center bg-background px-5"><Card className="w-full max-w-md rounded-[2rem] shadow-2xl"><CardContent className="p-8 text-center"><h1 className="text-2xl font-black">Unable to join game</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button variant="outline" className="mt-5 rounded-xl" onClick={()=>router.push('/dashboard/student')}><ArrowLeft className="mr-2 size-4"/>Back to Dashboard</Button></CardContent></Card></main>;
  if(!quiz)return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.16),transparent_55%)]"/><div className="relative flex items-center gap-3 rounded-2xl border bg-card/90 px-5 py-4 font-semibold text-muted-foreground shadow-xl backdrop-blur"><Loader2 className="size-5 animate-spin text-primary"/>Connecting to live quiz…</div></main>;
  if(!player)return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.22),transparent_55%)]"/><Card className="relative w-full max-w-md overflow-hidden rounded-[2rem] border-0 shadow-2xl"><div className="bg-primary p-9 text-center text-primary-foreground"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-foreground/15"><Zap className="size-7"/></div><p className="mt-4 text-[11px] font-black uppercase tracking-[0.3em] opacity-80">Live Quiz</p><h1 className="mt-2 text-3xl font-black">{quiz.title}</h1></div><CardContent className="space-y-5 p-7 text-center"><div className="rounded-2xl border bg-muted/30 p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Playing as</p><p className="mt-1 text-xl font-black">{nickname}</p></div><Button size="lg" className="h-13 w-full rounded-2xl font-black shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[.98]" onClick={join} disabled={joining}>{joining?<><Loader2 className="mr-2 size-5 animate-spin"/>Joining…</>:<>Join Lobby <Zap className="ml-2 size-5"/></>}</Button>{error&&<p className="text-sm text-destructive">{error}</p>}</CardContent></Card></main>;
  if(quiz.status==='lobby')return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,hsl(var(--primary)/.18),transparent_42%)]"/><div className="relative w-full max-w-xl text-center"><div className="mx-auto flex size-24 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/20 animate-[pulse_3s_ease-in-out_infinite]"><Wifi className="size-10"/></div><p className="mt-7 text-[11px] font-black uppercase tracking-[0.35em] text-primary">Connected to host</p><h1 className="mt-2 text-5xl font-black tracking-tight sm:text-6xl">You're in!</h1><p className="mx-auto mt-4 max-w-md text-muted-foreground">Your device is ready. Keep this screen open and watch the teacher's screen for the next question.</p><div className="mx-auto mt-8 rounded-[2rem] border bg-card/90 p-6 shadow-xl backdrop-blur"><div className="flex items-center justify-center gap-2"><span className="size-2.5 animate-pulse rounded-full bg-green-500"/><span className="font-bold">Waiting for the host to start</span></div><div className="mt-6 grid grid-cols-4 gap-2.5">{shapes.map(s=><div key={s.letter} className={`flex h-16 items-center justify-center rounded-2xl ${s.className} text-3xl font-black text-white shadow-md transition-transform duration-300 hover:-translate-y-1`}>{s.symbol}</div>)}</div></div></div></main>;
  if(quiz.status==='finished')return <main className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.12),transparent_50%)] px-4 py-8 sm:py-12"><div className="mx-auto max-w-2xl"><Card className="overflow-hidden rounded-[2rem] border-0 shadow-2xl"><CardHeader className="bg-primary/5 p-8 text-center sm:p-10"><div className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-primary/10"><Trophy className="size-10 text-primary"/></div><p className="mt-5 text-[11px] font-black uppercase tracking-[0.3em] text-primary">Game complete</p><CardTitle className="mt-2 text-4xl font-black tracking-tight">Quiz Finished!</CardTitle><div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3"><div className="rounded-2xl border bg-card p-4"><p className="text-2xl font-black">{player.correct_answers}</p><p className="text-xs text-muted-foreground">Correct</p></div><div className="rounded-2xl border bg-card p-4"><p className="text-2xl font-black">{player.score}</p><p className="text-xs text-muted-foreground">Points</p></div></div></CardHeader><CardContent className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-black">Final leaderboard</p><p className="text-xs text-muted-foreground">{ranking.length} players</p></div><div className="space-y-2">{ranking.map((p,i)=><div key={p.id} className={`flex items-center gap-3 rounded-2xl border p-4 transition-all duration-300 ${p.id===player.id?'border-primary bg-primary/10 shadow-sm':''}`}><span className={`flex size-9 items-center justify-center rounded-xl font-black ${i<3?'bg-primary/10 text-primary':'bg-muted'}`}>{i+1}</span><span className="flex-1 truncate font-bold">{p.nickname}{p.id===player.id&&<span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">YOU</span>}</span><span className="text-sm font-black">{p.score} pts</span></div>)}</div><Button className="mt-6 h-11 w-full rounded-xl" onClick={()=>router.push('/dashboard/student')}><ArrowLeft className="mr-2 size-4"/>Back to Student Dashboard</Button></CardContent></Card></div></main>;
  if(!currentQ)return <main className="flex min-h-screen items-center justify-center bg-background text-center"><div><Loader2 className="mx-auto size-9 animate-spin text-primary"/><p className="mt-4 font-black">Waiting for the next question…</p></div></main>;
  if(revealing)return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.15),transparent_55%)]"/><div className="relative w-full max-w-3xl text-center animate-in fade-in zoom-in-95 duration-500"><div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="size-8 animate-pulse"/></div><p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-primary">Get ready</p><h1 className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-6xl">{currentQ.question}</h1><div className="mx-auto mt-8 rounded-[2rem] border bg-card/90 p-7 shadow-xl backdrop-blur"><Lock className="mx-auto size-8 text-primary"/><p className="mt-3 font-black">Answers are being revealed…</p><p className="mt-1 text-sm text-muted-foreground">Get ready to choose quickly.</p><div className="mt-6 grid grid-cols-4 gap-2">{shapes.map(s=><div key={s.letter} className={`flex h-16 items-center justify-center rounded-2xl ${s.className} text-3xl font-black text-white opacity-35`}>{s.symbol}</div>)}</div></div></div></main>;
  const progress=Math.max(0,Math.min(100,(remaining/30)*100));
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.11),transparent_48%)] px-3 py-3 sm:px-5 sm:py-5"><div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-4xl flex-col"><div className="mb-3 flex items-center justify-between rounded-2xl border bg-card/90 px-4 py-3 shadow-lg backdrop-blur-xl sm:px-5"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Live Quiz</p><p className="text-sm font-black">Question {currentIndex+1} <span className="text-muted-foreground">/ {questions.length}</span></p></div><div className={`relative flex min-w-20 items-center justify-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-xl font-black transition-all duration-300 ${remaining<=5?'bg-destructive/10 text-destructive animate-pulse':'bg-primary/10 text-primary'}`}><div className="absolute inset-y-0 left-0 bg-current opacity-[0.1] transition-[width] duration-100" style={{width:`${progress}%`}}/><Clock className="relative size-5"/><span className="relative tabular-nums">{remaining}s</span></div></div><Card className="flex flex-1 flex-col overflow-hidden rounded-[2rem] border-0 bg-card/95 shadow-2xl"><CardHeader className="px-5 pb-4 pt-6 text-center sm:px-8 sm:pt-8"><div className="mx-auto inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 text-[10px] font-black tracking-wider text-green-700 dark:text-green-300"><span className="size-1.5 animate-pulse rounded-full bg-green-500"/>ANSWERS ARE OPEN</div><CardTitle className="mt-4 text-xl sm:text-2xl">Choose your answer</CardTitle><p className="mt-1 text-xs text-muted-foreground">Tap once — your answer locks immediately.</p></CardHeader><CardContent className="flex flex-1 flex-col justify-center p-3 sm:p-6"><div className="grid grid-cols-2 gap-3 sm:gap-5">{shapes.map(s=>{const selected=answer===s.letter;return <button key={s.letter} disabled={answered||submitting||remaining<=0} onClick={()=>submit(s.letter)} className={`group relative flex min-h-[30vh] max-h-80 flex-col items-center justify-center overflow-hidden rounded-[1.6rem] ${s.className} text-white shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60 ${selected?'scale-[0.98] ring-4 ring-white/90 brightness-110 shadow-2xl':''}`}><span className="text-[clamp(4rem,14vw,7.5rem)] leading-none drop-shadow-md transition-transform duration-300 group-hover:scale-105">{s.symbol}</span><span className="mt-3 rounded-xl bg-black/10 px-3 py-1 text-xs font-black tracking-widest">{s.letter}</span>{selected&&<span className="absolute right-3 top-3 rounded-full bg-white/20 p-2 animate-in zoom-in duration-200"><Check className="size-4"/></span>}</button>})}</div><div className="mt-4 min-h-9 text-center">{answered?<div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm font-black text-green-700 shadow-sm dark:text-green-300"><Check className="size-4"/>{submitting?'Submitting answer…':'Answer locked — wait for the next question.'}</div>:remaining<=0?<p className="font-black text-destructive">Time's up.</p>:<p className="text-xs text-muted-foreground">Faster correct answers improve your ranking.</p>}{error&&<p className="mt-2 text-sm text-destructive">{error}</p>}</div></CardContent></Card></div></main>;
}
