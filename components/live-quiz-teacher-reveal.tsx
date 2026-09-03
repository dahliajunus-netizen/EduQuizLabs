'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Check, Sparkles, Users, Zap } from 'lucide-react';

type Quiz = { id: string; status: string; current_question: number; teacher_id?: string | null; is_template?: boolean };
type Q = { id: string; question: string; option_a: string; option_b: string; option_c: string; option_d: string };

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const options = [
  { letter: 'A', key: 'option_a', bg: 'bg-red-500', shape: '[clip-path:polygon(50%_0%,100%_100%,0%_100%)]' },
  { letter: 'B', key: 'option_b', bg: 'bg-blue-500', shape: 'rotate-45 rounded-lg' },
  { letter: 'C', key: 'option_c', bg: 'bg-yellow-500', shape: 'rounded-full' },
  { letter: 'D', key: 'option_d', bg: 'bg-green-500', shape: 'rounded-lg' },
] as const;

async function api(path: string) {
  const r = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error('Request failed');
  return r.json();
}

export default function LiveQuizTeacherReveal() {
  const pathname = usePathname();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [question, setQuestion] = useState<Q | null>(null);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!pathname.startsWith('/dashboard/teacher/live-quiz')) return;
    let stopped = false;
    const load = async () => {
      try {
        const rows = await api('live_quizzes?is_template=eq.false&status=eq.question_reveal&select=id,status,current_question,teacher_id,is_template&order=created_at.desc&limit=1');
        if (stopped) return;
        const qz = rows?.[0] as Quiz | undefined;
        if (!qz) { setQuiz(null); setQuestion(null); return; }
        setQuiz(qz);
        const qs = await api(`live_quiz_questions?quiz_id=eq.${encodeURIComponent(qz.id)}&select=id,question,option_a,option_b,option_c,option_d&order=question_order.asc`);
        if (!stopped) setQuestion(qs?.[qz.current_question] || null);
      } catch {
        if (!stopped) { setQuiz(null); setQuestion(null); }
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 500);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [pathname]);

  useEffect(() => {
    setVisible(0);
    if (!quiz || !question) return;
    const timers = options.map((_, i) => window.setTimeout(() => setVisible(i + 1), i * 750 + 350));
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [quiz?.id, quiz?.current_question, question?.id]);

  if (!quiz || !question || !pathname.startsWith('/dashboard/teacher/live-quiz')) return null;
  const revealed = visible === options.length;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-auto bg-background">
      <div className="flex min-h-screen flex-col px-6 py-7 sm:px-12 sm:py-10 lg:px-16">
        <header className="flex items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg sm:size-14">
              <Zap className="size-6 sm:size-7" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black sm:text-lg">Live Quiz</p>
              <p className="text-[10px] font-bold uppercase tracking-[.24em] text-muted-foreground">Teacher presentation</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border bg-card px-4 py-2.5 text-[10px] font-black uppercase tracking-wider shadow-sm sm:px-5">
            <Users className="size-3.5 text-primary" /> Students getting ready
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center py-12 sm:py-14 lg:py-16">
          <div className="mb-10 flex items-center justify-between gap-6 sm:mb-12">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.3em] text-primary sm:text-xs">Question {quiz.current_question + 1}</p>
              <div className="mt-3 flex items-center gap-2">
                {options.map((o, i) => (
                  <span key={o.letter} className={`h-2 rounded-full transition-all duration-500 sm:h-2.5 ${i < visible ? 'w-10 bg-primary sm:w-14' : 'w-3 bg-muted sm:w-4'}`} />
                ))}
              </div>
            </div>
            <div className="hidden items-center gap-2 text-xs font-bold text-muted-foreground sm:flex">
              <Sparkles className="size-4 text-primary" /> Answers reveal automatically
            </div>
          </div>

          <section className="rounded-[2rem] border bg-card p-9 text-center shadow-2xl sm:rounded-[2.5rem] sm:p-14 lg:p-16">
            <p className="mx-auto max-w-6xl text-3xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{question.question}</p>
          </section>

          <section className="mt-8 grid gap-6 sm:mt-10 sm:grid-cols-2 sm:gap-7">
            {options.map((o, i) => {
              const isVisible = i < visible;
              return (
                <div key={o.letter} className={`relative flex min-h-36 items-center gap-6 overflow-hidden rounded-[1.75rem] border bg-card p-6 shadow-lg transition-all duration-500 sm:min-h-44 sm:gap-8 sm:rounded-[2rem] sm:p-8 ${isVisible ? 'animate-in fade-in zoom-in-90 opacity-100' : 'opacity-0'}`}>
                  <div className={`flex size-18 shrink-0 items-center justify-center rounded-2xl ${o.bg} shadow-md sm:size-22`}>
                    <span className={`block size-10 bg-white ${o.shape} sm:size-12`} />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-black uppercase tracking-[.22em] text-muted-foreground sm:text-xs">Answer {o.letter}</p>
                    <p className="mt-2 text-lg font-black leading-snug sm:text-2xl lg:text-3xl">{question[o.key]}</p>
                  </div>
                  {isVisible && <span className="absolute right-6 top-6 text-xs font-black text-muted-foreground/50 sm:right-8 sm:top-8">{i + 1}/4</span>}
                </div>
              );
            })}
          </section>
        </main>

        <footer className="flex items-center justify-between gap-6 border-t pt-6 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground sm:pt-7 sm:text-xs">
          <span>Look at the screen</span>
          <span className="flex items-center gap-1.5">{revealed ? <Check className="size-3.5 text-green-600" /> : <Sparkles className="size-3.5" />} {revealed ? 'All answers revealed' : `${visible} of 4 revealed`}</span>
        </footer>
      </div>
    </div>
  );
}
