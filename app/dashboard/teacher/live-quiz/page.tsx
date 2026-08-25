'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Play, Plus, Users, Trophy, Clock, MonitorPlay, Copy, Check, Radio, ChevronRight, Sparkles } from 'lucide-react';

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

type Q = { id: string; question_order: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string; time_limit_seconds: number };
type Quiz = { id: string; title: string; class_code: string; game_code: string | null; status: string; current_question: number; is_template: boolean; question_started_at?: string | null };
type Player = { id: string; nickname: string; score: number; total_response_time_ms: number; correct_answers: number };
type TeacherClass = { id?: string; class_name: string; school_name?: string | null; code: string; teacher_id?: string | null };

const answers = [
  { letter: 'A', label: '▲', key: 'option_a', className: 'bg-red-500' },
  { letter: 'B', label: '◆', key: 'option_b', className: 'bg-blue-500' },
  { letter: 'C', label: '●', key: 'option_c', className: 'bg-yellow-500' },
  { letter: 'D', label: '■', key: 'option_d', className: 'bg-green-500' },
] as const;

function teacherId() {
  try {
    const u = JSON.parse(localStorage.getItem('current_user') || '{}');
    const id = u.id ?? u.user_id ?? u.uid;
    return id ? String(id) : null;
  } catch { return null; }
}

function gameCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

async function api(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${url}/rest/v1/${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) }, cache: 'no-store' });
  const text = await r.text();
  if (!r.ok) throw new Error(text || `Request failed (${r.status})`);
  if (!text.trim()) return null;
  return JSON.parse(text);
}

async function rpc(name: string, body: Record<string, unknown>) {
  return api(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
}

export default function TeacherLiveQuiz() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Quiz[]>([]);
  const [selected, setSelected] = useState<Quiz | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [title, setTitle] = useState('My Live Quiz');
  const [classCode, setClassCode] = useState('');
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [d, setD] = useState('');
  const [correct, setCorrect] = useState('A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(30);
  const [revealStep, setRevealStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const current = quiz?.current_question ?? -1;
  const currentQ = questions[current];

  async function loadTemplates() {
    try {
      const id = teacherId();
      if (!id) return;
      setTemplates((await api(`live_quizzes?teacher_id=eq.${encodeURIComponent(id)}&is_template=eq.true&status=eq.draft&select=id,title,class_code,game_code,status,current_question,is_template&order=created_at.desc`)) || []);
    } catch {}
  }

  async function loadClasses() {
    try {
      const id = teacherId();
      if (!id) return;
      setClasses((await api(`teacher_classes?teacher_id=eq.${encodeURIComponent(id)}&select=id,class_name,school_name,code,teacher_id&order=class_name.asc`)) || []);
    } catch { setClasses([]); }
  }

  useEffect(() => { loadTemplates(); loadClasses(); }, []);

  async function createTemplate() {
    if (!title.trim() || !classCode) { setError('Choose a class and enter a quiz title.'); return; }
    setLoading(true); setError('');
    try {
      const rows = await api('live_quizzes', { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ title: title.trim(), class_code: classCode, teacher_id: teacherId(), game_code: null, status: 'draft', is_template: true, current_question: -1 }) });
      if (!rows?.[0]) throw new Error('Quiz was not created.');
      setSelected(rows[0]); setQuestions([]); await loadTemplates();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create quiz.'); }
    finally { setLoading(false); }
  }

  async function openTemplate(t: Quiz) {
    setSelected(t); setError('');
    try { setQuestions((await api(`live_quiz_questions?quiz_id=eq.${t.id}&select=*&order=question_order.asc`)) || []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load quiz.'); }
  }

  async function addQuestion() {
    if (!selected || !q.trim() || ![a,b,c,d].every(x => x.trim())) { setError('Fill the question and all four answers.'); return; }
    try {
      const rows = await api('live_quiz_questions', { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ quiz_id: selected.id, question_order: questions.length, question: q.trim(), option_a: a.trim(), option_b: b.trim(), option_c: c.trim(), option_d: d.trim(), correct_answer: correct, time_limit_seconds: 30 }) });
      setQuestions(p => rows?.length ? [...p, ...rows] : p);
      setQ(''); setA(''); setB(''); setC(''); setD('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not add question.'); }
  }

  async function launchTemplate() {
    if (!selected || !questions.length) { setError('Add at least one question before starting.'); return; }
    setLoading(true); setError('');
    try {
      const rows = await api('live_quizzes', { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ title: selected.title, class_code: selected.class_code, teacher_id: teacherId(), game_code: gameCode(), status: 'lobby', current_question: -1, is_template: false }) });
      if (!rows?.[0]) throw new Error('Could not create the live session.');
      const live = rows[0] as Quiz;
      const cloned = (await api(`live_quiz_questions?quiz_id=eq.${selected.id}&select=question_order,question,option_a,option_b,option_c,option_d,correct_answer,time_limit_seconds&order=question_order.asc`)) || [];
      for (const item of cloned) await api('live_quiz_questions', { method: 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ ...item, quiz_id: live.id, time_limit_seconds: 30 }) });
      setQuiz(live); setQuestions(cloned.map((x: Q, i: number) => ({ ...x, id: `${live.id}-${i}`, time_limit_seconds: 30 })));
      setSelected(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start live quiz.'); }
    finally { setLoading(false); }
  }

  async function beginReveal(index: number) {
    if (!quiz) return;
    try {
      const result = await rpc('live_quiz_begin_reveal', { p_quiz_id: quiz.id, p_question_index: index });
      setQuiz(result?.[0] || result || { ...quiz, status: 'question_reveal', current_question: index, question_started_at: new Date().toISOString() });
      setRevealStep(0);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start question.'); }
  }

  async function beginAnswering() {
    if (!quiz) return;
    try {
      const result = await rpc('live_quiz_begin_answering', { p_quiz_id: quiz.id });
      setQuiz(result?.[0] || result || { ...quiz, status: 'answering', question_started_at: new Date().toISOString() });
      setRemaining(30);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not open answers.'); }
  }

  async function finishOrNext() {
    if (!quiz) return;
    const next = current + 1;
    if (next >= questions.length) {
      const rows = await api(`live_quizzes?id=eq.${quiz.id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ status: 'finished', question_started_at: null }) });
      setQuiz(rows?.[0] || { ...quiz, status: 'finished' });
    } else {
      await beginReveal(next);
    }
  }

  async function loadLive() {
    if (!quiz) return;
    try {
      setPlayers((await api(`live_quiz_players?quiz_id=eq.${quiz.id}&select=id,nickname,score,total_response_time_ms,correct_answers&order=correct_answers.desc,total_response_time_ms.asc`)) || []);
      const x = await api(`live_quizzes?id=eq.${quiz.id}&select=*`);
      if (x?.[0]) setQuiz(x[0]);
    } catch {}
  }

  useEffect(() => {
    if (!quiz) return;
    loadLive();
    const t = window.setInterval(loadLive, 700);
    return () => window.clearInterval(t);
  }, [quiz?.id]);

  useEffect(() => {
    if (!quiz || !currentQ) return;
    if (quiz.status === 'question_reveal') {
      const start = quiz.question_started_at ? new Date(quiz.question_started_at).getTime() : Date.now();
      const timer = window.setInterval(() => {
        const elapsed = Date.now() - start;
        setRevealStep(Math.min(4, Math.floor(elapsed / 700)));
        if (elapsed >= 5000) {
          window.clearInterval(timer);
          beginAnswering();
        }
      }, 100);
      return () => window.clearInterval(timer);
    }

    if (quiz.status === 'answering') {
      const start = quiz.question_started_at ? new Date(quiz.question_started_at).getTime() : Date.now();
      const timer = window.setInterval(() => {
        const left = Math.max(0, 30000 - (Date.now() - start));
        setRemaining(Math.ceil(left / 1000));
        if (left <= 0) window.clearInterval(timer);
      }, 100);
      return () => window.clearInterval(timer);
    }
  }, [quiz?.status, quiz?.current_question, quiz?.question_started_at, currentQ?.id]);

  async function copyCode() {
    if (!quiz?.game_code) return;
    try { await navigator.clipboard.writeText(quiz.game_code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  if (quiz) {
    return <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.04] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card/90 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Radio className="size-6" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Teacher Host Screen</p><h1 className="text-xl font-black sm:text-2xl">{quiz.title}</h1></div></div>
          <Button variant="outline" className="rounded-xl" onClick={() => router.push('/dashboard/teacher')}><ArrowLeft className="mr-2 size-4" />Back to Dashboard</Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <Card className="overflow-hidden rounded-3xl border-0 bg-primary text-primary-foreground shadow-xl"><CardContent className="flex flex-col items-center justify-center py-8 text-center"><p className="text-xs font-bold uppercase tracking-[0.3em] opacity-80">Join Code</p><div className="mt-2 flex items-center gap-3"><span className="font-black tracking-[0.28em] text-5xl sm:text-6xl">{quiz.game_code}</span><Button size="icon" variant="secondary" className="rounded-xl" onClick={copyCode}>{copied ? <Check className="size-5" /> : <Copy className="size-5" />}</Button></div><p className="mt-3 text-sm opacity-80">Students enter this code to join.</p></CardContent></Card>
          <Card className="rounded-3xl"><CardContent className="flex h-full items-center justify-center gap-4 py-7"><div className="flex size-12 items-center justify-center rounded-2xl bg-muted"><Users className="size-6" /></div><div><p className="text-3xl font-black">{players.length}</p><p className="text-sm text-muted-foreground">Players connected</p></div></CardContent></Card>
        </div>

        {error && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">{error}</div>}

        {quiz.status === 'lobby' && <Card className="rounded-3xl"><CardContent className="py-16 text-center"><MonitorPlay className="mx-auto size-14 text-primary" /><h2 className="mt-5 text-3xl font-black">Ready when your class is in</h2><p className="mx-auto mt-2 max-w-lg text-muted-foreground">Share this screen. Students will use their devices as answer controllers.</p><p className="mt-5 font-bold">{players.length} player{players.length === 1 ? '' : 's'} connected</p><Button size="lg" className="mt-6 rounded-xl px-8" disabled={!questions.length} onClick={() => beginReveal(0)}><Play className="mr-2 size-5" />Start Question 1</Button></CardContent></Card>}

        {(quiz.status === 'question_reveal' || quiz.status === 'answering') && currentQ && <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_320px]">
          <Card className="overflow-hidden rounded-3xl border-0 shadow-xl">
            <CardHeader className="border-b bg-muted/30 p-6 sm:p-8"><div className="flex items-center justify-between"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">QUESTION {current + 1} / {questions.length}</span>{quiz.status === 'answering' ? <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xl font-black ${remaining <= 5 ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-primary/10 text-primary'}`}><Clock className="size-5" />{remaining}s</span> : <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-black text-primary">GET READY</span>}</div>
              {quiz.status === 'answering' && <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-100" style={{ width: `${(remaining / 30) * 100}%` }} /></div>}
              <CardTitle className="mt-7 text-center text-3xl leading-tight sm:text-4xl">{currentQ.question}</CardTitle>
              <p className="mt-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">{quiz.status === 'question_reveal' ? 'Watch the answers appear' : 'Students can answer now'}</p>
            </CardHeader>
            <CardContent className="p-5 sm:p-7">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {answers.map((item, index) => {
                  const visible = quiz.status === 'answering' || revealStep >= index + 1;
                  return <div key={item.letter} className={`min-h-32 rounded-2xl p-5 text-white shadow-sm transition-all duration-500 sm:min-h-36 sm:p-6 ${item.className} ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'}`}><div className="flex items-center justify-between"><span className="text-4xl font-black">{item.label}</span><span className="rounded-lg bg-black/10 px-2 py-1 text-xs font-black">{item.letter}</span></div>{visible && <p className="mt-4 text-lg font-bold sm:text-xl">{currentQ[item.key]}</p>}</div>;
                })}
              </div>

              {quiz.status === 'question_reveal' && <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border bg-muted/30 p-4 text-sm font-bold text-muted-foreground"><Sparkles className="size-4 text-primary" />Answers unlock one by one…</div>}
              {quiz.status === 'answering' && <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-muted-foreground">Students are answering on their devices.</p><Button className="rounded-xl" onClick={finishOrNext}>{current + 1 >= questions.length ? 'Finish Quiz' : 'Next Question'}<ChevronRight className="ml-2 size-4" /></Button></div>}
            </CardContent>
          </Card>

          <Card className="rounded-3xl"><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="size-5 text-primary" />Live Ranking</CardTitle></CardHeader><CardContent className="space-y-2">{players.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Waiting for players…</p> : players.slice(0, 10).map((p, i) => <div key={p.id} className="flex items-center gap-3 rounded-xl border p-3"><span className="flex size-8 items-center justify-center rounded-lg bg-muted text-xs font-black">{i + 1}</span><span className="min-w-0 flex-1 truncate font-bold">{p.nickname}</span><span className="text-sm font-black">{p.correct_answers}</span></div>)}</CardContent></Card>
        </div>}

        {quiz.status === 'finished' && <Card className="rounded-3xl"><CardContent className="py-16 text-center"><Trophy className="mx-auto size-16 text-primary" /><h2 className="mt-5 text-4xl font-black">Quiz Finished!</h2><p className="mt-2 text-muted-foreground">Final leaderboard</p><div className="mx-auto mt-7 max-w-xl space-y-2">{players.map((p, i) => <div key={p.id} className="flex items-center gap-3 rounded-2xl border p-4 text-left"><span className="font-black">#{i + 1}</span><span className="flex-1 font-bold">{p.nickname}</span><span className="font-black">{p.correct_answers} correct</span></div>)}</div></CardContent></Card>}
      </div>
    </main>;
  }

  return <main className="min-h-screen bg-gradient-to-b from-background to-primary/[0.04] px-4 py-8 sm:px-6"><div className="mx-auto max-w-5xl space-y-6">
    <div className="flex items-center gap-4"><Button variant="outline" size="icon" className="rounded-xl" onClick={() => router.push('/dashboard/teacher')}><ArrowLeft className="size-5" /></Button><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Live Quiz Studio</p><h1 className="text-3xl font-black">Create a Live Quiz</h1></div></div>
    {error && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">{error}</div>}
    <Card className="rounded-3xl"><CardHeader><CardTitle>New Quiz</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quiz title" /><select className="h-10 rounded-xl border bg-background px-3 text-sm" value={classCode} onChange={e => setClassCode(e.target.value)}><option value="">Choose class</option>{classes.map(c => <option key={c.code} value={c.code}>{c.class_name} ({c.code})</option>)}</select><Button className="rounded-xl sm:col-span-2" disabled={loading} onClick={createTemplate}><Plus className="mr-2 size-4" />Create Quiz</Button></CardContent></Card>
    {templates.length > 0 && <Card className="rounded-3xl"><CardHeader><CardTitle>Your Quiz Templates</CardTitle></CardHeader><CardContent className="space-y-2">{templates.map(t => <button key={t.id} onClick={() => openTemplate(t)} className="flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition hover:bg-muted/40"><div className="flex-1"><p className="font-bold">{t.title}</p><p className="text-xs text-muted-foreground">Class {t.class_code}</p></div><ChevronRight className="size-5" /></button>)}</CardContent></Card>}
    {selected && <Card className="rounded-3xl"><CardHeader><CardTitle>Build: {selected.title}</CardTitle></CardHeader><CardContent className="space-y-4"><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Question" /><div className="grid gap-3 sm:grid-cols-2"><Input value={a} onChange={e => setA(e.target.value)} placeholder="A — answer" /><Input value={b} onChange={e => setB(e.target.value)} placeholder="B — answer" /><Input value={c} onChange={e => setC(e.target.value)} placeholder="C — answer" /><Input value={d} onChange={e => setD(e.target.value)} placeholder="D — answer" /></div><select className="h-10 rounded-xl border bg-background px-3" value={correct} onChange={e => setCorrect(e.target.value)}><option value="A">Correct: A</option><option value="B">Correct: B</option><option value="C">Correct: C</option><option value="D">Correct: D</option></select><Button className="rounded-xl" onClick={addQuestion}><Plus className="mr-2 size-4" />Add Question</Button><div className="space-y-2">{questions.map((item, i) => <div key={item.id} className="rounded-2xl border p-4"><p className="font-bold">{i + 1}. {item.question}</p><p className="mt-1 text-xs text-muted-foreground">Correct: {item.correct_answer}</p></div>)}</div><Button size="lg" className="w-full rounded-xl" disabled={!questions.length || loading} onClick={launchTemplate}><Play className="mr-2 size-5" />Launch Live Quiz</Button></CardContent></Card>}
  </div></main>;
}
