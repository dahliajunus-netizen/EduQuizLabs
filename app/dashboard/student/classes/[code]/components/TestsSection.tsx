'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil, PlusCircle, Trash2, FlaskConical, Clock3, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Participants from './Participants';
import type { Question, Test } from './types';

type Props = {
  tests: Test[];
  questions: Record<string, Question[]>;
  teacher: boolean;
  open: Record<string, boolean>;
  busy?: boolean;
  displayDate: (value?: string | null) => string;
  formatPoints: (count: number) => number;
  questionTypeLabel: (type?: Question['question_type']) => string;
  onCreate: () => void;
  onTogglePublish: (test: Test) => void;
  onEdit: (test: Test) => void;
  onDelete: (test: Test) => void;
  onToggleQuestions: (id: string) => void;
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (question: Question) => void;
};

type Attempt = {
  id: string;
  test_id: string;
  student_id: string;
  student_name?: string | null;
  current_question: number;
  answered_questions: number;
  finished_at?: string | null;
  started_at?: string | null;
  last_seen_at?: string | null;
};

type Submission = {
  id: string;
  test_id: string;
  student_id: string;
  answers?: Record<string, string> | null;
  score?: number | null;
};

type UserRecord = {
  id: string;
  full_name?: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

function getStudentId() {
  try {
    const raw = localStorage.getItem('current_user');
    if (!raw) return '';
    const u = JSON.parse(raw);
    return String(u.student_id ?? u.id ?? u.user_id ?? u.uid ?? u.user?.student_id ?? u.user?.id ?? '').trim();
  } catch {
    return '';
  }
}

function matchingPairs(value: string) {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p: any) => p?.left && p?.right).map((p: any) => `${String(p.left)} → ${String(p.right)}`);
  } catch {
    return value ? [value] : [];
  }
}

function normalize(value: string) {
  return String(value || '').trim().toLowerCase();
}

function normalizeTf(value: string) {
  const v = normalize(value);
  if (v === 'a' || v === 'true') return 'a';
  if (v === 'b' || v === 'false') return 'b';
  return v;
}

function isCorrect(question: Question, answer: string) {
  const type = question.question_type || 'multiple-choice';
  if (!answer) return false;
  if (type === 'fill-blank') return normalize(answer) === normalize(question.option_a);
  if (type === 'true-false') return normalizeTf(answer) === normalizeTf(question.correct_answer);
  if (type === 'matching') {
    try {
      const selected = JSON.parse(answer);
      const pairs = JSON.parse(question.option_a || '[]');
      return Array.isArray(pairs) && pairs.length > 0 && pairs.every((p: any) => selected?.[p.left] === p.right);
    } catch {
      return false;
    }
  }
  return normalize(answer) === normalize(question.correct_answer);
}

export default function TestsSection({ tests, questions, teacher, open, busy, displayDate, formatPoints, questionTypeLabel, onCreate, onTogglePublish, onEdit, onDelete, onToggleQuestions, onEditQuestion, onDeleteQuestion }: Props) {
  const [studentId, setStudentId] = useState('');
  const [attempts, setAttempts] = useState<Record<string, Attempt[]>>({});
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!teacher) setStudentId(getStudentId());
  }, [teacher]);

  useEffect(() => {
    if (!teacher || !tests.length) {
      setAttempts({});
      setSubmissions({});
      setStudentNames({});
      return;
    }

    let cancelled = false;
    const load = async () => {
      const nextAttempts: Record<string, Attempt[]> = {};
      const nextSubmissions: Record<string, Submission[]> = {};

      await Promise.all(tests.map(async test => {
        try {
          const [attemptResponse, submissionResponse] = await Promise.all([
            fetch(`${supabaseUrl}/rest/v1/test_attempts?test_id=eq.${encodeURIComponent(test.id)}&select=*`, { headers, cache: 'no-store' }),
            fetch(`${supabaseUrl}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(test.id)}&select=*`, { headers, cache: 'no-store' }),
          ]);

          if (attemptResponse.ok) {
            const rows = await attemptResponse.json();
            nextAttempts[test.id] = Array.isArray(rows) ? rows : [];
          } else {
            nextAttempts[test.id] = [];
          }

          if (submissionResponse.ok) {
            const rows = await submissionResponse.json();
            nextSubmissions[test.id] = Array.isArray(rows) ? rows : [];
          } else {
            nextSubmissions[test.id] = [];
          }
        } catch {
          nextAttempts[test.id] = [];
          nextSubmissions[test.id] = [];
        }
      }));

      const ids = Array.from(new Set([
        ...Object.values(nextAttempts).flat().map(attempt => String(attempt.student_id || '').trim()),
        ...Object.values(nextSubmissions).flat().map(submission => String(submission.student_id || '').trim()),
      ].filter(Boolean)));

      const nextStudentNames: Record<string, string> = {};

      if (ids.length) {
        try {
          const userResponse = await fetch(
            `${supabaseUrl}/rest/v1/users?id=in.(${ids.join(',')})&select=id,full_name`,
            { headers, cache: 'no-store' }
          );

          if (userResponse.ok) {
            const users = await userResponse.json();
            if (Array.isArray(users)) {
              users.forEach((user: UserRecord) => {
                const name = String(user.full_name || '').trim();
                if (user.id && name) nextStudentNames[String(user.id)] = name;
              });
            }
          } else {
            console.error('Failed to load student names:', await userResponse.text());
          }
        } catch (error) {
          console.error('Failed to load student names:', error);
        }
      }

      if (!cancelled) {
        setAttempts(nextAttempts);
        setSubmissions(nextSubmissions);
        setStudentNames(nextStudentNames);
      }
    };

    void load();
    const timer = window.setInterval(load, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [teacher, tests.map(test => test.id).join('|')]);

  useEffect(() => {
    if (teacher || !studentId || !tests.length) return;
  }, [teacher, studentId, tests.length]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><FlaskConical className="size-4" /></span>
            Tests
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{teacher ? 'Drafts and published tests for this course.' : 'Published tests for this course.'}</p>
        </div>
        {teacher && <div className="flex items-center gap-2"><Participants /><Button type="button" size="sm" className="rounded-xl shadow-sm" onClick={onCreate} disabled={busy}><PlusCircle className="mr-1 size-4" />Test Maker</Button></div>}
      </div>

      {tests.length ? tests.map(test => {
        const qs = questions[test.id] || [];
        const testAttempts = attempts[test.id] || [];
        const testSubmissions = submissions[test.id] || [];

        return (
          <div key={test.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><FlaskConical className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold">{test.title}</h4>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${test.published ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>{test.published ? 'Published' : 'Draft'}</span>
                </div>
                {test.description && <p className="mt-1 text-sm leading-5 text-muted-foreground">{test.description}</p>}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{qs.length} question{qs.length === 1 ? '' : 's'}</span>
                  {qs.length > 0 && <span>{formatPoints(qs.length)} pts/question</span>}
                  {test.due_date && <span className="flex items-center gap-1"><Clock3 className="size-3" />Due {displayDate(test.due_date)}</span>}
                </div>
                {!teacher && test.published && <div className="mt-3 flex flex-wrap items-center gap-2"><Link href={`/dashboard/student/tests/${encodeURIComponent(test.id)}`}><Button type="button" size="sm" className="rounded-xl">Take Test</Button></Link></div>}
              </div>
              {teacher && <div className="flex shrink-0 gap-1">
                <Button type="button" variant="outline" size="icon" className="size-9 rounded-lg" onClick={() => onTogglePublish(test)} title={test.published ? 'Unpublish' : 'Publish'}>{test.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
                <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => onEdit(test)}><Pencil className="mr-1 size-4" />Edit</Button>
                <Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => onDelete(test)}><Trash2 size={14} /></Button>
                <Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg" onClick={() => onToggleQuestions(test.id)}>{open[test.id] ? <ChevronUp /> : <ChevronDown />}</Button>
              </div>}
            </div>

            {teacher && open[test.id] && <div className="space-y-4 border-t border-border/70 bg-muted/10 p-4 sm:p-5">
              <div className="overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b bg-muted/50"><tr><th className="px-4 py-3 text-left font-bold">Name</th><th className="px-4 py-3 text-left font-bold">Progress</th><th className="px-4 py-3 text-left font-bold">Grade</th>{qs.map((_, index) => <th key={index} className="px-4 py-3 text-center font-bold">Q{index + 1}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {(() => {
                      const ids = new Set([...testAttempts.map(a => String(a.student_id)), ...testSubmissions.map(s => String(s.student_id))]);
                      if (!ids.size) return <tr><td colSpan={3 + qs.length} className="px-4 py-8 text-center text-muted-foreground"><Users className="mx-auto mb-2 size-7" />No students have started this test yet.</td></tr>;
                      return Array.from(ids).map(studentId => {
                        const attempt = testAttempts.find(a => String(a.student_id) === studentId);
                        const submission = testSubmissions.find(s => String(s.student_id) === studentId);
                        const answers = submission?.answers || {};
                        const finished = Boolean(submission) || Boolean(attempt?.finished_at);
                        const stale = attempt?.last_seen_at ? Date.now() - new Date(attempt.last_seen_at).getTime() > 120000 : false;
                        const doing = Boolean(attempt) && !finished && !stale;
                        const answeredCount = attempt?.answered_questions ?? qs.filter(q => Boolean(answers[q.id || ''])).length;
                        const progress = finished ? 'Done' : doing ? 'Currently doing' : 'Not active';
                        const studentName = studentNames[studentId] || attempt?.student_name || `Student ${studentId.slice(0, 6)}`;
                        const grade = submission?.score == null ? '—' : Number(submission.score).toFixed(2);
                        return <tr key={studentId}><td className="px-4 py-3 font-semibold">{studentName}</td><td className="px-4 py-3"><div className="font-semibold">{progress}</div><div className="text-xs text-muted-foreground">{Math.min(answeredCount, qs.length)} / {qs.length} answered</div></td><td className="px-4 py-3 font-black">{grade}</td>{qs.map((q, index) => { const answer = answers[q.id || ''] || ''; if (!submission) return <td key={q.id || index} className="px-4 py-3 text-center text-muted-foreground">—</td>; const ok = isCorrect(q, answer); const points = formatPoints(qs.length); return <td key={q.id || index} className="px-4 py-3 text-center"><span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold ${ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}><span>{ok ? '✓' : '✕'}</span>{points.toFixed(2)}</span></td>; })}</tr>;
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="size-3.5" />{testAttempts.filter(a => !a.finished_at).length} active attempt{testAttempts.filter(a => !a.finished_at).length === 1 ? '' : 's'} • {testSubmissions.length} completed submission{testSubmissions.length === 1 ? '' : 's'}</div>
              <div className="space-y-2">
                {qs.length === 0 && <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">No questions yet. Open Test Maker to add them.</p>}
                {qs.map((question, index) => { const type = question.question_type || 'multiple-choice'; return <div key={question.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{index + 1}. {question.question}</p><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{questionTypeLabel(type)}</span></div>{type === 'multiple-choice' && <div className="mt-2 grid gap-1 text-sm text-muted-foreground md:grid-cols-2"><span>A: {question.option_a}</span><span>B: {question.option_b}</span><span>C: {question.option_c}</span><span>D: {question.option_d}</span></div>}{type === 'true-false' && <p className="mt-2 text-sm text-muted-foreground">Students choose True or False.</p>}{type === 'fill-blank' && <p className="mt-2 text-sm text-muted-foreground">Students type the answer. Correct answer: <b>{question.option_a}</b></p>}{type === 'matching' && <div className="mt-2 space-y-1 text-sm text-muted-foreground">{matchingPairs(question.option_a).map((pair: string, i: number) => <div key={i} className="rounded-lg bg-muted/50 px-2 py-1">{pair}</div>)}</div>}<p className="mt-2 text-xs text-muted-foreground">{formatPoints(qs.length)} pts</p></div><div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onEditQuestion(question)}><Pencil className="size-3" /></Button><Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => onDeleteQuestion(question)}><Trash2 className="size-3" /></Button></div></div></div>; })}
              </div>
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => onEdit(test)}><Pencil className="mr-1 size-4" />Open Test Maker</Button>
            </div>}
          </div>
        );
      }) : <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center"><FlaskConical className="mx-auto size-7 text-muted-foreground/60" /><p className="mt-2 text-sm font-medium">{teacher ? 'No tests yet' : 'No published tests yet'}</p><p className="mt-1 text-xs text-muted-foreground">{teacher ? 'Create your first test with Test Maker.' : 'Your teacher has not published a test here yet.'}</p></div>}
    </section>
  );
}
