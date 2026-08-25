'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Check,
  Clock,
  Loader2,
  Trophy,
  Wifi,
  Zap,
  ArrowLeft,
} from 'lucide-react';

type Quiz = {
  id: string;
  title: string;
  status: string;
  current_question: number;
  question_started_at?: string | null;
};

type Q = {
  id: string;
  question_order: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  time_limit_seconds: number;
};

type Player = {
  id: string;
  nickname: string;
  score: number;
  total_response_time_ms: number;
  correct_answers: number;
};

type LiveState = {
  status?: string;
  current_question?: number;
  question_started_at?: string | null;
  deadline_at?: string | null;
};

type SubmitResult = {
  success?: boolean;
  is_correct?: boolean;
  response_time_ms?: number;
  points_earned?: number;
  error?: string;
};

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

const shapes = [
  {
    letter: 'A',
    symbol: '▲',
    className: 'bg-red-500 hover:bg-red-600',
  },
  {
    letter: 'B',
    symbol: '◆',
    className: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    letter: 'C',
    symbol: '●',
    className: 'bg-yellow-500 hover:bg-yellow-600',
  },
  {
    letter: 'D',
    symbol: '■',
    className: 'bg-green-500 hover:bg-green-600',
  },
];

function getStudentId() {
  try {
    const raw = localStorage.getItem('current_user');

    if (!raw) return null;

    const user = JSON.parse(raw);

    const id =
      user.student_id ??
      user.id ??
      user.user_id ??
      user.uid;

    return id ? String(id).trim() : null;
  } catch {
    return null;
  }
}

async function api(
  path: string,
  options: RequestInit = {}
) {
  if (!url) {
    throw new Error('Supabase URL is not configured.');
  }

  if (!key) {
    throw new Error('Supabase key is not configured.');
  }

  const response = await fetch(
    `${url}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
      cache: 'no-store',
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      body || `Supabase request failed (${response.status}).`
    );
  }

  if (!body.trim()) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

async function rpc(
  name: string,
  body: Record<string, unknown>
) {
  return api(`rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export default function LiveQuizGame() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();

  const code = String(params?.code || '').toUpperCase();

  const nickname =
    searchParams.get('name') || 'Player';

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);

  const [answer, setAnswer] = useState('');
  const [answered, setAnswered] = useState(false);

  const [error, setError] = useState('');

  const [remaining, setRemaining] = useState(30);
  const [deadline, setDeadline] = useState<number | null>(null);

  const [ranking, setRanking] = useState<Player[]>([]);

  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /*
   * Load the quiz itself.
   */
  async function loadQuiz() {
    try {
      const quizRows = await api(
        `live_quizzes?game_code=eq.${encodeURIComponent(
          code
        )}&select=*`
      );

      if (!quizRows?.[0]) {
        throw new Error('Game not found.');
      }

      const currentQuiz = quizRows[0] as Quiz;

      setQuiz(currentQuiz);

      const questionRows = await api(
        `live_quiz_questions?quiz_id=eq.${encodeURIComponent(
          currentQuiz.id
        )}&select=*&order=question_order.asc`
      );

      setQuestions(questionRows || []);

      const playerRows = await api(
        `live_quiz_players?quiz_id=eq.${encodeURIComponent(
          currentQuiz.id
        )}&nickname=eq.${encodeURIComponent(
          nickname
        )}&select=*`
      );

      if (playerRows?.[0]) {
        setPlayer(playerRows[0]);
      }

      if (currentQuiz.status === 'finished') {
        const allPlayers = await api(
          `live_quiz_players?quiz_id=eq.${encodeURIComponent(
            currentQuiz.id
          )}&select=*&order=correct_answers.desc,total_response_time_ms.asc`
        );

        setRanking(allPlayers || []);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load quiz.'
      );
    }
  }

  /*
   * Ask Supabase for the authoritative game state.
   *
   * The browser does NOT decide when a question started.
   */
  async function syncGameState(quizId: string) {
    try {
      const result = await rpc(
        'get_live_quiz_state',
        {
          p_quiz_id: quizId,
        }
      );

      if (!result) return;

      const state: LiveState = Array.isArray(result)
        ? result[0]
        : result;

      if (!state) return;

      setQuiz((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          status:
            state.status !== undefined
              ? String(state.status)
              : previous.status,

          current_question:
            state.current_question !== undefined
              ? Number(state.current_question)
              : previous.current_question,

          question_started_at:
            state.question_started_at ??
            previous.question_started_at,
        };
      });

      if (state.deadline_at) {
        setDeadline(
          new Date(state.deadline_at).getTime()
        );
      } else {
        setDeadline(null);
      }
    } catch (err) {
      /*
       * Don't destroy the game because a temporary polling
       * request failed.
       */
      console.error(
        'Live quiz state sync failed:',
        err
      );
    }
  }

  /*
   * Initial load + light polling.
   */
  useEffect(() => {
    loadQuiz();

    const interval = window.setInterval(
      loadQuiz,
      1500
    );

    return () =>
      window.clearInterval(interval);
  }, [code, nickname]);

  /*
   * Server-authoritative game state polling.
   */
  useEffect(() => {
    if (!quiz?.id) return;

    syncGameState(quiz.id);

    const interval = window.setInterval(() => {
      syncGameState(quiz.id);
    }, 500);

    return () =>
      window.clearInterval(interval);
  }, [quiz?.id]);

  const currentIndex =
    quiz?.current_question ?? -1;

  const currentQ =
    questions[currentIndex];

  /*
   * Reset answer state when the host changes question.
   */
  useEffect(() => {
    setAnswered(false);
    setAnswer('');
    setSubmitting(false);
    setError('');
  }, [
    quiz?.current_question,
    quiz?.status,
    currentQ?.id,
  ]);

  /*
   * Display the server-provided deadline.
   */
  useEffect(() => {
    if (
      !deadline ||
      quiz?.status !== 'question'
    ) {
      setRemaining(
        quiz?.status === 'question'
          ? 0
          : 30
      );

      return;
    }

    const updateTimer = () => {
      const millisecondsLeft =
        Math.max(
          0,
          deadline - Date.now()
        );

      setRemaining(
        Math.ceil(
          millisecondsLeft / 1000
        )
      );
    };

    updateTimer();

    const interval =
      window.setInterval(
        updateTimer,
        100
      );

    return () =>
      window.clearInterval(interval);
  }, [deadline, quiz?.status]);

  /*
   * Join the game.
   */
  async function join() {
    if (
      player ||
      !quiz ||
      joining
    ) {
      return;
    }

    setJoining(true);
    setError('');

    try {
      const rows = await api(
        'live_quiz_players',
        {
          method: 'POST',
          headers: {
            ...headers,
            Prefer:
              'return=representation',
          },
          body: JSON.stringify({
            quiz_id: quiz.id,
            student_id: getStudentId(),
            nickname,
          }),
        }
      );

      setPlayer(rows?.[0] || null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not join the lobby.'
      );
    } finally {
      setJoining(false);
    }
  }

  /*
   * Submit an answer.
   *
   * IMPORTANT:
   * The server decides correctness,
   * response time and whether the answer
   * is still accepted.
   */
  async function submit(value: string) {
    if (
      !quiz ||
      !player ||
      answered ||
      submitting ||
      quiz.status !== 'question' ||
      !currentQ ||
      remaining <= 0
    ) {
      return;
    }

    setAnswer(value);
    setAnswered(true);
    setSubmitting(true);
    setError('');

    try {
      const result =
        (await rpc(
          'submit_live_quiz_answer',
          {
            p_quiz_id: quiz.id,
            p_player_id: player.id,
            p_answer: value,
          }
        )) as SubmitResult | SubmitResult[] | null;

      const response: SubmitResult =
        Array.isArray(result)
          ? result[0]
          : result || {};

      if (response.success !== true) {
        throw new Error(
          response.error ||
            'Answer was not accepted.'
        );
      }

      /*
       * Update the local player immediately.
       * The database remains the source of truth.
       */
      setPlayer((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,

          correct_answers:
            Number(
              previous.correct_answers || 0
            ) +
            (response.is_correct ? 1 : 0),

          total_response_time_ms:
            Number(
              previous.total_response_time_ms ||
                0
            ) +
            Number(
              response.response_time_ms || 0
            ),

          score:
            Number(
              previous.score || 0
            ) +
            Number(
              response.points_earned || 0
            ),
        };
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not submit answer.';

      if (
        message.includes(
          'TIME_EXPIRED'
        )
      ) {
        setRemaining(0);
        setError(
          "Time's up — your answer was not accepted."
        );
      } else if (
        message.includes(
          'ALREADY_ANSWERED'
        )
      ) {
        setError(
          'Your answer was already submitted.'
        );
      } else {
        setError(message);

        /*
         * Allow retry for ordinary network/server
         * failures.
         */
        setAnswered(false);
      }

      setSubmitting(false);
    }
  }

  const timerProgress =
    Math.max(
      0,
      Math.min(
        100,
        (remaining / 30) * 100
      )
    );

  /*
   * Fatal loading error.
   */
  if (error && !quiz) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.12),transparent_45%)] px-6">
        <Card className="w-full max-w-md rounded-[2rem] border-0 shadow-2xl">
          <CardContent className="p-9 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-2xl font-black text-destructive">
              !
            </div>

            <h1 className="mt-5 text-2xl font-black">
              Unable to join game
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {error}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  /*
   * Initial loading.
   */
  if (!quiz) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.12),transparent_45%)]">
        <div className="flex items-center gap-3 rounded-2xl border bg-card/80 px-5 py-4 text-sm font-semibold text-muted-foreground shadow-lg backdrop-blur">
          <Loader2 className="size-5 animate-spin text-primary" />
          Connecting to live quiz…
        </div>
      </main>
    );
  }

  /*
   * Join screen.
   */
  if (!player) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.2),transparent_48%)] px-5 py-8">
        <div className="pointer-events-none absolute -left-20 top-20 size-64 rounded-full bg-primary/10 blur-3xl" />

        <Card className="relative w-full max-w-md overflow-hidden rounded-[2rem] border-0 shadow-2xl">
          <div className="bg-primary p-9 text-center text-primary-foreground">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary-foreground/15 shadow-inner">
              <Zap className="size-8" />
            </div>

            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.3em] opacity-75">
              Live Quiz
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {quiz.title}
            </h1>
          </div>

          <CardContent className="space-y-5 p-7 text-center">
            <div className="rounded-2xl border bg-muted/30 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Playing as
              </p>

              <p className="mt-1 text-xl font-black">
                {nickname}
              </p>
            </div>

            <Button
              size="lg"
              className="h-13 w-full rounded-2xl text-base font-black shadow-lg transition-transform hover:-translate-y-0.5"
              onClick={join}
              disabled={joining}
            >
              {joining ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Joining…
                </>
              ) : (
                <>
                  Join Lobby
                  <Zap className="ml-2 size-5" />
                </>
              )}
            </Button>

            {error && (
              <p className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  /*
   * Lobby.
   */
  if (quiz.status === 'lobby') {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.15),transparent_50%)] px-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(var(--primary)/.08),transparent_35%)]" />

        <div className="relative w-full max-w-xl text-center">
          <div className="mx-auto flex size-24 animate-pulse items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/25">
            <Wifi className="size-10" />
          </div>

          <p className="mt-7 text-[11px] font-black uppercase tracking-[0.35em] text-primary">
            Connected to host
          </p>

          <h1 className="mt-2 text-5xl font-black tracking-tight sm:text-6xl">
            You're in!
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-muted-foreground">
            Hey{' '}
            <b className="text-foreground">
              {nickname}
            </b>{' '}
            — keep your eyes on the teacher's shared screen.
            Your device is your answer controller.
          </p>

          <div className="mx-auto mt-9 rounded-[2rem] border bg-card/80 p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-center gap-2">
              <span className="size-2.5 animate-pulse rounded-full bg-green-500" />

              <span className="text-sm font-bold">
                Waiting for the host to start
              </span>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-2.5">
              {shapes.map((shape) => (
                <div
                  key={shape.letter}
                  className={`flex h-16 items-center justify-center rounded-2xl ${shape.className} text-3xl font-black text-white shadow-lg`}
                >
                  {shape.symbol}
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No question text will appear here during the game.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * Finished screen.
   */
  if (quiz.status === 'finished') {
    return (
      <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.18),transparent_50%)] px-4 py-7 sm:px-5 sm:py-10">
        <div className="mx-auto max-w-2xl space-y-5">
          <Card className="overflow-hidden rounded-[2rem] border-0 shadow-2xl">
            <CardHeader className="relative bg-primary/5 px-5 py-10 text-center sm:px-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

              <div className="mx-auto flex size-24 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-xl shadow-primary/20">
                <Trophy className="size-11" />
              </div>

              <p className="mt-6 text-[11px] font-black uppercase tracking-[0.3em] text-primary">
                Game complete
              </p>

              <CardTitle className="mt-2 text-4xl font-black tracking-tight">
                Quiz Finished!
              </CardTitle>

              <p className="mt-3 text-muted-foreground">
                <b className="text-foreground">
                  {player.correct_answers}
                </b>{' '}
                correct ·{' '}
                <b className="text-foreground">
                  {(
                    Number(
                      player.total_response_time_ms
                    ) / 1000
                  ).toFixed(1)}
                  s
                </b>{' '}
                total response time
              </p>
            </CardHeader>

            <CardContent className="p-4 sm:p-7">
              <div className="mb-5 rounded-2xl border bg-muted/30 p-4 text-center text-sm leading-6 text-muted-foreground">
                Final ranking uses{' '}
                <b className="text-foreground">
                  correct answers first
                </b>
                , then{' '}
                <b className="text-foreground">
                  lowest total response time
                </b>
                .
              </div>

              <div className="space-y-2">
                {ranking.map((p, index) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-2xl border p-4 transition-all ${
                      p.id === player.id
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'bg-card'
                    }`}
                  >
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-black ${
                        index === 0
                          ? 'bg-yellow-400 text-yellow-950'
                          : index === 1
                            ? 'bg-slate-300 text-slate-800'
                            : index === 2
                              ? 'bg-orange-300 text-orange-950'
                              : 'bg-muted'
                      }`}
                    >
                      {index + 1}
                    </span>

                    <span className="min-w-0 flex-1 truncate font-bold">
                      {p.nickname}

                      {p.id === player.id && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                          YOU
                        </span>
                      )}
                    </span>

                    <span className="text-right text-xs font-bold">
                      <span className="block">
                        {p.correct_answers} correct
                      </span>

                      <span className="text-muted-foreground">
                        {(
                          Number(
                            p.total_response_time_ms
                          ) / 1000
                        ).toFixed(1)}
                        s
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="mt-6 w-full rounded-xl"
                onClick={() =>
                  window.location.reload()
                }
              >
                <ArrowLeft className="mr-2 size-4" />
                Back to Lobby
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  /*
   * No current question yet.
   */
  if (!currentQ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.12),transparent_45%)] px-5">
        <div className="text-center">
          <Loader2 className="mx-auto size-9 animate-spin text-primary" />

          <p className="mt-5 font-black">
            Waiting for the next question…
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Keep your eyes on the shared screen.
          </p>
        </div>
      </main>
    );
  }

  /*
   * Active question.
   */
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.1),transparent_45%)] px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-4xl flex-col">
        <div className="mb-3 flex items-center justify-between rounded-2xl border bg-card/85 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Live Quiz
            </p>

            <p className="text-sm font-black">
              Question {currentIndex + 1}{' '}
              <span className="text-muted-foreground">
                / {questions.length}
              </span>
            </p>
          </div>

          <div
            className={`relative flex items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-xl font-black ${
              remaining <= 5
                ? 'animate-pulse bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            }`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-current opacity-[0.08] transition-[width] duration-100"
              style={{
                width: `${timerProgress}%`,
              }}
            />

            <Clock className="relative size-5" />

            <span className="relative tabular-nums">
              {remaining}s
            </span>
          </div>
        </div>

        <Card className="flex flex-1 flex-col overflow-hidden rounded-[2rem] border-0 shadow-2xl">
          <CardHeader className="px-5 pb-4 pt-6 text-center sm:px-8 sm:pt-8">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-black tracking-wider text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              LOOK AT THE TEACHER SCREEN
            </div>

            <CardTitle className="mt-4 text-xl sm:text-2xl">
              Choose the matching shape
            </CardTitle>

            <p className="mt-1 text-xs text-muted-foreground">
              Tap once — your answer locks immediately.
            </p>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col justify-center p-3 sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              {shapes.map((shape) => {
                const selected =
                  answer === shape.letter;

                return (
                  <button
                    key={shape.letter}
                    disabled={
                      answered ||
                      submitting ||
                      remaining <= 0
                    }
                    onClick={() =>
                      submit(shape.letter)
                    }
                    aria-label={`Answer ${shape.letter}`}
                    className={`group relative flex min-h-[37vh] max-h-80 flex-col items-center justify-center overflow-hidden rounded-[1.6rem] ${shape.className} text-white shadow-xl transition-all duration-150 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.97] disabled:cursor-not-allowed ${
                      selected
                        ? 'scale-[0.98] ring-8 ring-white/70 brightness-110'
                        : 'disabled:opacity-65'
                    } sm:min-h-48`}
                  >
                    <span
                      className={`absolute inset-0 bg-white/10 transition-opacity ${
                        selected
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />

                    <span
                      className={`relative text-[clamp(4rem,14vw,7.5rem)] leading-none drop-shadow-md transition-transform duration-200 ${
                        selected
                          ? 'scale-110'
                          : 'group-hover:scale-105'
                      }`}
                    >
                      {shape.symbol}
                    </span>

                    <span className="relative mt-3 rounded-xl bg-black/10 px-3 py-1 text-xs font-black tracking-widest">
                      {shape.letter}
                    </span>

                    {selected && (
                      <span className="absolute right-3 top-3 rounded-full bg-white/20 p-2">
                        <Check className="size-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 min-h-9 text-center">
              {answered ? (
                <div className="inline-flex animate-in fade-in slide-in-from-bottom-2 items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm font-black text-green-700 dark:text-green-300">
                  <Check className="size-4" />
                  Answer locked — you're in!
                </div>
              ) : remaining <= 0 ? (
                <p className="font-black text-destructive">
                  Time's up — wait for the next question.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Faster correct answers improve your ranking.
                </p>
              )}

              {error && (
                <p className="mt-2 text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
