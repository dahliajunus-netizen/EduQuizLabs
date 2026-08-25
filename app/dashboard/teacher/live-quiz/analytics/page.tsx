'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BarChart3, Check, Clock, Radio, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

type Quiz = { id: string; title: string; status: string; current_question: number };
type Question = { id: string; question_order: number; question: string; correct_answer: string };
type Answer = { player_id: string; question_id: string; answer: string; correct: boolean; response_time_ms: number; points_earned: number; answered_at?: string };
type Player = { id: string; nickname: string };
const shapes = [
  { key: 'A', symbol: '▲', cls: 'bg-red-500' },
  { key: 'B', symbol: '◆', cls: 'bg-blue-500' },
  { key: 'C', symbol: '●', cls: 'bg-yellow-500 text-black' },
  { key: 'D', symbol: '■', cls: 'bg-green-500' },
];

async function api(path: string) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers, cache: 'no-store' });
  const text = await r.text();
  if (!r.ok) throw new Error(text || `Request failed (${r.status})`);
  return text.trim() ? JSON.parse(text) : null;
}

export default function LiveQuizAnalytics() {
  const router = useRouter();
  const search = useSearchParams();
  const quizId = search.get('id');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState('');

  async function load() {
    if (!quizId) return;
    try {
      const q = await api(`live_quizzes?id=eq.${encodeURIComponent(quizId)}&select=id,title,status,current_question`);
      if (!q?.[0]) throw new Error('Live quiz not found.');
      setQuiz(q[0]);
      const qs = await api(`live_quiz_questions?quiz_id=eq.${encodeURIComponent(quizId)}&select=id,question_order,question,correct_answer&order=question_order.asc`);
      setQuestions(qs || []);
      const as = await api(`live_quiz_answers?quiz_id=eq.${encodeURIComponent(quizId)}&select=player_id,question_id,answer,correct,response_time_ms,points_earned,answered_at&order=answered_at.asc`);
      setAnswers(as || []);
      const ps = await api(`live_quiz_players?quiz_id=eq.${encodeURIComponent(quizId)}&select=id,nickname`);
      setPlayers(ps || []);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load analytics.'); }
  }

  useEffect(() => { load(); const t = window.setInterval(load, 1000); return () => window.clearInterval(t); }, [quizId]);

  const current = quiz?.current_question ?? -1;
  const currentQ = questions[current];
  const currentAnswers = useMemo(() => currentQ ? answers.filter(a => a.question_id === currentQ.id) : [], [answers, currentQ]);
  const distribution = shapes.map(s => ({ ...s, count: currentAnswers.filter(a => a.answer === s.key).length }));
  const max = Math.max(1, ...distribution.map(x => x.count));
  const ranking = [...currentAnswers]
    .sort((a, b) => Number(b.correct) - Number(a.correct) || a.response_time_ms - b.response_time_ms || String(a.answered_at || '').localeCompare(String(b.answered_at || '')))
    .map((a, i) => ({ ...a, rank: i + 1, nickname: players.find(p => p.id === a.player_id)?.nickname || 'Player' }));

  if (!quizId) return <main className="flex min-h-screen items-center justify-center p-6"><Card className="max-w-md rounded-3xl"><CardContent className="p-8 text-center"><h1 className="text-2xl font-black">Live Quiz Analytics</h1><p className="mt-2 text-sm text-muted-foreground">Open this page with the live quiz id in the URL.</p></CardContent></Card></main>;

  return <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.05] px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card/90 p-5 shadow-sm backdrop-blur">
        <div className="flex items-center gap-4"><div className="relative flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><span className="absolute inset-0 animate-ping rounded-2xl bg-primary/30"/><Radio className="relative size-6"/></div><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary"><span>Live Analytics</span><span className="rounded-full bg-primary/10 px-2 py-0.5">LIVE</span></div><h1 className="text-xl font-black sm:text-2xl">{quiz?.title || 'Live Quiz'}</h1></div></div>
        <Button variant="outline" className="rounded-xl" onClick={() => router.push('/dashboard/teacher/live-quiz')}><ArrowLeft className="mr-2 size-4"/>Back to Live Quiz</Button>
      </header>
      {error && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-3"><Card className="rounded-3xl"><CardContent className="flex items-center gap-4 p-5"><div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Users/></div><div><p className="text-2xl font-black">{players.length}</p><p className="text-xs text-muted-foreground">Players</p></div></CardContent></Card><Card className="rounded-3xl"><CardContent className="flex items-center gap-4 p-5"><div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BarChart3/></div><div><p className="text-2xl font-black">{answers.length}</p><p className="text-xs text-muted-foreground">Answers recorded</p></div></CardContent></Card><Card className="rounded-3xl"><CardContent className="flex items-center gap-4 p-5"><div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Clock/></div><div><p className="text-2xl font-black">{currentAnswers.length ? (currentAnswers.reduce((n,a)=>n+a.response_time_ms,0)/currentAnswers.length/1000).toFixed(1)+'s' : '—'}</p><p className="text-xs text-muted-foreground">Average response</p></div></CardContent></Card></div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="rounded-3xl"><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="flex items-center gap-2"><BarChart3 className="size-5 text-primary"/>Answer Distribution</CardTitle><p className="mt-1 text-xs text-muted-foreground">Question {current + 1} of {questions.length}</p></div>{currentQ && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">Correct: {currentQ.correct_answer}</span>}</div></CardHeader><CardContent className="space-y-4">{currentQ ? distribution.map(x => <div key={x.key} className="grid grid-cols-[44px_1fr_42px] items-center gap-3"><div className={`flex size-11 items-center justify-center rounded-xl text-xl font-black text-white ${x.cls}`}>{x.symbol}</div><div className="h-11 overflow-hidden rounded-xl bg-muted"><div className={`flex h-full items-center rounded-xl px-3 text-sm font-black text-white transition-all duration-500 ${x.cls}`} style={{width:`${Math.max(x.count?8:0,(x.count/max)*100)}%`}}>{x.count ? `${x.count} ${x.count===1?'player':'players'}` : ''}</div></div><span className="text-right text-lg font-black tabular-nums">{x.count}</span></div>) : <div className="py-14 text-center text-sm text-muted-foreground">Waiting for the first question…</div>}<div className="rounded-2xl border bg-muted/20 p-4 text-sm"><b>{currentAnswers.filter(a=>a.correct).length}</b> correct · <b>{currentAnswers.filter(a=>!a.correct).length}</b> incorrect · <b>{Math.max(0,players.length-currentAnswers.length)}</b> not answered</div></CardContent></Card>
        <Card className="rounded-3xl"><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="size-5 text-primary"/>Question Ranking</CardTitle><p className="text-xs text-muted-foreground">Correct answers first, then fastest response.</p></CardHeader><CardContent className="space-y-2">{ranking.length ? ranking.slice(0,10).map((r)=><div key={`${r.player_id}-${r.question_id}`} className={`flex items-center gap-3 rounded-xl border p-3 ${r.rank===1?'border-primary/30 bg-primary/5':''}`}><span className="w-7 text-center font-black">{r.rank}</span><div className="min-w-0 flex-1"><p className="truncate font-bold">{r.nickname}</p><p className="text-xs text-muted-foreground">{r.answer} · {(r.response_time_ms/1000).toFixed(2)}s</p></div>{r.correct?<Check className="size-5 text-green-600"/>:<span className="text-xs font-bold text-destructive">✕</span>}</div>) : <p className="py-10 text-center text-sm text-muted-foreground">Waiting for students to answer…</p>}</CardContent></Card>
      </div>
    </div>
  </main>;
}
