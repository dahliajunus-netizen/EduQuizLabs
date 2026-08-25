'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, CheckCircle2, Loader2, Lock, X } from 'lucide-react';

type Test = {
  id: string;
  class_code: string;
  title: string;
  description: string | null;
  published: boolean;
  due_date?: string | null;
  test_password?: string | null;
  time_limit_minutes?: number | null;
  max_attempts?: number | null;
  allow_review?: boolean | null;
};

type Question = {
  id: string;
  test_id: string;
  question_order: number;
  question: string;
  question_type?: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  points: number;
};

type MatchPair = {
  left: string;
  right: string;
};

type NormalizedType =
  | 'multiple-choice'
  | 'true-false'
  | 'fill-blank'
  | 'matching';

type Submission = {
  id: string;
  test_id: string;
  student_id: string;
  answers: Record<string, string> | null;
  score: number;
};

type TestAttempt = {
  id: string;
  test_id: string;
  student_id: string;
  status?: string | null;
  answers?: Record<string, string> | null;
  started_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

function getStudentId() {
  try {
    const raw = localStorage.getItem('current_user');
    if (!raw) return null;

    const u = JSON.parse(raw);

    return (
      String(
        u.student_id ??
          u.id ??
          u.user_id ??
          u.uid ??
          ''
      ).trim() || null
    );
  } catch {
    return null;
  }
}

function typeOf(q: Question): NormalizedType {
  const r = String(q.question_type ?? 'multiple-choice')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');

  if (
    r === 'true-false' ||
    r === 'truefalse' ||
    r === 'boolean'
  ) {
    return 'true-false';
  }

  if (
    r === 'fill-blank' ||
    r === 'fill-in-blank' ||
    r === 'fillintheblank' ||
    r === 'fill-blank-question'
  ) {
    return 'fill-blank';
  }

  if (r === 'matching' || r === 'match') {
    return 'matching';
  }

  return 'multiple-choice';
}

function pairsOf(q: Question): MatchPair[] {
  try {
    const p = JSON.parse(q.option_a || '[]');

    return Array.isArray(p)
      ? p
          .map((x: any) => ({
            left: String(x?.left ?? ''),
            right: String(x?.right ?? ''),
          }))
          .filter(
            (x: MatchPair) => x.left && x.right
          )
      : [];
  } catch {
    return q.option_a && q.option_b
      ? [{ left: q.option_a, right: q.option_b }]
      : [];
  }
}

function norm(v: string) {
  return v.trim().toLowerCase();
}

function tf(v: string) {
  const x = norm(v);

  if (x === 'a' || x === 'true') return 'A';
  if (x === 'b' || x === 'false') return 'B';

  return v;
}

function publicDescription(d: string | null) {
  return (d || '').replace(
    /^\[\[EQ_PASSWORD:[^\]]+\]\]\s*/,
    ''
  );
}

export default function TakeTestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = String(params?.id || '');
  const reviewLatest =
    searchParams.get('review') === 'latest';

  const [test, setTest] =
    useState<Test | null>(null);

  const [questions, setQuestions] =
    useState<Question[]>([]);

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [password, setPassword] =
    useState('');

  const [enteredPassword, setEnteredPassword] =
    useState('');

  const [unlocked, setUnlocked] =
    useState(false);

  const [confirmSubmit, setConfirmSubmit] =
    useState(false);

  const [error, setError] =
    useState('');

  const [submissions, setSubmissions] =
    useState<Submission[]>([]);

  const [reviewing, setReviewing] =
    useState<Submission | null>(null);

  const [startedAt, setStartedAt] =
    useState<number | null>(null);

  const [timeRemaining, setTimeRemaining] =
    useState<number | null>(null);

  const [studentId, setStudentId] =
    useState<string | null>(null);

  const [attempt, setAttempt] =
    useState<TestAttempt | null>(null);

  const answersRef =
    useRef<Record<string, string>>({});

  const attemptRef =
    useRef<TestAttempt | null>(null);

  const savingAttemptRef =
    useRef(false);

  const maxAttempts =
    Math.max(
      1,
      Number(test?.max_attempts) || 1
    );

  const latestSubmission =
    submissions[0] || null;

  const attemptsUsed =
    submissions.length;

  const attemptsLeft =
    Math.max(
      0,
      maxAttempts - attemptsUsed
    );

  const activeAnswers =
    reviewing?.answers || answers;

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  /*
   * Create an active test_attempts row.
   *
   * This is the important part for the teacher's
   * "Currently doing" table.
   */
  async function createAttempt(
    sid: string,
    initialAnswers: Record<string, string> = {}
  ) {
    const now = new Date().toISOString();

    const response = await fetch(
      `${url}/rest/v1/test_attempts`,
      {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          test_id: id,
          student_id: sid,
          status: 'in_progress',
          answers: initialAnswers,
          started_at: now,
          updated_at: now,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Could not start test attempt: ${await response.text()}`
      );
    }

    const data = await response.json();

    const created =
      (Array.isArray(data)
        ? data[0]
        : data) as TestAttempt;

    attemptRef.current = created;
    setAttempt(created);

    return created;
  }

  /*
   * Find an attempt which is already in progress.
   *
   * This makes refreshes/reloads recover the same attempt
   * instead of creating another "Currently doing" row.
   */
  async function findActiveAttempt(
    sid: string
  ) {
    const response = await fetch(
      `${url}/rest/v1/test_attempts?test_id=eq.${encodeURIComponent(
        id
      )}&student_id=eq.${encodeURIComponent(
        sid
      )}&status=eq.in_progress&select=*&order=started_at.desc&limit=1`,
      {
        headers,
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || !data[0]) {
      return null;
    }

    const found =
      data[0] as TestAttempt;

    attemptRef.current = found;
    setAttempt(found);

    if (found.answers) {
      answersRef.current = found.answers;
      setAnswers(found.answers);
    }

    if (found.started_at) {
      const timestamp =
        new Date(found.started_at).getTime();

      setStartedAt(timestamp);
    }

    return found;
  }

  /*
   * Keep the active attempt alive and save answers.
   */
  async function updateAttempt(
    nextAnswers = answersRef.current
  ) {
    const current =
      attemptRef.current;

    if (
      !current?.id ||
      savingAttemptRef.current
    ) {
      return;
    }

    savingAttemptRef.current = true;

    try {
      const now =
        new Date().toISOString();

      const response = await fetch(
        `${url}/rest/v1/test_attempts?id=eq.${encodeURIComponent(
          current.id
        )}`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            answers: nextAnswers,
            status: 'in_progress',
            updated_at: now,
          }),
        }
      );

      if (!response.ok) {
        console.error(
          'Failed to update test attempt:',
          await response.text()
        );
      }
    } catch (e) {
      console.error(
        'Failed to update test attempt:',
        e
      );
    } finally {
      savingAttemptRef.current = false;
    }
  }

  /*
   * Mark the active attempt completed.
   */
  async function completeAttempt(
    finalAnswers: Record<string, string>
  ) {
    const current =
      attemptRef.current;

    if (!current?.id) {
      return;
    }

    try {
      const now =
        new Date().toISOString();

      const response = await fetch(
        `${url}/rest/v1/test_attempts?id=eq.${encodeURIComponent(
          current.id
        )}`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            answers: finalAnswers,
            status: 'completed',
            updated_at: now,
            completed_at: now,
          }),
        }
      );

      if (!response.ok) {
        console.error(
          'Failed to complete test attempt:',
          await response.text()
        );
      }

      setAttempt(null);
      attemptRef.current = null;
    } catch (e) {
      console.error(
        'Failed to complete test attempt:',
        e
      );
    }
  }

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const sid = getStudentId();

        if (!sid) {
          throw new Error(
            'Student UUID not found. Please sign in again.'
          );
        }

        setStudentId(sid);

        const tr = await fetch(
          `${url}/rest/v1/tests?id=eq.${encodeURIComponent(
            id
          )}&published=eq.true&select=*`,
          {
            headers,
            cache: 'no-store',
          }
        );

        const td = await tr.json();

        if (!tr.ok || !td[0]) {
          throw new Error(
            'Test not found or not published.'
          );
        }

        const loadedTest =
          td[0] as Test;

        setTest(loadedTest);

        const required =
          String(
            loadedTest.test_password || ''
          ).trim();

        setPassword(required);

        setUnlocked(!required);

        const qr = await fetch(
          `${url}/rest/v1/test_questions?test_id=eq.${encodeURIComponent(
            id
          )}&select=*&order=question_order.asc,id.asc`,
          {
            headers,
            cache: 'no-store',
          }
        );

        if (!qr.ok) {
          throw new Error(
            await qr.text()
          );
        }

        setQuestions(await qr.json());

        const sr = await fetch(
          `${url}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(
            id
          )}&student_id=eq.${encodeURIComponent(
            sid
          )}&select=*`,
          {
            headers,
            cache: 'no-store',
          }
        );

        let rows: Submission[] = [];

        if (sr.ok) {
          const data =
            await sr.json();

          rows = Array.isArray(data)
            ? data
            : [];

          setSubmissions(rows);
        }

        /*
         * Review mode should never start a new attempt.
         */
        if (
          reviewLatest &&
          loadedTest.allow_review !== false &&
          rows[0]
        ) {
          setReviewing(rows[0]);
        } else if (
          rows.length <
          Math.max(
            1,
            Number(
              loadedTest.max_attempts
            ) || 1
          )
        ) {
          /*
           * First check whether this student already
           * has an active attempt.
           */
          const active =
            await findActiveAttempt(sid);

          if (active) {
            setUnlocked(true);

            const restoredStarted =
              active.started_at
                ? new Date(
                    active.started_at
                  ).getTime()
                : Date.now();

            setStartedAt(
              restoredStarted
            );

            if (
              loadedTest.time_limit_minutes
            ) {
              const limitSeconds =
                Number(
                  loadedTest.time_limit_minutes
                ) * 60;

              const elapsedSeconds =
                Math.floor(
                  (Date.now() -
                    restoredStarted) /
                    1000
                );

              setTimeRemaining(
                Math.max(
                  0,
                  limitSeconds -
                    elapsedSeconds
                )
              );
            }
          } else if (!required) {
            /*
             * No password:
             * automatically start the attempt.
             */
            setUnlocked(true);

            const created =
              await createAttempt(
                sid
              );

            const start =
              created.started_at
                ? new Date(
                    created.started_at
                  ).getTime()
                : Date.now();

            setStartedAt(start);

            setTimeRemaining(
              loadedTest.time_limit_minutes
                ? Number(
                    loadedTest.time_limit_minutes
                  ) * 60
                : null
            );
          }
        }
      } catch (e) {
        console.error(e);

        setError(
          e instanceof Error
            ? e.message
            : 'Failed to load test.'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [id, reviewLatest]);

  /*
   * Save answers regularly while the student is taking
   * the test. This is what keeps "Currently doing"
   * updated even if the student spends a long time
   * on the test.
   */
  useEffect(() => {
    if (
      loading ||
      reviewing ||
      !startedAt ||
      !attemptRef.current ||
      submitting ||
      attemptsLeft <= 0
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        void updateAttempt(
          answersRef.current
        );
      }, 5000);

    return () =>
      window.clearInterval(timer);
  }, [
    loading,
    reviewing,
    startedAt,
    submitting,
    attemptsLeft,
  ]);

  /*
   * Save immediately when leaving the page/tab.
   */
  useEffect(() => {
    if (
      !startedAt ||
      !attemptRef.current ||
      reviewing ||
      attemptsLeft <= 0
    ) {
      return;
    }

    const save = () => {
      void updateAttempt(
        answersRef.current
      );
    };

    window.addEventListener(
      'pagehide',
      save
    );

    return () =>
      window.removeEventListener(
        'pagehide',
        save
      );
  }, [
    startedAt,
    reviewing,
    attemptsLeft,
  ]);

  /*
   * Prevent browser back navigation while taking
   * the test.
   */
  useEffect(() => {
    if (
      loading ||
      reviewing ||
      !unlocked ||
      attemptsLeft <= 0 ||
      !startedAt
    ) {
      return;
    }

    const block = () => {
      history.pushState(
        null,
        '',
        location.href
      );
    };

    history.pushState(
      null,
      '',
      location.href
    );

    window.addEventListener(
      'popstate',
      block
    );

    const before = (
      e: BeforeUnloadEvent
    ) => {
      e.preventDefault();
      e.returnValue = '';
      void updateAttempt(
        answersRef.current
      );
    };

    window.addEventListener(
      'beforeunload',
      before
    );

    return () => {
      window.removeEventListener(
        'popstate',
        block
      );

      window.removeEventListener(
        'beforeunload',
        before
      );
    };
  }, [
    loading,
    reviewing,
    unlocked,
    attemptsLeft,
    startedAt,
  ]);

  /*
   * Timer.
   */
  useEffect(() => {
    if (
      !startedAt ||
      !test?.time_limit_minutes ||
      reviewing ||
      attemptsLeft <= 0 ||
      submitting
    ) {
      return;
    }

    const limitMs =
      Number(
        test.time_limit_minutes
      ) *
      60 *
      1000;

    const update = () => {
      const remaining =
        Math.max(
          0,
          Math.ceil(
            (startedAt +
              limitMs -
              Date.now()) /
              1000
          )
        );

      setTimeRemaining(
        remaining
      );

      if (
        remaining <= 0 &&
        !submitting
      ) {
        void doSubmit(true);
      }
    };

    update();

    const timer =
      window.setInterval(
        update,
        1000
      );

    return () =>
      window.clearInterval(timer);
  }, [
    startedAt,
    test?.time_limit_minutes,
    reviewing,
    attemptsLeft,
    submitting,
  ]);

  const matchingOptions =
    useMemo(() => {
      const all =
        new Set<string>();

      questions
        .filter(
          q =>
            typeOf(q) ===
            'matching'
        )
        .forEach(q =>
          pairsOf(q).forEach(p =>
            all.add(p.right)
          )
        );

      return Array.from(all);
    }, [questions]);

  function answered(
    q: Question,
    source = answers
  ) {
    if (
      typeOf(q) ===
      'matching'
    ) {
      try {
        const s =
          JSON.parse(
            source[q.id] || '{}'
          );

        return (
          pairsOf(q).length >
            0 &&
          pairsOf(q).every(
            p =>
              Boolean(
                s[p.left]
              )
          )
        );
      } catch {
        return false;
      }
    }

    return Boolean(
      source[q.id]?.trim()
    );
  }

  function correct(
    q: Question,
    source = activeAnswers
  ) {
    const a =
      source[q.id] || '';

    const t =
      typeOf(q);

    if (
      t === 'fill-blank'
    ) {
      return (
        norm(a) ===
        norm(
          q.option_a ||
            q.correct_answer ||
            ''
        )
      );
    }

    if (
      t === 'matching'
    ) {
      try {
        const s =
          JSON.parse(a);

        return pairsOf(
          q
        ).every(
          p =>
            s[p.left] ===
            p.right
        );
      } catch {
        return false;
      }
    }

    if (
      t === 'true-false'
    ) {
      return (
        tf(a) ===
        tf(q.correct_answer)
      );
    }

    return (
      norm(a) ===
      norm(q.correct_answer)
    );
  }

  async function startAttempt() {
    if (
      attemptsLeft <= 0 ||
      !studentId
    ) {
      return;
    }

    try {
      setReviewing(null);
      setAnswers({});
      answersRef.current = {};
      setError('');
      setUnlocked(true);

      /*
       * Prevent duplicate active attempts.
       */
      const existing =
        await findActiveAttempt(
          studentId
        );

      if (existing) {
        const start =
          existing.started_at
            ? new Date(
                existing.started_at
              ).getTime()
            : Date.now();

        setStartedAt(start);

        setTimeRemaining(
          test?.time_limit_minutes
            ? Math.max(
                0,
                Number(
                  test.time_limit_minutes
                ) *
                  60 -
                  Math.floor(
                    (Date.now() -
                      start) /
                      1000
                  )
              )
            : null
        );

        return;
      }

      const created =
        await createAttempt(
          studentId,
          {}
        );

      const start =
        created.started_at
          ? new Date(
              created.started_at
            ).getTime()
          : Date.now();

      setStartedAt(start);

      setTimeRemaining(
        test?.time_limit_minutes
          ? Number(
              test.time_limit_minutes
            ) * 60
          : null
      );
    } catch (e) {
      console.error(e);

      setUnlocked(false);

      setError(
        e instanceof Error
          ? e.message
          : 'Could not start the test.'
      );
    }
  }

  function enterPassword() {
    if (
      enteredPassword ===
      password
    ) {
      void startAttempt();
    } else {
      setError(
        'Incorrect test password.'
      );
    }
  }

  async function doSubmit(
    automatic = false
  ) {
    if (
      !test ||
      !studentId ||
      submitting ||
      reviewing ||
      attemptsLeft <= 0
    ) {
      return;
    }

    if (!questions.length) {
      setError(
        'This test has no questions.'
      );
      return;
    }

    if (
      !automatic &&
      questions.some(
        q => !answered(q)
      )
    ) {
      setError(
        'Please answer every question before submitting.'
      );
      return;
    }

    if (
      !automatic &&
      !confirmSubmit
    ) {
      setConfirmSubmit(
        true
      );
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const finalAnswers = {
        ...answersRef.current,
        ...answers,
      };

      /*
       * Save the final answers before submission.
       */
      await updateAttempt(
        finalAnswers
      );

      const total =
        questions.reduce(
          (s, q) =>
            s +
            Math.max(
              0,
              Number(q.points) ||
                0
            ),
          0
        );

      const earned =
        questions.reduce(
          (s, q) =>
            s +
            (correct(
              q,
              finalAnswers
            )
              ? Math.max(
                  0,
                  Number(q.points) ||
                    0
                )
              : 0),
          0
        );

      const score =
        total > 0
          ? Math.min(
              100,
              Math.round(
                (earned /
                  total) *
                  10000
              ) / 100
            )
          : 0;

      const r =
        await fetch(
          `${url}/rest/v1/test_submissions`,
          {
            method: 'POST',
            headers: {
              ...headers,
              Prefer:
                'return=representation',
            },
            body: JSON.stringify({
              test_id: id,
              student_id:
                studentId,
              answers:
                finalAnswers,
              score,
            }),
          }
        );

      if (!r.ok) {
        throw new Error(
          await r.text()
        );
      }

      const rows =
        await r.json();

      const created =
        (Array.isArray(rows)
          ? rows[0]
          : rows) as Submission;

      const submission = {
        ...created,
        answers: {
          ...finalAnswers,
        },
        score,
      };

      /*
       * IMPORTANT:
       * Remove the student from "Currently doing"
       * by marking their test_attempt completed.
       */
      await completeAttempt(
        finalAnswers
      );

      setSubmissions(
        prev => [
          submission,
          ...prev,
        ]
      );

      setConfirmSubmit(
        false
      );

      setStartedAt(null);
      setTimeRemaining(
        null
      );

      setAnswers({});
      answersRef.current = {};
    } catch (e) {
      console.error(e);

      setError(
        e instanceof Error
          ? e.message
          : 'Failed to submit test.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function reviewSubmission(
    sub: Submission
  ) {
    if (
      test?.allow_review ===
      false
    ) {
      setError(
        'Review is not permitted for this test.'
      );
      return;
    }

    setError('');
    setReviewing(sub);
  }

  function answerFor(
    q: Question
  ) {
    return (
      activeAnswers[q.id] ||
      ''
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (
    error &&
    !test
  ) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-xl px-6 py-12">
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-destructive">
                {error}
              </p>

              <Button
                className="mt-4"
                onClick={() =>
                  router.push(
                    '/dashboard/student'
                  )
                }
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!test) {
    return null;
  }

  /*
   * Password screen.
   */
  if (
    !unlocked &&
    attemptsLeft > 0
  ) {
    return (
      <div className="min-h-screen bg-background">
        <main className="flex min-h-screen items-center justify-center px-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Lock className="mx-auto size-10" />

              <CardTitle>
                {test.title}
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                This test requires a password.
              </p>

              <p className="text-xs text-muted-foreground">
                Attempt{' '}
                {attemptsUsed + 1}{' '}
                of {maxAttempts}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <Input
                type="password"
                value={
                  enteredPassword
                }
                onChange={e =>
                  setEnteredPassword(
                    e.target.value
                  )
                }
                placeholder="Test password"
                onKeyDown={e => {
                  if (
                    e.key ===
                    'Enter'
                  ) {
                    enterPassword();
                  }
                }}
              />

              {error && (
                <p className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button
                className="w-full"
                onClick={
                  enterPassword
                }
              >
                Enter Test
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() =>
                  router.push(
                    '/dashboard/student'
                  )
                }
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  /*
   * Review screen.
   */
  if (reviewing) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">
                Review: {test.title}
              </h1>

              <p className="text-muted-foreground">
                Score{' '}
                {Number(
                  reviewing.score
                ).toFixed(2)}
                /100
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() =>
                setReviewing(null)
              }
            >
              Back to Result
            </Button>
          </div>

          <div className="space-y-5">
            {questions.map(
              (q, i) => {
                const isCorrect =
                  correct(
                    q,
                    reviewing.answers ||
                      {}
                  );

                const type =
                  typeOf(q);

                const selected =
                  answerFor(q);

                return (
                  <Card
                    key={q.id}
                    className={`border-2 ${
                      isCorrect
                        ? 'border-green-500'
                        : 'border-red-500'
                    }`}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {i + 1}.{' '}
                        {q.question}
                      </CardTitle>

                      <p
                        className={`text-sm font-medium ${
                          isCorrect
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {isCorrect
                          ? 'Correct'
                          : 'Incorrect'}
                      </p>
                    </CardHeader>

                    <CardContent>
                      {type ===
                        'multiple-choice' && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(
                            [
                              'A',
                              'B',
                              'C',
                              'D',
                            ] as const
                          ).map(
                            letter => {
                              const text =
                                q[
                                  `option_${letter.toLowerCase()}` as
                                    | 'option_a'
                                    | 'option_b'
                                    | 'option_c'
                                    | 'option_d'
                                ];

                              const isSelected =
                                selected ===
                                letter;

                              const isAnswer =
                                tf(
                                  q.correct_answer
                                ) ===
                                letter;

                              return (
                                <div
                                  key={
                                    letter
                                  }
                                  className={`flex min-h-16 items-center gap-3 rounded-xl border-2 px-4 py-3 ${
                                    isAnswer
                                      ? 'border-green-500 bg-green-500/10'
                                      : isSelected
                                      ? 'border-red-500 bg-red-500/10'
                                      : 'border-border'
                                  }`}
                                >
                                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border font-bold">
                                    {
                                      letter
                                    }
                                  </span>

                                  <span className="flex-1">
                                    {
                                      text
                                    }
                                  </span>

                                  {isSelected &&
                                    !isAnswer && (
                                      <X className="size-5 text-red-600" />
                                    )}

                                  {isAnswer && (
                                    <Check className="size-5 text-green-600" />
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}

                      {type ===
                        'true-false' && (
                        <div className="grid grid-cols-2 gap-3">
                          {(
                            [
                              'A',
                              'B',
                            ] as const
                          ).map(
                            letter => {
                              const value =
                                letter ===
                                'A'
                                  ? 'True'
                                  : 'False';

                              const isSelected =
                                tf(
                                  selected
                                ) ===
                                letter;

                              const isAnswer =
                                tf(
                                  q.correct_answer
                                ) ===
                                letter;

                              return (
                                <div
                                  key={
                                    letter
                                  }
                                  className={`flex min-h-20 items-center justify-center gap-2 rounded-xl border-2 text-lg font-semibold ${
                                    isAnswer
                                      ? 'border-green-500 bg-green-500/10'
                                      : isSelected
                                      ? 'border-red-500 bg-red-500/10'
                                      : 'border-border'
                                  }`}
                                >
                                  {isSelected &&
                                    !isAnswer && (
                                      <X className="size-5 text-red-600" />
                                    )}

                                  {isAnswer && (
                                    <Check className="size-5 text-green-600" />
                                  )}

                                  {value}
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}

                      {type ===
                        'fill-blank' && (
                        <div className="space-y-3">
                          <div className="rounded-lg border-2 border-red-500 bg-red-500/10 p-3">
                            <span className="text-xs font-medium text-muted-foreground">
                              Your answer
                            </span>

                            <p>
                              {selected ||
                                'No answer'}
                            </p>

                            {!isCorrect && (
                              <X className="mt-1 size-5 text-red-600" />
                            )}
                          </div>

                          <div className="rounded-lg border-2 border-green-500 bg-green-500/10 p-3">
                            <span className="text-xs font-medium text-muted-foreground">
                              Correct answer
                            </span>

                            <p>
                              {q.option_a ||
                                q.correct_answer}
                            </p>

                            <Check className="mt-1 size-5 text-green-600" />
                          </div>
                        </div>
                      )}

                      {type ===
                        'matching' && (
                        <div className="space-y-3">
                          {pairsOf(
                            q
                          ).map(
                            (
                              pair,
                              index
                            ) => {
                              let selectedRight =
                                '';

                              try {
                                selectedRight =
                                  JSON.parse(
                                    selected ||
                                      '{}'
                                  )[
                                    pair.left
                                  ] ||
                                  '';
                              } catch {}

                              const pairCorrect =
                                selectedRight ===
                                pair.right;

                              return (
                                <div
                                  key={
                                    pair.left +
                                    index
                                  }
                                  className={`grid items-center gap-3 rounded-lg border-2 p-3 md:grid-cols-[1fr_auto_1fr] ${
                                    pairCorrect
                                      ? 'border-green-500 bg-green-500/10'
                                      : 'border-red-500 bg-red-500/10'
                                  }`}
                                >
                                  <div className="font-medium">
                                    {
                                      pair.left
                                    }
                                  </div>

                                  <span>
                                    ↔
                                  </span>

                                  <div className="flex items-center gap-2">
                                    <span>
                                      {selectedRight ||
                                        'No match'}

                                      {!pairCorrect &&
                                        ` (correct: ${pair.right})`}
                                    </span>

                                    {pairCorrect ? (
                                      <Check className="size-5 text-green-600" />
                                    ) : (
                                      <X className="size-5 text-red-600" />
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              }
            )}
          </div>
        </main>
      </div>
    );
  }

  /*
   * Result screen.
   */
  if (
    !startedAt ||
    attemptsLeft <= 0
  ) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-xl px-6 py-12">
          <Card>
            <CardContent className="py-10 text-center">
              <CheckCircle2 className="mx-auto mb-4 size-12 text-primary" />

              <h2 className="text-2xl font-bold">
                Test Submitted
              </h2>

              <p className="mt-2 text-muted-foreground">
                Your latest score is
              </p>

              <p className="mt-1 text-5xl font-bold text-primary">
                {Number(
                  latestSubmission?.score ||
                    0
                ).toFixed(2)}

                <span className="text-xl">
                  /100
                </span>
              </p>

              <p className="mt-3 text-sm text-muted-foreground">
                Attempts used:{' '}
                {attemptsUsed}/
                {maxAttempts}
              </p>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                {test.allow_review ===
                false ? (
                  <Button
                    variant="outline"
                    disabled
                  >
                    Review Not Permitted
                  </Button>
                ) : (
                  latestSubmission && (
                    <Button
                      onClick={() =>
                        reviewSubmission(
                          latestSubmission
                        )
                      }
                    >
                      Review Test
                    </Button>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  /*
   * Test-taking screen.
   */
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {test.title}
            </h1>

            <p className="text-muted-foreground">
              {publicDescription(
                test.description
              )}
            </p>

            <p className="text-sm text-muted-foreground">
              Attempt{' '}
              {attemptsUsed + 1} of{' '}
              {maxAttempts}

              {timeRemaining !==
                null &&
                ` · ${Math.floor(
                  timeRemaining /
                    60
                )}:${String(
                  timeRemaining %
                    60
                ).padStart(
                  2,
                  '0'
                )}`}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() =>
              router.push(
                '/dashboard/student'
              )
            }
          >
            Exit
          </Button>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-4">
          {questions.map(
            (q, i) => {
              const type =
                typeOf(q);

              const a =
                answers[q.id] ||
                '';

              return (
                <Card
                  key={q.id}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {i + 1}.{' '}
                      {q.question}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {type ===
                      'multiple-choice' &&
                      (
                        [
                          'A',
                          'B',
                          'C',
                          'D',
                        ] as const
                      ).map(
                        letter => (
                          <Button
                            key={
                              letter
                            }
                            type="button"
                            variant={
                              a ===
                              letter
                                ? 'default'
                                : 'outline'
                            }
                            className="mr-2 mb-2"
                            onClick={() => {
                              const next =
                                {
                                  ...answersRef.current,
                                  [q.id]:
                                    letter,
                                };

                              answersRef.current =
                                next;

                              setAnswers(
                                next
                              );

                              void updateAttempt(
                                next
                              );
                            }}
                          >
                            {letter}:{' '}
                            {
                              q[
                                `option_${letter.toLowerCase()}` as
                                  | 'option_a'
                                  | 'option_b'
                                  | 'option_c'
                                  | 'option_d'
                              ]
                            }
                          </Button>
                        )
                      )}

                    {type ===
                      'true-false' && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={
                            tf(a) ===
                            'A'
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() => {
                            const next =
                              {
                                ...answersRef.current,
                                [q.id]:
                                  'A',
                              };

                            answersRef.current =
                              next;

                            setAnswers(
                              next
                            );

                            void updateAttempt(
                              next
                            );
                          }}
                        >
                          True
                        </Button>

                        <Button
                          type="button"
                          variant={
                            tf(a) ===
                            'B'
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() => {
                            const next =
                              {
                                ...answersRef.current,
                                [q.id]:
                                  'B',
                              };

                            answersRef.current =
                              next;

                            setAnswers(
                              next
                            );

                            void updateAttempt(
                              next
                            );
                          }}
                        >
                          False
                        </Button>
                      </div>
                    )}

                    {type ===
                      'fill-blank' && (
                      <Input
                        value={a}
                        onChange={e => {
                          const next =
                            {
                              ...answersRef.current,
                              [q.id]:
                                e.target
                                  .value,
                            };

                          answersRef.current =
                            next;

                          setAnswers(
                            next
                          );
                        }}
                        onBlur={() =>
                          void updateAttempt(
                            answersRef.current
                          )
                        }
                        placeholder="Type your answer"
                      />
                    )}

                    {type ===
                      'matching' && (
                      <div className="space-y-2">
                        {pairsOf(
                          q
                        ).map(
                          pair => (
                            <div
                              key={
                                pair.left
                              }
                              className="grid gap-2 md:grid-cols-[1fr_1fr]"
                            >
                              <span className="rounded border p-2">
                                {
                                  pair.left
                                }
                              </span>

                              <select
                                className="rounded border bg-background p-2"
                                value={(() => {
                                  try {
                                    return JSON.parse(
                                      a ||
                                        '{}'
                                    )[
                                      pair
                                        .left
                                    ] || '';
                                  } catch {
                                    return '';
                                  }
                                })()}
                                onChange={e => {
                                  let s: Record<
                                    string,
                                    string
                                  > = {};

                                  try {
                                    s =
                                      JSON.parse(
                                        a ||
                                          '{}'
                                      );
                                  } catch {}

                                  const next =
                                    {
                                      ...answersRef.current,
                                      [q.id]:
                                        JSON.stringify(
                                          {
                                            ...s,
                                            [pair.left]:
                                              e
                                                .target
                                                .value,
                                          }
                                        ),
                                    };

                                  answersRef.current =
                                    next;

                                  setAnswers(
                                    next
                                  );

                                  void updateAttempt(
                                    next
                                  );
                                }}
                              >
                                <option value="">
                                  Select
                                  match
                                </option>

                                {matchingOptions.map(
                                  option => (
                                    <option
                                      key={
                                        option
                                      }
                                      value={
                                        option
                                      }
                                    >
                                      {
                                        option
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }
          )}
        </div>

        {confirmSubmit && (
          <Card className="border-primary">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <p className="font-medium">
                Submit this test? You
                will use one attempt.
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setConfirmSubmit(
                      false
                    )
                  }
                >
                  Cancel
                </Button>

                <Button
                  onClick={() =>
                    void doSubmit(
                      false
                    )
                  }
                  disabled={
                    submitting
                  }
                >
                  {submitting
                    ? 'Submitting...'
                    : 'Confirm Submit'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          className="w-full"
          onClick={() =>
            void doSubmit(
              false
            )
          }
          disabled={submitting}
        >
          {submitting
            ? 'Submitting...'
            : 'Submit Test'}
        </Button>
      </main>
    </div>
  );
}
