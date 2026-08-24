'use client';

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

export default function TestsSection({ tests, questions, teacher, open, busy, displayDate, formatPoints, questionTypeLabel, onCreate, onTogglePublish, onEdit, onDelete, onToggleQuestions, onEditQuestion, onDeleteQuestion }: Props) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <div>
          <h3 className="font-semibold">🧪 Tests</h3>
          <p className="text-xs text-muted-foreground">{teacher ? 'Drafts and published tests for this course.' : 'Published tests for this course.'}</p>
        </div>
        {teacher && <Button type="button" size="sm" onClick={onCreate} disabled={busy}><PlusCircle className="mr-1 size-4" />Test Maker</Button>}
      </div>

      {tests.length ? tests.map(test => {
        const qs = questions[test.id] || [];
        return (
          <div key={test.id} className="mb-2 overflow-hidden rounded-lg border">
            <div className="flex items-start gap-3 p-4">
              <div className="flex-1">
                <b>{test.title}</b>
                {test.description && <p className="text-sm text-muted-foreground">{test.description}</p>}
                {test.due_date && <p className="mt-1 text-xs text-muted-foreground">Due: {displayDate(test.due_date)}</p>}
                <p className="text-xs text-muted-foreground">{qs.length} question{qs.length === 1 ? '' : 's'} · {test.published ? 'Published' : 'Draft'}{qs.length ? ` · ${formatPoints(qs.length)} points/question` : ''}</p>
                {!teacher && test.published && <Link href={`/dashboard/student/tests/${test.id}`}><Button type="button" size="sm" className="mt-3">Take Test</Button></Link>}
              </div>
              {teacher && <div className="flex gap-1">
                <Button type="button" variant="outline" size="sm" onClick={() => onTogglePublish(test)} title={test.published ? 'Unpublish' : 'Publish'}>{test.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(test)}><Pencil className="mr-1 size-4" />Edit</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(test)}><Trash2 size={14} /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onToggleQuestions(test.id)}>{open[test.id] ? <ChevronUp /> : <ChevronDown />}</Button>
              </div>}
            </div>

            {teacher && open[test.id] && <div className="space-y-2 border-t p-4">
              {qs.length === 0 && <p className="text-sm text-muted-foreground">No questions yet. Open Test Maker to add them.</p>}
              {qs.map((question, index) => <div key={question.id} className="rounded border p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium">{index + 1}. {question.question}</p><p className="mt-1 text-xs font-medium text-primary">{questionTypeLabel(question.question_type)}</p>{question.question_type === 'multiple-choice' || !question.question_type ? <p className="mt-1 text-xs text-muted-foreground">A: {question.option_a} · B: {question.option_b} · C: {question.option_c} · D: {question.option_d}</p> : question.question_type === 'true-false' ? <p className="mt-1 text-xs text-muted-foreground">True / False</p> : question.question_type === 'fill-blank' ? <p className="mt-1 text-xs text-muted-foreground">Answer: {question.option_a}</p> : <p className="mt-1 text-xs text-muted-foreground">{question.option_a} → {question.option_b}</p>}<p className="mt-1 text-xs">{formatPoints(qs.length)} pts</p></div><div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" size="sm" onClick={() => onEditQuestion(question)}><Pencil className="size-3" /></Button><Button type="button" variant="ghost" size="sm" onClick={() => onDeleteQuestion(question)}><Trash2 className="size-3" /></Button></div></div></div>)}
              <Button type="button" variant="outline" size="sm" onClick={() => onEdit(test)}><Pencil className="mr-1 size-4" />Open Test Maker</Button>
            </div>}
          </div>
        );
      }) : <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">{teacher ? 'No tests yet. Click Test Maker to create one.' : 'No published tests yet.'}</p>}
    </section>
  );
}
