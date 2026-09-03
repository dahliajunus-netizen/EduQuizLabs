'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Play, Plus, Trash2, Users, Trophy, Clock, Copy, Check, Radio, ChevronRight, BarChart3, Sparkles, X } from 'lucide-react';

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type Q = { id: string; question_order: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string; time_limit_seconds: number };
type Quiz = { id: string; title: string; class_code: string; game_code: string | null; status: string; current_question: number; is_template: boolean; question_started_at?: string | null };
type Player = { id: string; nickname: string; score: number; total_response_time_ms: number; correct_answers: number };
type Cls = { id?: string; class_name: string; school_name?: string | null; code: string };

type OptionDef = { letter: 'A' | 'B' | 'C' | 'D'; key: keyof Pick<Q, 'option_a' | 'option_b' | 'option_c' | 'option_d'>; className: string; softClass: string };
const options: OptionDef[] = [
  { letter: 'A', key: 'option_a', className: 'bg-red-500', softClass: 'bg-red-500/10 border-red-500/30 text-red-600' },
  { letter: 'B', key: 'option_b', className: 'bg-blue-500', softClass: 'bg-blue-500/10 border-blue-500/30 text-blue-600' },
  { letter: 'C', key: 'option_c', className: 'bg-yellow-500', softClass: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700' },
  { letter: 'D', key: 'option_d', className: 'bg-green-500', softClass: 'bg-green-500/10 border-green-500/30 text-green-600' },
];

function user() { try { return JSON.parse(localStorage.getItem('current_user') || '{}'); } catch { return {}; } }
function tid() { const u = user(); return String(u.id ?? u.user_id ?? u.uid ?? '').trim() || null; }
function token() { try { return localStorage.getItem('supabase_access_token') || localStorage.getItem('access_token') || localStorage.getItem('supabase.auth.token') || ''; } catch { return ''; } }
async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${url}/rest/v1/${path}`, { ...opts, headers: { apikey: key, Authorization: `Bearer ${token() || key}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }, cache: 'no-store' });
  const text = await r.text();
  if (!r.ok) throw new Error(text || `Request failed (${r.status})`);
  return text.trim() ? JSON.parse(text) : null;
}
async function rpc(name: string, body: Record<string, unknown>) { return api(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) }); }
function fmt(ms: number) { return ms > 0 ? `${(ms / 1000).toFixed(2)}s` : '—'; }
function makeCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

function Shape({ letter, className, size = 'normal' }: { letter: string; className: string; size?: 'small' | 'normal' | 'large' }) {
  const shapeClass = letter === 'A' ? '[clip-path:polygon(50%_0%,100%_100%,0%_100%)]' : letter === 'B' ? 'rotate-45 rounded-md' : letter === 'C' ? 'rounded-full' : 'rounded-md';
  const box = size === 'large' ? 'size-28 sm:size-32' : size === 'small' ? 'size-16' : 'size-20 sm:size-24';
  const inner = size === 'large' ? 'size-24 sm:size-28' : size === 'small' ? 'size-12' : 'size-16 sm:size-20';
  return <span className={`flex ${box} items-center justify-center shrink-0`}><span className={`block ${inner} ${className} ${shapeClass} shadow-sm`} /></span>;
}

export default function TeacherLiveQuiz() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Quiz[]>([]);
  const [selected, setSelected] = useState<Quiz | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [classes, setClasses] = useState<Cls[]>([]);
  const [title, setTitle] = useState('My Live Quiz');
  const [classCode, setClassCode] = useState('');
  const [qText, setQText] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [d, setD] = useState('');
  const [correct, setCorrect] = useState('A');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(30);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({ A: 0, B: 0, C: 0, D: 0 });
  const [copied, setCopied] = useState(false);
  const [pop, setPop] = useState(true);
  const poll = useRef(false);
  const current = quiz?.current_question ?? -1;
  const currentQ = questions[current];
  const totalVotes = Object.values(answerCounts).reduce((sum, n) => sum + n, 0);

  async function loadClasses() {
    try {
      const id = tid(); if (!id) return;
      const rows = await api(`teacher_classes?teacher_id=eq.${encodeURIComponent(id)}&select=id,class_name,school_name,code&order=class_name.asc`);
      setClasses(Array.isArray(rows) ? rows : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load classes.'); }
  }
  async function loadTemplates() {
    try {
      const id = tid(); if (!id) return;
      setTemplates(await api(`live_quizzes?teacher_id=eq.${encodeURIComponent(id)}&is_template=eq.true&status=eq.draft&select=id,title,class_code,game_code,status,current_question,is_template&order=created_at.desc`) || []);
    } catch { /* keep the editor usable */ }
  }
  useEffect(() => { void Promise.all([loadClasses(), loadTemplates()]); }, []);

  async function createTemplate() {
    if (!title.trim() || !classCode) { setError('Choose a class and enter a title.'); return; }
    setLoading(true); setError('');
    try {
      const rows = await api('live_quizzes', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ title: title.trim(), class_code: classCode, teacher_id: tid(), game_code: `TEMPLATE-${makeCode()}`, status: 'draft', current_question: -1, is_template: true }) });
      if (!rows?.[0]) throw new Error('Quiz was not created.');
      setSelected(rows[0]); setQuestions([]); await loadTemplates();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create quiz.'); } finally { setLoading(false); }
  }
  async function openTemplate(t: Quiz) {
    setSelected(t); setError('');
    try { setQuestions(await api(`live_quiz_questions?quiz_id=eq.${t.id}&select=*&order=question_order.asc`) || []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load quiz.'); }
  }
  async function addQuestion() {
    if (!selected || ![qText, a, b, c, d].every(x => x.trim())) { setError('Fill the question and all four answers.'); return; }
    try {
      const rows = await api('live_quiz_questions', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ quiz_id: selected.id, question_order: questions.length, question: qText.trim(), option_a: a.trim(), option_b: b.trim(), option_c: c.trim(), option_d: d.trim(), correct_answer: correct, time_limit_seconds: 30 }) });
      setQuestions(x => rows?.[0] ? [...x, rows[0]] : x); setQText(''); setA(''); setB(''); setC(''); setD(''); setCorrect('A');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not add question.'); }
  }
  async function delQuestion(item: Q) {
    if (!selected || !window.confirm(`Delete question ${questions.indexOf(item) + 1}?`)) return;
    try { await api(`live_quiz_questions?id=eq.${encodeURIComponent(item.id)}`, { method: 'DELETE' }); setQuestions(x => x.filter(y => y.id !== item.id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not delete question.'); }
  }
  async function launch() {
    if (!selected || !questions.length) { setError('Add at least one question first.'); return; }
    setLoading(true); setError('');
    try {
      const rows = await api('live_quizzes', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ title: selected.title, class_code: selected.class_code, teacher_id: tid(), game_code: makeCode(), status: 'lobby', current_question: -1, is_template: false }) });
      const live = rows?.[0] as Quiz; if (!live) throw new Error('Could not create live session.');
      const src = await api(`live_quiz_questions?quiz_id=eq.${encodeURIComponent(selected.id)}&select=question_order,question,option_a,option_b,option_c,option_d,correct_answer,time_limit_seconds&order=question_order.asc`);
      const created = await Promise.all((src || []).map((x: any) => api('live_quiz_questions', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...x, quiz_id: live.id }) })));
      setQuiz(live); setQuestions(created.flatMap((x: any) => x?.[0] ? [x[0]] : [])); setSelected(null); setPlayers([]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not launch quiz.'); } finally { setLoading(false); }
  }

  async function beginReveal(i: number) {
    if (!quiz) return;
    try { const r = await rpc('live_quiz_begin_reveal', { p_quiz_id: quiz.id, p_question_index: i }); setQuiz(r?.[0] || r || { ...quiz, status: 'question_reveal', current_question: i, question_started_at: new Date().toISOString() }); setPop(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not start question.'); }
  }
  async function beginAnswering() {
    if (!quiz) return;
    try { const r = await rpc('live_quiz_begin_answering', { p_quiz_id: quiz.id }); setQuiz(r?.[0] || r || { ...quiz, status: 'answering', question_started_at: new Date().toISOString() }); setAnsweredCount(0); setAnswerCounts({ A: 0, B: 0, C: 0, D: 0 }); setPop(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not open answers.'); }
  }
  async function showResults() {
    if (!quiz) return;
    try { const r = await rpc('live_quiz_begin_results', { p_quiz_id: quiz.id }); setQuiz(r?.[0] || r || { ...quiz, status: 'results' }); setPop(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not reveal results.'); }
  }
  async function intermission() {
    if (!quiz) return;
    try { const r = await rpc('live_quiz_begin_intermission', { p_quiz_id: quiz.id }); setQuiz(r?.[0] || r || { ...quiz, status: 'intermission' }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not start intermission.'); }
  }
  async function next() {
    if (!quiz) return;
    const n = quiz.current_question + 1;
    if (n >= questions.length) {
      const r = await api(`live_quizzes?id=eq.${encodeURIComponent(quiz.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'finished', question_started_at: null }) });
      setQuiz(r?.[0] || { ...quiz, status: 'finished' }); return;
    }
    await beginReveal(n);
  }
  async function loadLive() {
    if (!quiz || poll.current) return;
    poll.current = true;
    try {
      const [ps, qr] = await Promise.all([
        api(`live_quiz_players?quiz_id=eq.${encodeURIComponent(quiz.id)}&select=id,nickname,score,total_response_time_ms,correct_answers&order=created_at.asc`),
        api(`live_quizzes?id=eq.${encodeURIComponent(quiz.id)}&select=*`)
      ]);
      setPlayers(Array.isArray(ps) ? ps : []);
      const live = qr?.[0] as Quiz | undefined;
      if (live) setQuiz(prev => prev?.status === live.status && prev?.current_question === live.current_question && prev?.question_started_at === live.question_started_at ? prev : live);
      const active = live || quiz;
      const q = questions[active.current_question];
      if (q && (active.status === 'answering' || active.status === 'results')) {
        const rows = await api(`live_quiz_answers?quiz_id=eq.${encodeURIComponent(quiz.id)}&question_id=eq.${encodeURIComponent(q.id)}&select=answer`);
        const counts = { A: 0, B: 0, C: 0, D: 0 };
        (rows || []).forEach((x: any) => { if (x.answer in counts) counts[x.answer as keyof typeof counts]++; });
        setAnswerCounts(counts); setAnsweredCount((rows || []).length);
      }
    } catch { /* transient polling errors should not blank the screen */ }
    finally { poll.current = false; }
  }
  useEffect(() => { if (!quiz) return; void loadLive(); const t = window.setInterval(() => void loadLive(), 700); return () => window.clearInterval(t); }, [quiz?.id, quiz?.status, quiz?.current_question, quiz?.question_started_at, questions.length]);
  useEffect(() => {
    if (!quiz || !currentQ) return;
    const start = quiz.question_started_at ? new Date(quiz.question_started_at).getTime() : Date.now();
    if (quiz.status === 'question_reveal') { const t = window.setTimeout(() => void beginAnswering(), 3000); return () => window.clearTimeout(t); }
    if (quiz.status === 'answering') {
      const limit = (currentQ.time_limit_seconds || 30) * 1000;
      const tick = () => setRemaining(Math.max(0, Math.ceil((limit - (Date.now() - start)) / 1000)));
      tick(); const t = window.setInterval(tick, 100); const timeout = window.setTimeout(() => void showResults(), limit + 100);
      return () => { window.clearInterval(t); window.clearTimeout(timeout); };
    }
    if (quiz.status === 'results') { const t = window.setTimeout(() => void intermission(), 4000); return () => window.clearTimeout(t); }
    if (quiz.status === 'intermission') { const t = window.setTimeout(() => void next(), 3000); return () => window.clearTimeout(t); }
  }, [quiz?.status, quiz?.current_question, quiz?.question_started_at, currentQ?.id]);
  async function end() {
    if (!quiz || !window.confirm('End this live quiz now?')) return;
    try { const r = await api(`live_quizzes?id=eq.${encodeURIComponent(quiz.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'finished', question_started_at: null }) }); setQuiz(r?.[0] || { ...quiz, status: 'finished' }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not end quiz.'); }
  }
  async function copy() { if (!quiz?.game_code) return; try { await navigator.clipboard.writeText(quiz.game_code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }

  const ranked = useMemo(() => [...players].sort((x, y) => y.correct_answers - x.correct_answers || x.total_response_time_ms - y.total_response_time_ms), [players]);

  if (quiz) {
    if (quiz.status === 'question_reveal') return <main className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 text-center"><div className={`w-full max-w-5xl ${pop ? 'animate-in fade-in zoom-in-95 duration-500' : ''}`}><Sparkles className="mx-auto size-16 animate-pulse text-primary"/><p className="mt-6 text-xs font-black uppercase tracking-[.35em] text-primary">Question {current + 1}</p><h1 className="mt-2 text-5xl font-black sm:text-7xl">Get ready!</h1><p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">Answers open in a moment.</p><div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4">{options.map((o, i) => <div key={o.letter} style={{ animationDelay: `${i * 100}ms` }} className="animate-in fade-in slide-in-from-bottom-4 duration-500"><div className={`flex min-h-32 items-center gap-3 rounded-3xl p-5 text-left text-white shadow-xl ${o.className}`}><Shape letter={o.letter} className="bg-white" size="small"/><div><b className="text-2xl">{o.letter}</b><p className="font-bold">{currentQ?.[o.key]}</p></div></div></div>)}</div></div></main>;

    if (quiz.status === 'results') return <main className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-background px-6"><div className={`w-full max-w-6xl ${pop ? 'animate-in fade-in zoom-in-95 duration-500' : ''}`}><div className="text-center"><p className="text-xs font-black uppercase tracking-[.35em] text-primary">Results</p><h1 className="mt-2 text-5xl font-black sm:text-7xl">How did everyone do?</h1></div><div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">{options.map((o, i) => { const count = answerCounts[o.letter] || 0; const isCorrect = o.letter === currentQ?.correct_answer; return <div key={o.letter} style={{ animationDelay: `${i * 120}ms` }} className={`animate-in fade-in zoom-in-90 duration-500 overflow-hidden rounded-[2rem] border-2 p-6 text-center shadow-xl ${isCorrect ? 'ring-4 ring-green-400 ring-offset-4' : ''}`}><div className={`mx-auto flex size-28 items-center justify-center rounded-3xl ${o.className}`}><Shape letter={o.letter} className="bg-white" size="small"/></div><p className="mt-4 text-3xl font-black">{o.letter}</p><p className="mt-1 text-4xl font-black">{count}</p><p className="text-sm text-muted-foreground">vote{count === 1 ? '' : 's'}</p>{isCorrect && <div className="mt-3 rounded-xl bg-green-500/10 px-3 py-2 text-xs font-black text-green-600">✓ CORRECT</div>}</div>; })}</div><div className="mt-7 text-center text-sm font-bold text-muted-foreground">{totalVotes} total answers · intermission starts automatically</div></div></main>;

    if (quiz.status === 'intermission') return <main className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-background px-6 text-center"><div className="animate-in fade-in zoom-in-95 duration-500"><Clock className="mx-auto size-16 animate-pulse text-primary"/><p className="mt-6 text-xs font-black uppercase tracking-[.35em] text-primary">Intermission</p><h1 className="mt-2 text-6xl font-black sm:text-8xl">Get ready!</h1><p className="mt-4 text-lg text-muted-foreground">Next question coming up…</p></div></main>;

    if (quiz.status === 'finished') return <main className="min-h-screen bg-gradient-to-b from-background to-primary/[0.04] px-4 py-10"><div className="mx-auto max-w-3xl"><Card className="rounded-[2rem] text-center"><CardHeader className="p-8"><Trophy className="mx-auto size-14 text-primary"/><CardTitle className="mt-4 text-4xl font-black">Quiz Finished!</CardTitle></CardHeader><CardContent className="space-y-2 p-6">{ranked.map((p, i) => <div key={p.id} className="flex items-center gap-3 rounded-xl border p-3 text-left"><b>#{i + 1}</b><span className="flex-1 font-bold">{p.nickname}</span><span>{p.correct_answers} correct</span><span>{fmt(p.total_response_time_ms)}</span></div>)}</CardContent></Card></div></main>;

    if (quiz.status === 'lobby') return <main className="min-h-screen bg-gradient-to-b from-background to-primary/[0.04] px-4 py-6"><div className="mx-auto max-w-6xl space-y-5"><div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card p-5 shadow-sm"><div><p className="text-xs font-black uppercase tracking-wider text-primary">Teacher Host · Lobby</p><h1 className="text-2xl font-black">{quiz.title}</h1></div><Button variant="outline" onClick={end}><X className="mr-2 size-4"/>End Quiz</Button></div><Card className="border-0 bg-primary text-primary-foreground shadow-xl"><CardContent className="py-9 text-center"><p className="text-xs font-black uppercase tracking-[.3em] opacity-80">Game Code</p><div className="mt-2 flex items-center justify-center gap-3"><span className="font-mono text-5xl font-black tracking-[.22em]">{quiz.game_code}</span><Button size="icon" variant="secondary" onClick={copy}>{copied ? <Check/> : <Copy/>}</Button></div><p className="mt-2 text-sm opacity-80">Students can join now</p></CardContent></Card><div className="grid gap-5 lg:grid-cols-[1fr_320px]"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary"/>Players in lobby <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{players.length}</span></CardTitle></CardHeader><CardContent>{players.length ? <div className="grid gap-3 sm:grid-cols-2">{players.map((p, i) => <div key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4 animate-in fade-in slide-in-from-bottom-2 duration-300"><div className="flex size-11 items-center justify-center rounded-full bg-primary/10 font-black text-primary">{p.nickname.trim().charAt(0).toUpperCase() || '?'}</div><div className="min-w-0"><p className="truncate font-black">{p.nickname}</p><p className="text-xs text-muted-foreground">Player {i + 1}</p></div></div>)}</div> : <div className="py-14 text-center"><Users className="mx-auto size-12 text-muted-foreground/50"/><p className="mt-4 font-bold">Waiting for players…</p><p className="mt-1 text-sm text-muted-foreground">Names will appear here as students join.</p></div>}</CardContent></Card><Card><CardContent className="flex h-full flex-col items-center justify-center p-8 text-center"><div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10"><Users className="size-9 text-primary"/></div><p className="mt-5 text-5xl font-black">{players.length}</p><p className="text-muted-foreground">players connected</p><Button size="lg" className="mt-7 w-full" disabled={!questions.length} onClick={() => void beginReveal(0)}><Play className="mr-2 size-5"/>Start Question 1</Button></CardContent></Card></div></div></main>;

    if (!currentQ) return <main className="flex min-h-screen items-center justify-center"><Clock className="size-8 animate-spin text-primary"/></main>;
    const pct = Math.max(0, Math.min(100, (remaining / Math.max(1, currentQ.time_limit_seconds || 30)) * 100));
    return <main className="min-h-screen bg-gradient-to-b from-background to-primary/[0.04] px-4 py-6"><div className="mx-auto max-w-7xl space-y-5"><div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card p-5 shadow-sm"><div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Radio className="size-5"/></div><div><p className="text-xs font-black uppercase tracking-wider text-primary">Teacher Host</p><h1 className="text-xl font-black">{quiz.title}</h1></div></div><div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 px-4 py-2 font-black text-primary">Question {current + 1} / {questions.length}</span><Button variant="outline" onClick={end}><X className="mr-2 size-4"/>End Quiz</Button></div></div><div className="grid gap-5 lg:grid-cols-[1fr_330px]"><Card className="overflow-hidden rounded-[2rem] border-0 shadow-xl"><CardHeader className="border-b text-center"><div className="flex items-center justify-between"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black">{quiz.status === 'answering' ? 'ANSWERS OPEN' : 'RESULTS'}</span>{quiz.status === 'answering' && <span className="rounded-xl bg-primary/10 px-4 py-2 text-xl font-black text-primary">{remaining}s</span>}</div><CardTitle className="mt-6 text-3xl sm:text-4xl">{currentQ.question}</CardTitle><div className="mx-auto mt-5 h-2 w-full max-w-2xl overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width] duration-100" style={{ width: `${pct}%` }}/></div></CardHeader><CardContent className="p-5"><div className="grid grid-cols-2 gap-4">{options.map((o, i) => { const count = answerCounts[o.letter] || 0; const isCorrect = o.letter === currentQ.correct_answer; return <div key={o.letter} style={{ animationDelay: `${i * 100}ms` }} className={`relative min-h-44 overflow-hidden rounded-[1.5rem] p-5 text-white shadow-xl animate-in fade-in zoom-in-95 duration-500 ${o.className} ${quiz.status === 'results' && isCorrect ? 'ring-4 ring-green-300 ring-offset-2' : ''}`}><div className="flex h-full items-center gap-4"><Shape letter={o.letter} className="bg-white" size="normal"/><div className="min-w-0 flex-1"><span className="text-sm font-black opacity-80">ANSWER {o.letter}</span><p className="mt-1 text-xl font-black sm:text-2xl">{currentQ[o.key]}</p>{quiz.status === 'results' && <p className="mt-3 text-sm font-black">{count} vote{count === 1 ? '' : 's'} {isCorrect ? '· ✓ CORRECT' : ''}</p>}</div></div>{quiz.status === 'answering' && count > 0 && <span className="absolute right-3 top-3 rounded-full bg-black/15 px-3 py-1 text-sm font-black backdrop-blur">{count}</span>}</div>; })}</div>{quiz.status === 'answering' && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 p-4"><p className="font-bold text-muted-foreground">{answeredCount} / {players.length} answered</p><Button onClick={() => void showResults()}>Skip & Reveal Results<ChevronRight className="ml-2 size-4"/></Button></div>}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="size-5 text-primary"/>Live Votes</CardTitle></CardHeader><CardContent className="space-y-3">{options.map(o => { const count = answerCounts[o.letter] || 0; const isCorrect = quiz.status === 'results' && o.letter === currentQ.correct_answer; return <div key={o.letter} className={`rounded-2xl border p-3 ${isCorrect ? 'border-green-500 bg-green-500/10' : ''}`}><div className="flex items-center justify-between"><span className="font-black">{o.letter}</span><span className="font-black">{count}</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-muted"><div className={`h-full ${o.className} transition-[width] duration-500`} style={{ width: `${totalVotes ? (count / totalVotes) * 100 : 0}%` }}/></div><p className="mt-1 text-xs text-muted-foreground">{totalVotes ? Math.round((count / totalVotes) * 100) : 0}% of answers</p></div>; })}</CardContent></Card></div></div></main>;
  }

  return <main className="min-h-screen bg-gradient-to-b from-background to-primary/[0.04] px-4 py-8"><div className="mx-auto max-w-6xl space-y-5"><div className="flex items-center gap-3"><Button variant="outline" size="icon" onClick={() => router.push('/dashboard/teacher')}><ArrowLeft/></Button><div><p className="text-xs font-black uppercase tracking-wider text-primary">Live Quiz Studio</p><h1 className="text-3xl font-black">Create a Live Quiz</h1><p className="text-sm text-muted-foreground">Build with visual answer cards, then host it live.</p></div></div>{error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}<Card><CardHeader><CardTitle>New Quiz</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quiz title"/><select className="h-10 rounded-xl border bg-background px-3" value={classCode} onChange={e => setClassCode(e.target.value)}><option value="">Choose class</option>{classes.map(x => <option key={x.id || x.code} value={x.code}>{x.class_name}{x.school_name ? ` — ${x.school_name}` : ''} ({x.code})</option>)}</select><Button className="sm:col-span-2" disabled={loading || !classCode} onClick={() => void createTemplate()}><Plus className="mr-2 size-4"/>Create Quiz</Button></CardContent></Card>{templates.length > 0 && <Card><CardHeader><CardTitle>Your Quiz Templates</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{templates.map(t => <div key={t.id} className="group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"><button className="w-full text-left" onClick={() => void openTemplate(t)}><div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Radio className="size-5"/></div><div className="min-w-0 flex-1"><b className="block truncate">{t.title}</b><p className="text-xs text-muted-foreground">Class {t.class_code}</p></div></div></button><Button className="mt-3" size="sm" variant="outline" onClick={async () => { if (!window.confirm('Delete this quiz template?')) return; try { await api(`live_quiz_questions?quiz_id=eq.${encodeURIComponent(t.id)}`, { method: 'DELETE' }); await api(`live_quizzes?id=eq.${encodeURIComponent(t.id)}`, { method: 'DELETE' }); setTemplates(x => x.filter(y => y.id !== t.id)); if (selected?.id === t.id) setSelected(null); } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete template.'); } }}><Trash2 className="mr-2 size-4"/>Delete</Button></div>)}</CardContent></Card>}{selected && <Card className="overflow-hidden rounded-[2rem]"><CardHeader><CardTitle>Build: {selected.title}</CardTitle></CardHeader><CardContent className="space-y-5"><Input value={qText} onChange={e => setQText(e.target.value)} placeholder="Question"/><div className="grid gap-4 sm:grid-cols-2">{([['A', a, setA, 'red'], ['B', b, setB, 'blue'], ['C', c, setC, 'yellow'], ['D', d, setD, 'green']] as const).map(([letter, value, setter, color]) => <div key={letter} className={`rounded-2xl border-2 p-3 ${correct === letter ? 'ring-2 ring-primary ring-offset-2' : ''}`}><div className="mb-2 flex items-center gap-2"><div className={`flex size-10 items-center justify-center rounded-xl ${color === 'red' ? 'bg-red-500' : color === 'blue' ? 'bg-blue-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'} text-white`}><Shape letter={letter} className="bg-white" size="small"/></div><span className="font-black">Answer {letter}</span><button type="button" className="ml-auto text-xs font-black text-primary" onClick={() => setCorrect(letter)}>Set correct</button></div><Input value={value} onChange={e => setter(e.target.value)} placeholder={`Answer ${letter}`} className="h-12 rounded-xl"/></div>)}</div><div className="rounded-2xl border bg-muted/30 p-4"><p className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">Correct answer</p><div className="grid grid-cols-4 gap-2">{options.map(o => <button type="button" key={o.letter} onClick={() => setCorrect(o.letter)} className={`rounded-xl border-2 p-3 text-center transition-all ${correct === o.letter ? 'border-primary bg-primary/10 shadow-sm' : 'border-transparent bg-background'}`}><div className={`mx-auto flex size-12 items-center justify-center rounded-xl ${o.className}`}><Shape letter={o.letter} className="bg-white" size="small"/></div><p className="mt-2 text-xs font-black">{o.letter}</p></button>)}</div></div><Button onClick={() => void addQuestion()}><Plus className="mr-2 size-4"/>Add Question</Button>{questions.length > 0 && <div className="space-y-3">{questions.map((x, i) => <div key={x.id} className="rounded-2xl border p-4"><div className="flex gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-black text-primary">{i + 1}</div><div className="min-w-0 flex-1"><p className="font-black">{x.question}</p><div className="mt-3 grid grid-cols-2 gap-2">{options.map(o => <div key={o.letter} className={`flex items-center gap-2 rounded-xl border p-2 text-sm ${o.letter === x.correct_answer ? 'ring-2 ring-primary' : ''}`}><div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${o.className}`}><Shape letter={o.letter} className="bg-white" size="small"/></div><span className="truncate">{x[o.key]}</span></div>)}</div></div><Button size="icon" variant="outline" onClick={() => void delQuestion(x)}><Trash2 className="size-4"/></Button></div></div>)}</div>}<Button size="lg" className="w-full" disabled={!questions.length || loading} onClick={() => void launch()}><Play className="mr-2 size-5"/>Launch Live Quiz</Button></CardContent></Card>}</div></main>;
}
