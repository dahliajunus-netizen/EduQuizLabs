'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, Check, ChevronRight, Clock3, Copy, Crown, Loader2, Play, Plus, Radio, Sparkles, Trash2, Trophy, Users, X, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type Q = { id: string; question_order: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string; time_limit_seconds: number };
type Quiz = { id: string; title: string; class_code: string; game_code: string | null; status: string; current_question: number; is_template: boolean; question_started_at?: string | null };
type Player = { id: string; nickname: string; score: number; total_response_time_ms: number; correct_answers: number };
type Cls = { id?: string; class_name: string; school_name?: string | null; code: string };
type Opt = { letter: 'A' | 'B' | 'C' | 'D'; key: 'option_a' | 'option_b' | 'option_c' | 'option_d'; bg: string; soft: string; shape: 'triangle' | 'diamond' | 'circle' | 'square' };

const options: Opt[] = [
  { letter: 'A', key: 'option_a', bg: 'bg-red-500', soft: 'bg-red-500/10 border-red-500/25 text-red-600', shape: 'triangle' },
  { letter: 'B', key: 'option_b', bg: 'bg-blue-500', soft: 'bg-blue-500/10 border-blue-500/25 text-blue-600', shape: 'diamond' },
  { letter: 'C', key: 'option_c', bg: 'bg-yellow-500', soft: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-700', shape: 'circle' },
  { letter: 'D', key: 'option_d', bg: 'bg-green-500', soft: 'bg-green-500/10 border-green-500/25 text-green-600', shape: 'square' },
];

const STATUS_ORDER: Record<string, number> = { draft: 0, lobby: 1, question_reveal: 2, answering: 3, results: 4, intermission: 5, finished: 6 };

function currentUser() { try { return JSON.parse(localStorage.getItem('current_user') || '{}'); } catch { return {}; } }
function teacherId() { const u = currentUser(); return String(u.id ?? u.user_id ?? u.uid ?? '').trim() || null; }
function accessToken() { try { return localStorage.getItem('supabase_access_token') || localStorage.getItem('access_token') || localStorage.getItem('supabase.auth.token') || ''; } catch { return ''; } }
async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${url}/rest/v1/${path}`, { ...opts, headers: { apikey: key, Authorization: `Bearer ${accessToken() || key}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }, cache: 'no-store' });
  const text = await r.text();
  if (!r.ok) throw new Error(text || `Request failed (${r.status})`);
  return text.trim() ? JSON.parse(text) : null;
}
async function rpc(name: string, body: Record<string, unknown>) { return api(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) }); }
function makeCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
function fmt(ms: number) { return ms > 0 ? `${(ms / 1000).toFixed(2)}s` : '—'; }

function Shape({ opt, size = 'md' }: { opt: Opt; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'size-24 sm:size-28' : size === 'sm' ? 'size-11' : 'size-16 sm:size-20';
  const base = size === 'lg' ? 'size-20 sm:size-24' : size === 'sm' ? 'size-9' : 'size-14 sm:size-16';
  const shape = opt.shape === 'triangle' ? '[clip-path:polygon(50%_0%,100%_100%,0%_100%)]' : opt.shape === 'diamond' ? 'rotate-45 rounded-[5px]' : opt.shape === 'circle' ? 'rounded-full' : 'rounded-[5px]';
  return <span className={`inline-flex ${box} shrink-0 items-center justify-center`}><span className={`${base} ${opt.bg} ${shape} block shadow-sm`} /></span>;
}
function OptionIcon({ opt }: { opt: Opt }) { return <Shape opt={opt} size="sm" />; }

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
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [c, setC] = useState(''); const [d, setD] = useState('');
  const [correct, setCorrect] = useState('A');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(30);
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({ A: 0, B: 0, C: 0, D: 0 });
  const [copied, setCopied] = useState(false);
  const [pop, setPop] = useState(true);
  const poll = useRef(false);
  const current = quiz?.current_question ?? -1;
  const currentQ = questions[current];
  const totalVotes = Object.values(answerCounts).reduce((s, n) => s + n, 0);
  const joinUrl = typeof window !== 'undefined' && quiz?.game_code ? `${window.location.origin}/join?code=${encodeURIComponent(quiz.game_code)}` : '';

  const loadClasses = useCallback(async () => {
    try { const id = teacherId(); if (!id) return; const rows = await api(`teacher_classes?teacher_id=eq.${encodeURIComponent(id)}&select=id,class_name,school_name,code&order=class_name.asc`); setClasses(Array.isArray(rows) ? rows : []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load classes.'); }
  }, []);
  const loadTemplates = useCallback(async () => {
    try { const id = teacherId(); if (!id) return; setTemplates(await api(`live_quizzes?teacher_id=eq.${encodeURIComponent(id)}&is_template=eq.true&status=eq.draft&select=id,title,class_code,game_code,status,current_question,is_template&order=created_at.desc`) || []); }
    catch { /* editor remains usable */ }
  }, []);
  useEffect(() => { void Promise.all([loadClasses(), loadTemplates()]); }, [loadClasses, loadTemplates]);
  async function createTemplate() {
    if (!title.trim() || !classCode) { setError('Choose a class and enter a title.'); return; }
    setLoading(true); setError('');
    try { const rows = await api('live_quizzes', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ title: title.trim(), class_code: classCode, teacher_id: teacherId(), game_code: `TEMPLATE-${makeCode()}`, status: 'draft', current_question: -1, is_template: true }) }); if (!rows?.[0]) throw new Error('Quiz was not created.'); setSelected(rows[0]); setQuestions([]); await loadTemplates(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not create quiz.'); } finally { setLoading(false); }
  }
  async function openTemplate(t: Quiz) { setSelected(t); setError(''); try { setQuestions(await api(`live_quiz_questions?quiz_id=eq.${t.id}&select=*&order=question_order.asc`) || []); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load quiz.'); } }
  async function addQuestion() {
    if (!selected || ![qText, a, b, c, d].every(x => x.trim())) { setError('Fill the question and all four answers.'); return; }
    try { const rows = await api('live_quiz_questions', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ quiz_id: selected.id, question_order: questions.length, question: qText.trim(), option_a: a.trim(), option_b: b.trim(), option_c: c.trim(), option_d: d.trim(), correct_answer: correct, time_limit_seconds: 30 }) }); if (rows?.[0]) setQuestions(x => [...x, rows[0]]); setQText(''); setA(''); setB(''); setC(''); setD(''); setCorrect('A'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not add question.'); }
  }
  async function delQuestion(item: Q) { if (!selected || !window.confirm(`Delete question ${questions.indexOf(item) + 1}?`)) return; try { await api(`live_quiz_questions?id=eq.${encodeURIComponent(item.id)}`, { method: 'DELETE' }); setQuestions(x => x.filter(y => y.id !== item.id)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete question.'); } }
  async function launch() {
    if (!selected || !questions.length) { setError('Add at least one question first.'); return; }
    setLoading(true); setError('');
    try {
      const rows = await api('live_quizzes', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ title: selected.title, class_code: selected.class_code, teacher_id: teacherId(), game_code: makeCode(), status: 'lobby', current_question: -1, is_template: false }) });
      const live = rows?.[0] as Quiz; if (!live) throw new Error('Could not create live session.');
      const src = await api(`live_quiz_questions?quiz_id=eq.${encodeURIComponent(selected.id)}&select=question_order,question,option_a,option_b,option_c,option_d,correct_answer,time_limit_seconds&order=question_order.asc`);
      const created = await Promise.all((src || []).map((x: any) => api('live_quiz_questions', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...x, quiz_id: live.id }) })));
      setQuiz(live); setQuestions(created.flatMap((x: any) => x?.[0] ? [x[0]] : [])); setSelected(null); setPlayers([]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not launch quiz.'); } finally { setLoading(false); }
  }
  async function beginReveal(i: number) { if (!quiz) return; try { const r = await rpc('live_quiz_begin_reveal', { p_quiz_id: quiz.id, p_question_index: i }); setQuiz(r?.[0] || r || { ...quiz, status: 'question_reveal', current_question: i, question_started_at: new Date().toISOString() }); setPop(true); } catch (e) { setError(e instanceof Error ? e.message : 'Could not start question.'); } }
  async function beginAnswering() { if (!quiz) return; try { const r = await rpc('live_quiz_begin_answering', { p_quiz_id: quiz.id }); setQuiz(r?.[0] || r || { ...quiz, status: 'answering', question_started_at: new Date().toISOString() }); setAnswerCounts({ A: 0, B: 0, C: 0, D: 0 }); setPop(true); } catch (e) { setError(e instanceof Error ? e.message : 'Could not open answers.'); } }
  async function showResults() { if (!quiz) return; try { const r = await rpc('live_quiz_begin_results', { p_quiz_id: quiz.id }); setQuiz(r?.[0] || r || { ...quiz, status: 'results' }); setPop(true); } catch (e) { setError(e instanceof Error ? e.message : 'Could not reveal results.'); } }
  async function intermission() { if (!quiz) return; try { const r = await rpc('live_quiz_begin_intermission', { p_quiz_id: quiz.id }); setQuiz(r?.[0] || r || { ...quiz, status: 'intermission' }); } catch (e) { setError(e instanceof Error ? e.message : 'Could not start intermission.'); } }
  async function next() { if (!quiz) return; const n = quiz.current_question + 1; if (n >= questions.length) { const r = await api(`live_quizzes?id=eq.${encodeURIComponent(quiz.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'finished', question_started_at: null }) }); setQuiz(r?.[0] || { ...quiz, status: 'finished' }); return; } await beginReveal(n); }
  const loadLive = useCallback(async () => {
    if (!quiz || poll.current) return; poll.current = true;
    try {
      const [ps, qr] = await Promise.all([api(`live_quiz_players?quiz_id=eq.${encodeURIComponent(quiz.id)}&select=id,nickname,score,total_response_time_ms,correct_answers&order=created_at.asc`), api(`live_quizzes?id=eq.${encodeURIComponent(quiz.id)}&select=*`)]);
      setPlayers(Array.isArray(ps) ? ps : []);
      const live = qr?.[0] as Quiz | undefined;
      if (live) {
        setQuiz(prev => {
          if (!prev) return live;
          const prevIndex = prev.current_question;
          const liveIndex = live.current_question;
          // A delayed poll from the previous question must never overwrite a
          // newer question that the teacher has already advanced to.
          if (liveIndex < prevIndex) return prev;
          const sameQuestion = prevIndex === liveIndex;
          const prevRank = STATUS_ORDER[prev.status] ?? 0;
          const liveRank = STATUS_ORDER[live.status] ?? 0;
          if (sameQuestion && liveRank < prevRank) return prev;
          return prev.status === live.status && sameQuestion && prev.question_started_at === live.question_started_at ? prev : live;
        });
      }
      const active = live || quiz; const q = questions[active.current_question];
      if (q && (active.status === 'answering' || active.status === 'results')) { const rows = await api(`live_quiz_answers?quiz_id=eq.${encodeURIComponent(quiz.id)}&question_id=eq.${encodeURIComponent(q.id)}&select=answer`); const counts = { A: 0, B: 0, C: 0, D: 0 }; (rows || []).forEach((x: any) => { if (x.answer in counts) counts[x.answer as keyof typeof counts]++; }); setAnswerCounts(counts); }
    } catch { /* polling can briefly fail */ } finally { poll.current = false; }
  }, [quiz, questions]);
  useEffect(() => { if (!quiz) return; void loadLive(); const t = window.setInterval(() => void loadLive(), 700); return () => window.clearInterval(t); }, [quiz?.id, quiz?.status, quiz?.current_question, quiz?.question_started_at, questions.length, loadLive]);
  useEffect(() => {
    if (!quiz || !currentQ) return;
    const start = quiz.question_started_at ? new Date(quiz.question_started_at).getTime() : Date.now();
    if (quiz.status === 'question_reveal') { const t = window.setTimeout(() => void beginAnswering(), 7600); return () => window.clearTimeout(t); }
    if (quiz.status === 'answering') { const limit = (currentQ.time_limit_seconds || 30) * 1000; const tick = () => setRemaining(Math.max(0, Math.ceil((limit - (Date.now() - start)) / 1000))); tick(); const t = window.setInterval(tick, 100); const timeout = window.setTimeout(() => void showResults(), limit + 100); return () => { window.clearInterval(t); window.clearTimeout(timeout); }; }
    if (quiz.status === 'results') { const t = window.setTimeout(() => void intermission(), 4000); return () => window.clearTimeout(t); }
  }, [quiz?.status, quiz?.current_question, quiz?.question_started_at, currentQ?.id]);
  useEffect(() => { if (quiz?.status === 'intermission') { const t = window.setTimeout(() => void next(), 5000); return () => window.clearTimeout(t); } }, [quiz?.status, quiz?.current_question]);

  if (!quiz) return <main className="min-h-screen bg-muted/30 px-4 py-8"><div className="mx-auto max-w-6xl"><div className="flex items-center gap-3"><Button variant="ghost" onClick={() => router.push('/dashboard/teacher')}><ArrowLeft className="mr-2 size-4" />Back</Button><div><p className="text-xs font-black uppercase tracking-[.3em] text-primary">Live Quiz</p><h1 className="text-3xl font-black">Host a fast-paced quiz</h1></div></div><div className="mt-7 grid gap-6 lg:grid-cols-2"><Card className="rounded-3xl"><CardContent className="space-y-4 p-6"><div className="flex items-center gap-2 text-sm font-bold"><Sparkles className="size-4 text-primary" />Create a live quiz</div><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quiz title" /><select value={classCode} onChange={e => setClassCode(e.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 text-sm"> <option value="">Choose class</option>{classes.map(c => <option key={c.code} value={c.code}>{c.class_name}{c.school_name ? ` — ${c.school_name}` : ''}</option>)}</select><Button onClick={createTemplate} disabled={loading} className="w-full rounded-xl">{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}Create quiz</Button>{error && <p className="text-sm text-destructive">{error}</p>}</CardContent></Card>
    <Card className="rounded-3xl"><CardContent className="p-6"><h2 className="font-black">Your saved quizzes</h2><div className="mt-4 space-y-2">{templates.length ? templates.map(t => <button key={t.id} onClick={() => void openTemplate(t)} className="flex w-full items-center justify-between rounded-2xl border p-4 text-left hover:bg-muted/50"><span><b>{t.title}</b><span className="mt-1 block text-xs text-muted-foreground">{t.class_code}</span></span><ChevronRight className="size-4 text-muted-foreground" /></button>) : <p className="text-sm text-muted-foreground">No saved quizzes yet.</p>}</div></CardContent></Card>
  </div>{selected && <Card className="mt-6 rounded-3xl"><CardContent className="space-y-5 p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-primary">Editing</p><h2 className="text-2xl font-black">{selected.title}</h2></div><Button variant="outline" onClick={() => setSelected(null)}>Close</Button></div><div className="grid gap-4 md:grid-cols-2"><Input value={qText} onChange={e => setQText(e.target.value)} placeholder="Question" /><div className="grid grid-cols-2 gap-2"><Input value={a} onChange={e => setA(e.target.value)} placeholder="Answer A" /><Input value={b} onChange={e => setB(e.target.value)} placeholder="Answer B" /><Input value={c} onChange={e => setC(e.target.value)} placeholder="Answer C" /><Input value={d} onChange={e => setD(e.target.value)} placeholder="Answer D" /></div></div><div className="flex flex-wrap items-center gap-3"><select value={correct} onChange={e => setCorrect(e.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm"><option>A</option><option>B</option><option>C</option><option>D</option></select><Button onClick={addQuestion} className="rounded-xl"><Plus className="mr-2 size-4" />Add question</Button><Button onClick={() => void launch()} disabled={!questions.length} className="rounded-xl"><Play className="mr-2 size-4" />Launch live quiz</Button></div><div className="space-y-2">{questions.map((item,i)=><div key={item.id} className="flex items-center justify-between rounded-2xl border p-4"><div><b>Question {i+1}</b><p className="text-sm text-muted-foreground">{item.question}</p></div><Button variant="ghost" size="icon" onClick={() => void delQuestion(item)}><Trash2 className="size-4" /></Button></div>)}</div></CardContent></Card>}</div></main>;
  if (quiz.status === 'finished') return <main className="min-h-screen bg-muted/30 px-4 py-8 sm:py-12"><div className="mx-auto max-w-5xl"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.3em] text-primary">Live quiz complete</p><h1 className="mt-1 text-4xl font-black">{quiz.title}</h1></div><Button onClick={() => router.push('/dashboard/teacher')} className="rounded-xl">Back to Dashboard</Button></div><Card className="mt-7 rounded-3xl"><CardContent className="p-6 sm:p-8"><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-primary/10 p-5"><Radio className="size-5 text-primary" /><p className="mt-3 text-2xl font-black">{players.length}</p><p className="text-xs font-bold uppercase text-muted-foreground">Players</p></div><div className="rounded-2xl bg-primary/10 p-5"><Trophy className="size-5 text-primary" /><p className="mt-3 text-2xl font-black">{players.reduce((m,p)=>Math.max(m,p.correct_answers),0)}</p><p className="text-xs font-bold uppercase text-muted-foreground">Best correct</p></div><div className="rounded-2xl bg-primary/10 p-5"><Clock3 className="size-5 text-primary" /><p className="mt-3 text-2xl font-black">{players.length ? fmt(Math.min(...players.map(p=>p.total_response_time_ms))) : '—'}</p><p className="text-xs font-bold uppercase text-muted-foreground">Fastest total</p></div></div><div className="mt-7 overflow-hidden rounded-2xl border"><div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 bg-muted/60 px-4 py-3 text-xs font-black uppercase text-muted-foreground"><span>#</span><span>Player</span><span>Correct</span><span>Time</span></div>{[...players].sort((x,y)=>y.correct_answers-x.correct_answers||x.total_response_time_ms-y.total_response_time_ms).map((p,i)=><div key={p.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-t px-4 py-3"><span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-black">{i+1}</span><span className="min-w-0 truncate font-bold">{p.nickname}</span><span className="text-sm font-black">{p.correct_answers}</span><span className="text-xs font-semibold text-muted-foreground">{fmt(p.total_response_time_ms)}</span></div>)}</div></CardContent></Card></div></main>;
  const isIntermission = quiz.status === 'intermission';
  const isReveal = quiz.status === 'question_reveal';
  const isAnswering = quiz.status === 'answering';
  const isResults = quiz.status === 'results';
  return <main className="min-h-screen bg-muted/30 px-3 py-5 sm:px-6 sm:py-7"><div className="mx-auto max-w-screen-2xl"><header className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.3em] text-primary">{quiz.title}</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Question {current+1} <span className="text-muted-foreground">/ {questions.length}</span></h1></div>{isAnswering && <div className="rounded-2xl border bg-card px-5 py-2.5 text-xl font-black tabular-nums shadow-sm">{remaining}s</div>}</header>{isIntermission ? <div className="flex min-h-[78vh] items-center justify-center"><div className="text-center"><div className="mx-auto flex size-28 animate-pulse items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl"><ChevronRight className="size-14" /></div><p className="mt-8 text-xs font-black uppercase tracking-[.3em] text-primary">Intermission</p><h1 className="mt-2 text-5xl font-black tracking-tight sm:text-7xl">Next up</h1><p className="mt-3 text-muted-foreground">Get ready for the next question.</p><p className="mt-2 text-xs font-bold text-muted-foreground/70">Next question in 5 seconds</p></div></div> : <><Card className="mt-5 rounded-[1.5rem] border-0 shadow-xl"><CardContent className="p-5 sm:p-7"><div className="flex items-center justify-between"><span className="rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary">{isReveal?'Question reveal':isAnswering?'Answering now':isResults?'Results':'Live'}</span></div><h2 className="mt-4 text-center text-2xl font-black leading-tight sm:text-4xl">{currentQ?.question}</h2></CardContent></Card>{(isAnswering||isResults||isReveal)&&<div className="mt-5 grid min-h-[68vh] grid-cols-1 gap-4 sm:grid-cols-2 sm:grid-rows-2 sm:gap-5">{options.map(o=><div key={o.letter} className={`relative flex min-h-56 items-center overflow-hidden rounded-[1.75rem] border p-7 transition-colors duration-300 sm:min-h-0 sm:p-10 ${isResults&&currentQ?.correct_answer===o.letter?o.soft:'bg-card'}`}><OptionIcon opt={o}/><div className="ml-5 min-w-0"><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Answer {o.letter}</p><p className="mt-2 text-xl font-black leading-snug sm:text-3xl lg:text-4xl">{currentQ?.[o.key]}</p></div>{isResults&&<span className="absolute right-7 top-7 text-base font-black">{answerCounts[o.letter]||0}</span>}</div>)}</div>}{isReveal&&<p className="mt-5 text-center text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">Answers are being revealed…</p>}{isResults&&<div className="mt-4 text-center text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">Next question in 4 seconds</div>}</>}</div></main>;
}
