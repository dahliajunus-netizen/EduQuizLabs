'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Pencil, PlusCircle, Save, Trash2, X } from 'lucide-react';

export type BuilderQuestion = {
  id?: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  points: number;
};

type Props = {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  questions: BuilderQuestion[];
  busy?: boolean;
  message?: string;
  onSaveDetails: () => void;
  onAddQuestion: () => void;
  onEditQuestion: (question: BuilderQuestion) => void;
  onDeleteQuestion: (question: BuilderQuestion) => void;
  onClose: () => void;
  pointsFor: (count: number) => number;
};

export default function TestMaker({
  title, setTitle, description, setDescription, dueDate, setDueDate,
  questions, busy, message, onSaveDetails, onAddQuestion,
  onEditQuestion, onDeleteQuestion, onClose, pointsFor,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
      <div className="mx-auto my-6 w-full max-w-4xl">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Test Maker</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Build the entire test here.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}><X /></Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><label className="text-sm font-medium">Test title</label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Test title" /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Due date</label><Input value={dueDate} onChange={e => setDueDate(e.target.value)} placeholder="DD/MM/YYYY" /></div>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Description</label><textarea className="w-full rounded border bg-background p-2" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the test" /></div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
              <div><b>{questions.length} questions</b><p className="text-xs text-muted-foreground">100 points total · {questions.length ? `${pointsFor(questions.length)} points per question` : 'add questions to calculate points'}</p></div>
              <Button type="button" onClick={onSaveDetails} disabled={busy}><Save className="mr-2 size-4" />Save Test Details</Button>
            </div>
            {message && <p className="text-sm text-destructive">{message}</p>}
            <div className="space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Questions</h3><Button type="button" onClick={onAddQuestion} disabled={busy}><PlusCircle className="mr-2 size-4" />Add Question</Button></div>
              {questions.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No questions yet. Add your first question.</div>}
              {questions.map((question, index) => {
                const trueFalse = question.option_a === 'True' && question.option_b === 'False' && !question.option_c && !question.option_d;
                return <div key={question.id ?? index} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-medium">{index + 1}. {question.question}</p>{trueFalse ? <p className="mt-2 text-sm">True · False</p> : <div className="mt-2 grid gap-1 text-sm md:grid-cols-2"><span>A. {question.option_a}</span><span>B. {question.option_b}</span><span>C. {question.option_c}</span><span>D. {question.option_d}</span></div>}<p className="mt-2 text-xs text-muted-foreground">Correct answer: <b>{trueFalse ? (question.correct_answer === 'A' ? 'True' : 'False') : question.correct_answer}</b> · {pointsFor(questions.length)} points</p></div><div className="flex shrink-0 gap-1"><Button type="button" variant="outline" size="sm" onClick={() => onEditQuestion(question)}><Pencil className="mr-1 size-3" />Edit</Button><Button type="button" variant="ghost" size="sm" onClick={() => onDeleteQuestion(question)}><Trash2 className="size-3" /></Button></div></div></div>;
              })}
            </div>
            <div className="flex justify-end"><Button type="button" variant="outline" onClick={onClose}>{busy ? <Loader2 className="size-4 animate-spin" /> : 'Done — Return to Tests'}</Button></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
