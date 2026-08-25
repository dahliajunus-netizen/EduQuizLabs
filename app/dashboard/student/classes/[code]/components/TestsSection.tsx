'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
type AttemptMap = Record<string, number>;

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

export default function TestsSection({ tests, questions, teacher, open, busy, displayDate, formatPoints, questionTypeLabel, onCreate, onTogglePublish, onEdit, onDelete, onToggleQuestions, onEditQuestion, onDeleteQuestion }: Props) {
  const [studentId, setStudentId] = useState('');
  const [attempts, setAttempts] = useState<AttemptMap>({});

  useEffect(() => {
    if (teacher) return;
    setStudentId(getStudentId());
  }, [teacher]);

  useEffect(() => {
    if (teacher || !studentId || !tests.length) {
      setAttempts({});
      return;
    }

    let cancelled = false;
    (async () => {
      const next: AttemptMap = {};
      await Promise.all(tests.map(async (test) => {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/test_submissions?test_id=eq.${encodeURIComponent(test.id)}&student_id=eq.${encodeURIComponent(studentId)}&select=id`, { headers, cache: 'no-store' });
          if (!response.ok) { next[test.id] = 0; return; }
          const rows = await response.json();
          next[test.id] = Array.isArray(rows) ? rows.length : 0;
        } catch { next[test.id] = 0; }
      }));
      if (!cancelled) setAttempts(next);
    })();

    return () => { cancelled = true; };
  }, [teacher, studentId, tests.map(test => `${test.id}:${test.max_attempts}`).join('|')]);

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <div><h3 className="font-semibold">🧪 Tests</h3><p className="text-xs text-muted-foreground">{teacher ? 'Drafts and published tests for this course.' : 'Published tests for this course.'}</p></div>
        {teacher && <Button type="button" size="sm" onClick={onCreate} disabled={busy}><PlusCircle className="mr-1 size-4" />Test Maker</Button>}
      </div>

      {tests.length ? tests.map(test => {
        const qs = questions[test.id] || [];
        const used = attempts[test.id] || 0;
        const max = Math.max(1, Number(test.max_attempts) || 1);
        const exhausted = !teacher && used >= max;
        const target = exhausted && test.allow_review !== false ? `/dashboard/student/tests/${test.id}?review=latest` : `/dashboard/student/tests/${test.id}`;
        return <div key={test.id} className="mb-2 overflow-hidden rounded-lg border">
          <div className="flex items-start gap-3 p-4">
            <div className="flex-1"><b>{test.title}</b>{test.description&&<p className="text-sm text-muted-foreground">{test.description}</p>}{test.due_date&&<p className="mt-1 text-xs text-muted-foreground">Due: {displayDate(test.due_date)}</p>}<p className="text-xs text-muted-foreground">{qs.length} question{qs.length===1?'':'s'} · {test.published?'Published':'Draft'}{qs.length?` · ${formatPoints(qs.length)} points/question`:''}</p>{!teacher&&test.published&&<div className="mt-3 flex flex-wrap items-center gap-2"><Link href={target}><Button type="button" size="sm" variant={exhausted ? 'outline' : 'default'}>{exhausted ? 'Review Test' : 'Take Test'}</Button></Link>{!exhausted&&<span className="text-xs text-muted-foreground">Attempt {Math.min(used + 1, max)} of {max}</span>}{exhausted&&test.allow_review===false&&<span className="text-xs text-muted-foreground">Review not permitted</span>}</div>}</div>
            {teacher&&<div className="flex gap-1"><Button type="button" variant="outline" size="sm" onClick={()=>onTogglePublish(test)} title={test.published?'Unpublish':'Publish'}>{test.published?<EyeOff className="size-4"/>:<Eye className="size-4"/>}</Button><Button type="button" variant="outline" size="sm" onClick={()=>onEdit(test)}><Pencil className="mr-1 size-4"/>Edit</Button><Button type="button" variant="ghost" size="sm" onClick={()=>onDelete(test)}><Trash2 size={14}/></Button><Button type="button" variant="ghost" size="sm" onClick={()=>onToggleQuestions(test.id)}>{open[test.id]?<ChevronUp/>:<ChevronDown/>}</Button></div>}
          </div>

          {teacher&&open[test.id]&&<div className="space-y-2 border-t p-4">
            {qs.length===0&&<p className="text-sm text-muted-foreground">No questions yet. Open Test Maker to add them.</p>}
            {qs.map((question,index)=>{
              const type=question.question_type||'multiple-choice';
              return <div key={question.id} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{index+1}. {question.question}</p><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{questionTypeLabel(type)}</span></div>
                {type==='multiple-choice'&&!question.question_type&&<p className="mt-2 text-sm text-muted-foreground">A: {question.option_a} · B: {question.option_b} · C: {question.option_c} · D: {question.option_d}</p>}
                {type==='multiple-choice'&&question.question_type&&<div className="mt-2 grid gap-1 text-sm text-muted-foreground md:grid-cols-2"><span>A: {question.option_a}</span><span>B: {question.option_b}</span><span>C: {question.option_c}</span><span>D: {question.option_d}</span></div>}
                {type==='true-false'&&<p className="mt-2 text-sm text-muted-foreground">Students choose <b>True</b> or <b>False</b>.</p>}
                {type==='fill-blank'&&<p className="mt-2 text-sm text-muted-foreground">Students type the answer into an input box. Correct answer: <b>{question.option_a}</b></p>}
                {type==='matching'&&<div className="mt-2 space-y-1 text-sm text-muted-foreground">{matchingPairs(question.option_a).map((pair:string,i:number)=><div key={i} className="rounded bg-muted/40 px-2 py-1">{pair}</div>)}</div>}
                <p className="mt-2 text-xs">{formatPoints(qs.length)} pts</p></div><div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" size="sm" onClick={()=>onEditQuestion(question)}><Pencil className="size-3"/></Button><Button type="button" variant="ghost" size="sm" onClick={()=>onDeleteQuestion(question)}><Trash2 className="size-3"/></Button></div></div></div>;
            })}
            <Button type="button" variant="outline" size="sm" onClick={()=>onEdit(test)}><Pencil className="mr-1 size-4"/>Open Test Maker</Button>
          </div>}
        </div>;
      }) : <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">{teacher?'No tests yet. Click Test Maker to create one.':'No published tests yet.'}</p>}
    </section>
  );
}
