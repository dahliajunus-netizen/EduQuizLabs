'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, Users } from 'lucide-react';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

type Props = { quizId: string; questionId?: string; totalPlayers: number; correctAnswer?: string };
type Row = { answer: string; total: number; correct: number; incorrect: number; avg_response_time_ms: number | null };
type Rank = { nickname: string; answer: string; is_correct: boolean; response_time_ms: number | null; points_earned: number; rank: number };

async function getJson(path: string) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers, cache: 'no-store' });
  const text = await r.text();
  if (!r.ok) throw new Error(text || `Request failed (${r.status})`);
  return text.trim() ? JSON.parse(text) : null;
}

export default function LiveQuizAnalytics({ quizId, questionId, totalPlayers, correctAnswer }: Props) {
  const [distribution, setDistribution] = useState<Row[]>([]);
  const [ranking, setRanking] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId || !questionId) return;
    let alive = true;
    const load = async () => {
      try {
        const [d, r] = await Promise.all([
          getJson(`rpc/live_quiz_answer_distribution?p_quiz_id=${encodeURIComponent(quizId)}&p_question_id=${encodeURIComponent(questionId)}`),
          getJson(`rpc/live_quiz_question_ranking?p_quiz_id=${encodeURIComponent(quizId)}&p_question_id=${encodeURIComponent(questionId)}`),
        ]);
        if (alive) { setDistribution(d || []); setRanking(r || []); }
      } catch { if (alive) { setDistribution([]); setRanking([]); } }
      finally { if (alive) setLoading(false); }
    };
    setLoading(true); load();
    const timer = window.setInterval(load, 1000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [quizId, questionId]);

  const counts = useMemo(() => ['A','B','C','D'].map(answer => {
    const row = distribution.find(x => x.answer === answer);
    return { answer, total: Number(row?.total || 0), avg: Number(row?.avg_response_time_ms || 0) };
  }), [distribution]);
  const answered = ranking.length;
  const unanswered = Math.max(0, totalPlayers - answered);
  const max = Math.max(1, ...counts.map(x => x.total));

  if (!questionId) return null;
  return <section className="mt-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" /><h3 className="text-lg font-black">Live Answer Results</h3></div><p className="mt-1 text-xs text-muted-foreground">Updates automatically while students answer.</p></div>
      <div className="flex gap-2 text-xs font-bold"><span className="rounded-full bg-muted px-3 py-1.5"><Users className="mr-1 inline size-3.5" />{answered}/{totalPlayers} answered</span><span className="rounded-full bg-muted px-3 py-1.5">{unanswered} waiting</span></div>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-4">{counts.map(x => <div key={x.answer} className={`rounded-2xl border p-4 ${correctAnswer === x.answer ? 'border-primary bg-primary/5' : 'bg-muted/20'}`}><div className="flex items-center justify-between"><span className="text-2xl font-black">{x.answer}</span>{correctAnswer === x.answer && <CheckCircle2 className="size-5 text-primary" />}</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(x.total / max) * 100}%` }} /></div><div className="mt-2 flex justify-between text-xs font-bold"><span>{x.total} answers</span><span>{x.avg ? `${(x.avg / 1000).toFixed(2)}s avg` : '—'}</span></div></div>)}</div>
    <div className="mt-6"><div className="mb-3 flex items-center gap-2 text-sm font-black"><Clock3 className="size-4 text-primary" />Fastest correct answers</div>{loading && !ranking.length ? <p className="rounded-2xl bg-muted/30 p-6 text-center text-sm text-muted-foreground">Loading results…</p> : ranking.filter(x => x.is_correct).slice(0, 5).map((p, i) => <div key={`${p.nickname}-${i}`} className="mb-2 flex items-center gap-3 rounded-xl border p-3"><span className="w-7 text-center font-black">{i + 1}</span><span className="flex-1 truncate font-bold">{p.nickname}</span><span className="text-xs text-muted-foreground">{p.response_time_ms == null ? '—' : `${(p.response_time_ms / 1000).toFixed(2)}s`}</span><span className="font-black">+{p.points_earned}</span></div>)}{!loading && !ranking.filter(x => x.is_correct).length && <p className="rounded-2xl bg-muted/30 p-6 text-center text-sm text-muted-foreground">No correct answers yet.</p>}</div>
  </section>;
}
