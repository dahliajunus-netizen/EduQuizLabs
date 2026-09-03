'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  current_question?: number | null;
  answered_questions?: number | null;
  answers?: Record<string, string> | null;
  status?: string | null;
  finished_at?: string | null;
  started_at?: string | null;
  last_seen_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
};

type Submission = {
  id: string;
  test_id: string;
  student_id: string;
  answers?: Record<string, string> | null;
  score?: number | null;
  created_at?: string | null;
  submitted_at?: string | null;
  updated_at?: string | null;
};

type Participant = { student_id: string; full_name?: string | null };
type UserRecord = { id: string; full_name?: string | null };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getHeaders() {
  let token = '';
  try { token = localStorage.getItem('supabase_access_token') || ''; } catch {}
  return { apikey: supabaseKey, Authorization: `Bearer ${token || supabaseKey}` };
}

function getStudentId() {
  try {
    const raw = localStorage.getItem('current_user');
    if (!raw) return '';
    const u = JSON.parse(raw);
    return String(u.student_id ?? u.id ?? u.user_id ?? u.uid ?? u.user?.student_id ?? u.user?.id ?? '').trim();
  } catch { return ''; }
}

function matchingPairs(value: string) {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p: any) => p?.left && p?.right).map((p: any) => `${String(p.left)} → ${String(p.right)}`);
  } catch { return value ? [value] : []; }
}

function normalize(value: string) { return String(value || '').trim().toLowerCase(); }
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
    } catch { return false; }
  }
  return normalize(answer) === normalize(question.correct_answer);
}

function timeValue(value?: string | null) {
  const n = value ? new Date(value).getTime() : 0;
  return Number.isFinite(n) ? n : 0;
}

function latestAttemptForStudent(rows: Attempt[], studentId: string) {
  return rows
    .filter(row => String(row.student_id) === studentId)
    .sort((a, b) => {
      const at = Math.max(timeValue(a.updated_at), timeValue(a.last_seen_at), timeValue(a.completed_at), timeValue(a.finished_at), timeValue(a.started_at));
      const bt = Math.max(timeValue(b.updated_at), timeValue(b.last_seen_at), timeValue(b.completed_at), timeValue(b.finished_at), timeValue(b.started_at));
      return bt - at;
    })[0];
}

function latestSubmissionForStudent(rows: Submission[], studentId: string) {
  return rows
    .filter(row => String(row.student_id) === studentId)
    .sort((a, b) => {
      const at = Math.max(timeValue(a.submitted_at), timeValue(a.created_at), timeValue(a.updated_at));
      const bt = Math.max(timeValue(b.submitted_at), timeValue(b.created_at), timeValue(b.updated_at));
      return bt - at;
    })[0];
}

export default function TestsSection({ tests, questions, teacher, open, busy, displayDate, formatPoints, questionTypeLabel, onCreate, onTogglePublish, onEdit, onDelete, onToggleQuestions, onEditQuestion, onDeleteQuestion }: Props) {
  const params = useParams();
  const classCode = String(Array.isArray(params.code) ? params.code[0] : params.code || '');
  const [studentId, setStudentId] = useState('');
  const [attempts, setAttempts] = useState<Record<string, Attempt[]>>({});
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [classStudents, setClassStudents] = useState<Participant[]>([]);
  const [submissionLoadError, setSubmissionLoadError] = useState('');

  useEffect(() => { if (!teacher) setStudentId(getStudentId()); }, [teacher]);

  useEffect(() => {
    if (!teacher || !classCode || !tests.length) {
      setAttempts({}); setSubmissions({}); setStudentNames({}); setClassStudents([]); setSubmissionLoadError(''); return;
    }
    let cancelled = false;
    const load = async () => {
      setSubmissionLoadError('');
      const nextAttempts: Record<string, Attempt[]> = {};
      const nextSubmissions: Record<string, Submission[]> = {};
      const nextStudentNames: Record<string, string> = {};
      let loadError = '';
      let participants: Participant[] = [];

      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_class_participants`, {
          method: 'POST', headers: { ...getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_class_code: classCode }), cache: 'no-store',
        });
        const text = await response.text();
        if (!response.ok) loadError = `Could not load class students (${response.status}). ${text}`;
        else {
          const rows = text ? JSON.parse(text) : [];
          participants = Array.isArray(rows) ? rows.map((row: any) => ({
            student_id: String(row.student_id ?? row.id ?? '').trim(), full_name: row.full_name ?? row.name ?? null,
          })).filter((row: Participant) => Boolean(row.student_id)) : [];
        }
      } catch (error) { loadError = error instanceof Error ? error.message : 'Failed to load class students.'; }

      await Promise.all(tests.map(async test => {
        try {
          const [attemptResponse, submissionResponse] = await Promise.all([
            fetch(`${supabaseUrl}/rest/v1/test_attempts?test_id=eq.${encodeURIComponent(test.id)}&select=*`, { headers: getHeaders(), cache: 'no-store' }),
            fetch(`${supabaseUrl}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(test.id)}&select=*`, { headers: getHeaders(), cache: 'no-store' }),
          ]);
          if (attemptResponse.ok) nextAttempts[test.id] = Array.isArray(await attemptResponse.json()) ? await Promise.resolve([]) : [];
          else { nextAttempts[test.id] = []; loadError ||= `Could not load test attempts (${attemptResponse.status}). ${await attemptResponse.text().catch(() => '')}`; }
          if (submissionResponse.ok) nextSubmissions[test.id] = Array.isArray(await submissionResponse.json()) ? await Promise.resolve([]) : [];
          else { nextSubmissions[test.id] = []; loadError ||= `Could not load test submissions (${submissionResponse.status}). ${await submissionResponse.text().catch(() => '')}`; }
        } catch (error) {
          nextAttempts[test.id] = []; nextSubmissions[test.id] = [];
          loadError ||= error instanceof Error ? error.message : 'Failed to load test submissions.';
        }
      }));

      // Re-fetch the two collections cleanly. The separate requests above only establish RLS/readability.
      await Promise.all(tests.map(async test => {
        try {
          const [a, s] = await Promise.all([
            fetch(`${supabaseUrl}/rest/v1/test_attempts?test_id=eq.${encodeURIComponent(test.id)}&select=*`, { headers: getHeaders(), cache: 'no-store' }),
            fetch(`${supabaseUrl}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(test.id)}&select=*`, { headers: getHeaders(), cache: 'no-store' }),
          ]);
          if (a.ok) { const rows = await a.json(); nextAttempts[test.id] = Array.isArray(rows) ? rows : []; }
          if (s.ok) { const rows = await s.json(); nextSubmissions[test.id] = Array.isArray(rows) ? rows : []; }
        } catch {}
      }));

      participants.forEach(p => { const name = String(p.full_name || '').trim(); if (name) nextStudentNames[p.student_id] = name; });
      const ids = Array.from(new Set([
        ...participants.map(p => String(p.student_id || '').trim()),
        ...Object.values(nextAttempts).flat().map(a => String(a.student_id || '').trim()),
        ...Object.values(nextSubmissions).flat().map(s => String(s.student_id || '').trim()),
      ].filter(Boolean)));
      const missingNameIds = ids.filter(id => !nextStudentNames[id]);
      if (missingNameIds.length) {
        try {
          const r = await fetch(`${supabaseUrl}/rest/v1/users?id=in.(${missingNameIds.map(encodeURIComponent).join(',')})&select=id,full_name`, { headers: getHeaders(), cache: 'no-store' });
          if (r.ok) {
            const users = await r.json();
            if (Array.isArray(users)) users.forEach((u: UserRecord) => { const name = String(u.full_name || '').trim(); if (u.id && name) nextStudentNames[String(u.id)] = name; });
          }
        } catch (error) { console.error('Failed to load student names:', error); }
      }
      if (!cancelled) { setClassStudents(participants); setAttempts(nextAttempts); setSubmissions(nextSubmissions); setStudentNames(nextStudentNames); setSubmissionLoadError(loadError); }
    };
    void load();
    const timer = window.setInterval(load, 2000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [teacher, classCode, tests.map(test => test.id).join('|')]);

  useEffect(() => { if (teacher || !studentId || !tests.length) return; }, [teacher, studentId, tests.length]);

  return (
    <section className="space-y-3">
      <Participants />
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="flex items-center gap-2 text-base font-bold tracking-tight"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><FlaskConical className="size-4" /></span>Tests</h3><p className="mt-0.5 text-xs text-muted-foreground">{teacher ? 'Drafts and published tests for this course.' : 'Published tests for this course.'}</p></div>
        {teacher && <Button type="button" size="sm" className="rounded-xl shadow-sm" onClick={onCreate} disabled={busy}><PlusCircle className="mr-1 size-4" />Test Maker</Button>}
      </div>
      {submissionLoadError && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">{submissionLoadError}</div>}

      {tests.length ? tests.map(test => {
        const qs = questions[test.id] || [];
        const testAttempts = attempts[test.id] || [];
        const testSubmissions = submissions[test.id] || [];
        return (
          <div key={test.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><FlaskConical className="size-5" /></span>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{test.title}</h4><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${test.published ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>{test.published ? 'Published' : 'Draft'}</span></div>{test.description && <p className="mt-1 text-sm leading-5 text-muted-foreground">{test.description}</p>}<div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{qs.length} question{qs.length === 1 ? '' : 's'}</span>{qs.length > 0 && <span>{formatPoints(qs.length)} pts/question</span>}{test.due_date && <span className="flex items-center gap-1"><Clock3 className="size-3" />Due {displayDate(test.due_date)}</span>}</div>{!teacher && test.published && <div className="mt-3 flex flex-wrap items-center gap-2"><Link href={`/dashboard/student/tests/${encodeURIComponent(test.id)}`}><Button type="button" size="sm" className="rounded-xl">Take Test</Button></Link></div>}</div>
              {teacher && <div className="flex shrink-0 gap-1"><Button type="button" variant="outline" size="icon" className="size-9 rounded-lg" onClick={() => onTogglePublish(test)} title={test.published ? 'Unpublish' : 'Publish'}>{test.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button><Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => onEdit(test)}><Pencil className="mr-1 size-4" />Edit</Button><Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => onDelete(test)}><Trash2 size={14} /></Button><Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg" onClick={() => onToggleQuestions(test.id)}>{open[test.id] ? <ChevronUp /> : <ChevronDown />}</Button></div>}
            </div>

            {teacher && open[test.id] && <div className="space-y-4 border-t border-border/70 bg-muted/10 p-4 sm:p-5">
              <div className="overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="border-b bg-muted/50"><tr><th className="px-4 py-3 text-left font-bold">Name</th><th className="px-4 py-3 text-left font-bold">Progress</th><th className="px-4 py-3 text-left font-bold">Attempts</th><th className="px-4 py-3 text-left font-bold">Grade</th>{qs.map((_, index) => <th key={index} className="px-4 py-3 text-center font-bold">Q{index + 1}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {(() => {
                      const ids = new Set([...classStudents.map(s => String(s.student_id || '').trim()), ...testAttempts.map(a => String(a.student_id || '').trim()), ...testSubmissions.map(s => String(s.student_id || '').trim())].filter(Boolean));
                      if (!ids.size) return <tr><td colSpan={4 + qs.length} className="px-4 py-8 text-center text-muted-foreground"><Users className="mx-auto mb-2 size-7" />No students are enrolled in this class yet.</td></tr>;
                      return Array.from(ids).map(studentId => {
                        const studentAttempts = testAttempts.filter(a => String(a.student_id) === studentId);
                        const attempt = latestAttemptForStudent(testAttempts, studentId);
                        const submission = latestSubmissionForStudent(testSubmissions, studentId);
                        const answers = attempt?.answers || submission?.answers || {};
                        const finished = Boolean(attempt?.finished_at) || Boolean(attempt?.completed_at) || attempt?.status === 'completed';
                        const lastSeen = attempt?.last_seen_at || attempt?.updated_at || attempt?.completed_at || attempt?.finished_at;
                        const stale = lastSeen ? Date.now() - timeValue(lastSeen) > 120000 : false;
                        const doing = Boolean(attempt) && !finished && !stale;
                        const answeredCount = attempt?.answered_questions ?? Object.keys(attempt?.answers || {}).length;
                        const progress = finished ? 'Done' : doing ? 'Currently doing' : attempt ? 'Not active' : 'Not started';
                        const studentName = studentNames[studentId] || classStudents.find(s => s.student_id === studentId)?.full_name || attempt?.student_name || `Student ${studentId.slice(0, 6)}`;
                        const grade = submission?.score == null ? '—' : Number(submission.score).toFixed(2);
                        const attemptsCount = studentAttempts.length;
                        return <tr key={studentId}><td className="px-4 py-3 font-semibold">{studentName}</td><td className="px-4 py-3"><div className="font-semibold">{progress}</div><div className="text-xs text-muted-foreground">{Math.min(Number(answeredCount) || 0, qs.length)} / {qs.length} answered</div></td><td className="px-4 py-3"><span className="font-bold">{attemptsCount}</span><span className="ml-1 text-xs text-muted-foreground">attempt{attemptsCount === 1 ? '' : 's'}</span></td><td className="px-4 py-3 font-black">{grade}</td>{qs.map((q, index) => { const answer = answers[q.id || ''] || ''; if (!submission && !attempt?.answers) return <td key={q.id || index} className="px-4 py-3 text-center text-muted-foreground">—</td>; const ok = isCorrect(q, answer); const points = formatPoints(qs.length); return <td key={q.id || index} className="px-4 py-3 text-center"><span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold ${ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}><span>{ok ? '✓' : '✕'}</span>{points.toFixed(2)}</span></td>; })}</tr>;
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="size-3.5" />{testAttempts.filter(a => !a.finished_at && !a.completed_at && a.status !== 'completed').length} active attempt{testAttempts.filter(a => !a.finished_at && !a.completed_at && a.status !== 'completed').length === 1 ? '' : 's'} • {testSubmissions.length} completed submission{testSubmissions.length === 1 ? '' : 's'}</div>
              <div className="space-y-2">
                {qs.length === 0 && <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">No questions yet. Open Test Maker to add them.</p>}
                {qs.map((question, index) => { const type = question.question_type || 'multiple-choice'; return <div key={question.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{index + 1}. {question.question}</p><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{questionTypeLabel(type)}</span></div>{type === 'multiple-choice' && <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2"><span>A. {question.option_a}</span><span>B. {question.option_b}</span><span>C. {question.option_c}</span><span>D. {question.option_d}</span></div>}{type === 'true-false' && <div className="mt-2 text-sm text-muted-foreground">A. True &nbsp; B. False</div>}{type === 'fill-blank' && <div className="mt-2 text-sm text-muted-foreground">Answer: {question.option_a}</div>}{type === 'matching' && <div className="mt-2 space-y-1 text-sm text-muted-foreground">{matchingPairs(question.option_a).map((pair, pairIndex) => <div key={pairIndex}>{pair}</div>)}</div>}</div><div className="flex shrink-0 gap-1"><Button type="button" variant="outline" size="icon" className="size-9 rounded-lg" onClick={() => onEditQuestion(question)}><Pencil className="size-4" /></Button><Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => onDeleteQuestion(question)}><Trash2 size={14} /></Button></div></div></div>; })}
              </div>
            </div>}
          </div>
        );
      }) : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No tests yet.</div>}
    </section>
  );
}
