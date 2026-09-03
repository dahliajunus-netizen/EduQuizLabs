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
        if (!qz) {
          setQuiz(null);
          setQuestion(null);
          return;
        }
        setQuiz(qz);
        const qs = await api(`live_quiz_questions?quiz_id=eq.${encodeURIComponent(qz.id)}&select=id,question,option_a,option_b,option_c,option_d&order=question_order.asc`);
        if (!stopped) setQuestion(qs?.[qz.current_question] || null);
      } catch {
        if (!stopped) {
          setQuiz(null);
          setQuestion(null);
        }
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 500);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [pathname]);

  useEffect(() => {
    setVisible(0);
    if (!quiz || !question) return;
    const timers = options.map((_, i) => window.setTimeout(() => setVisible(i + 1), i * 500 + 250));
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [quiz?.id, quiz?.current_question, question?.id]);

  if (!quiz || !question || !pathname.startsWith('/dashboard/teacher/live-quiz')) return null;

  const revealed = visible === options.length;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-auto bg-background">
      <div className="flex min-h-screen flex-col px-5 py-5 sm:px-10 sm:py-7 lg:px-14">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg sm:size-12">
              <Zap className="size-5 sm:size-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black sm:text-base">Live Quiz</p>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-muted-foreground">Teacher presentation</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border bg-card px-3 py-2 text-[10px] font-black uppercase tracking-wider shadow-sm sm:px-4">
            <Users className="size-3.5 text-primary" /> Students getting ready
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center py-8 sm:py-10">
          <div className="mb-7 flex items-center justify-between gap-4 sm:mb-9">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.28em] text-primary sm:text-xs">Question {quiz.current_question + 1}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {options.map((o, i) => (
                  <span key={o.letter} className={`h-1.5 rounded-full transition-all duration-300 sm:h-2 ${i < visible ? 'w-8 bg-primary sm:w-12' : 'w-3 bg-muted sm:w-4'}`} />
                ))}
              </div>
            </div>
            <div className="hidden items-center gap-2 text-xs font-bold text-muted-foreground sm:flex">
              <Sparkles className="size-4 text-primary" /> Answers reveal automatically
            </div>
          </div>

          <section className="rounded-[2rem] border bg-card p-7 text-center shadow-2xl sm:rounded-[2.5rem] sm:p-12 lg:p-14">
            <p className="mx-auto max-w-6xl text-3xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{question.question}</p>
          </section>

          <section className="mt-5 grid gap-4 sm:mt-7 sm:grid-cols-2">
            {options.map((o, i) => {
              const isVisible = i < visible;
              return (
                <div
                  key={o.letter}
                  className={`relative flex min-h-32 items-center gap-5 overflow-hidden rounded-[1.5rem] border bg-card p-5 shadow-lg transition-all duration-300 sm:min-h-40 sm:gap-7 sm:rounded-[2rem] sm:p-7 ${isVisible ? 'animate-in fade-in zoom-in-95 opacity-100' : 'opacity-0'}`}
                >
                  <div className={`flex size-16 shrink-0 items-center justify-center rounded-2xl ${o.bg} shadow-md sm:size-20`}>
                    <span className={`block size-9 bg-white ${o.shape} sm:size-11`} />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-black uppercase tracking-[.2em] text-muted-foreground sm:text-xs">Answer {o.letter}</p>
                    <p className="mt-1.5 text-lg font-black leading-snug sm:text-2xl lg:text-3xl">{question[o.key]}</p>
                  </div>
                  {isVisible && <span className="absolute right-5 top-5 text-xs font-black text-muted-foreground/50 sm:right-7 sm:top-7">{i + 1}/4</span>}
                </div>
              );
            })}
          </section>
        </main>

        <footer className="flex items-center justify-between gap-4 border-t pt-4 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground sm:pt-5 sm:text-xs">
          <span>Look at the screen</span>
          <span className="flex items-center gap-1.5">{revealed ? <Check className="size-3.5 text-green-600" /> : <Sparkles className="size-3.5" />} {revealed ? 'All answers revealed' : `${visible} of 4 revealed`}</span>
        </footer>
      </div>
    </div>
  );
}
