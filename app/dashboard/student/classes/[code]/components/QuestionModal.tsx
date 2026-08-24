'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, X } from 'lucide-react';

type QuestionType = 'multiple-choice' | 'true-false';
type CorrectAnswer = 'A' | 'B' | 'C' | 'D';

export type QuestionFormState = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  questionType: QuestionType;
  correctAnswer: CorrectAnswer;
};

type Props = {
  open: boolean;
  editing: boolean;
  form: QuestionFormState;
  setForm: React.Dispatch<React.SetStateAction<QuestionFormState>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  busy?: boolean;
  message?: string;
};

export default function QuestionModal({
  open,
  editing,
  form,
  setForm,
  onSubmit,
  onClose,
  busy = false,
  message = '',
}: Props) {
  if (!open) return null;

  const isTrueFalse = form.questionType === 'true-false';

  const setType = (type: QuestionType) => {
    setForm(prev =>
      type === 'true-false'
        ? {
            ...prev,
            questionType: type,
            optionA: 'True',
            optionB: 'False',
            optionC: '',
            optionD: '',
            correctAnswer:
              prev.correctAnswer === 'B' ? 'B' : 'A',
          }
        : {
            ...prev,
            questionType: type,
            optionA: prev.optionA === 'True' ? '' : prev.optionA,
            optionB: prev.optionB === 'False' ? '' : prev.optionB,
            optionC: '',
            optionD: '',
            correctAnswer: 'A',
          }
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{editing ? 'Edit Question' : 'Add Question'}</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            <X />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Question type</label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.questionType}
                onChange={e => setType(e.target.value as QuestionType)}
                disabled={busy}
              >
                <option value="multiple-choice">Multiple Choice</option>
                <option value="true-false">True / False</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Question text</label>
              <textarea
                className="mt-1 w-full rounded border bg-background p-2"
                rows={3}
                value={form.questionText}
                onChange={e => setForm(prev => ({ ...prev, questionText: e.target.value }))}
                required
                disabled={busy}
              />
            </div>

            {isTrueFalse ? (
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="mb-3 text-sm font-medium">Answers</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded border bg-background p-3">True</div>
                  <div className="rounded border bg-background p-3">False</div>
                </div>
                <label className="mt-4 block text-sm font-medium">Correct answer</label>
                <select
                  className="mt-1 h-10 w-full rounded border bg-background px-3"
                  value={form.correctAnswer === 'B' ? 'B' : 'A'}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      correctAnswer: e.target.value as 'A' | 'B',
                      optionA: 'True',
                      optionB: 'False',
                      optionC: '',
                      optionD: '',
                    }))
                  }
                  disabled={busy}
                >
                  <option value="A">True</option>
                  <option value="B">False</option>
                </select>
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">A</label>
                    <Input value={form.optionA} onChange={e => setForm(prev => ({ ...prev, optionA: e.target.value }))} required disabled={busy} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">B</label>
                    <Input value={form.optionB} onChange={e => setForm(prev => ({ ...prev, optionB: e.target.value }))} required disabled={busy} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">C</label>
                    <Input value={form.optionC} onChange={e => setForm(prev => ({ ...prev, optionC: e.target.value }))} required disabled={busy} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">D</label>
                    <Input value={form.optionD} onChange={e => setForm(prev => ({ ...prev, optionD: e.target.value }))} required disabled={busy} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Correct answer</label>
                  <select
                    className="mt-1 h-10 w-full rounded border bg-background px-3"
                    value={form.correctAnswer}
                    onChange={e => setForm(prev => ({ ...prev, correctAnswer: e.target.value as CorrectAnswer }))}
                    disabled={busy}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </>
            )}

            <div className="rounded border bg-muted/30 p-3 text-sm text-muted-foreground">
              This test is always worth 100 points total. Points are automatically calculated as 100 ÷ number of questions.
            </div>

            {message && <p className="text-sm text-destructive">{message}</p>}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="w-1/2" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button type="submit" className="w-1/2" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : editing ? 'Save Changes' : 'Add Question'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
