'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';

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

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-[#f7f8fc]/95 px-4 py-6 backdrop-blur-sm sm:px-8">
      <div className="w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[.3em] text-primary">
          <Sparkles className="size-4 animate-pulse" /> Answers opening
        </div>
        <div className="rounded-[2rem] border bg-background p-6 text-center shadow-xl sm:p-9">
          <p className="mx-auto max-w-4xl text-2xl font-black leading-tight sm:text-4xl">{question.question}</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {options.map((o, i) => {
            const isVisible = i < visible;
            return (
              <div
                key={o.letter}
                className={`flex min-h-28 items-center gap-5 rounded-2xl border bg-background p-5 shadow-sm transition-all duration-300 sm:min-h-32 sm:p-6 ${isVisible ? 'animate-in fade-in zoom-in-95 opacity-100' : 'opacity-0'}`}
              >
                <div className={`flex size-16 shrink-0 items-center justify-center rounded-2xl ${o.bg} sm:size-20`}>
                  <span className={`block size-9 bg-white ${o.shape} sm:size-11`} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Answer {o.letter}</p>
                  <p className="mt-1 text-lg font-black leading-snug sm:text-xl">{question[o.key]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
