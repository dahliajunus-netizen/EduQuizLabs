'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

type QuestionType = 'multiple-choice' | 'true-false';

export type QuestionDraft = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  questionType: QuestionType;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
};

type Props = {
  draft: QuestionDraft;
  setDraft: React.Dispatch<React.SetStateAction<QuestionDraft>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  busy?: boolean;
  message?: string;
};

export default function QuestionEditor({ draft, setDraft, onSubmit, onCancel, busy, message }: Props) {
  const isTrueFalse = draft.questionType === 'true-false';

  function setType(type: QuestionType) {
    if (type === 'true-false') {
      setDraft(prev => ({ ...prev, questionType: type, optionA: 'True', optionB: 'False', optionC: '', optionD: '', correctAnswer: 'A' }));
    } else {
      setDraft(prev => ({ ...prev, questionType: type, optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A' }));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Question Type</label>
        <select
          value={draft.questionType}
          onChange={e => setType(e.target.value as QuestionType)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="multiple-choice">Multiple Choice</option>
          <option value="true-false">True / False</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Question text</label>
        <Input value={draft.question} onChange={e => setDraft(prev => ({ ...prev, question: e.target.value }))} placeholder="Question text" required autoFocus />
      </div>

      {isTrueFalse ? (
        <div>
          <label className="mb-2 block text-sm font-medium">Correct answer</label>
          <select
            value={draft.correctAnswer === 'B' ? 'B' : 'A'}
            onChange={e => setDraft(prev => ({ ...prev, correctAnswer: e.target.value as 'A' | 'B' }))}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="A">True</option>
            <option value="B">False</option>
          </select>
          <p className="mt-2 text-xs text-muted-foreground">Students will automatically see only True and False.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={draft.optionA} onChange={e => setDraft(prev => ({ ...prev, optionA: e.target.value }))} placeholder="A" required />
            <Input value={draft.optionB} onChange={e => setDraft(prev => ({ ...prev, optionB: e.target.value }))} placeholder="B" required />
            <Input value={draft.optionC} onChange={e => setDraft(prev => ({ ...prev, optionC: e.target.value }))} placeholder="C" required />
            <Input value={draft.optionD} onChange={e => setDraft(prev => ({ ...prev, optionD: e.target.value }))} placeholder="D" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Correct answer</label>
            <select value={draft.correctAnswer} onChange={e => setDraft(prev => ({ ...prev, correctAnswer: e.target.value as QuestionDraft['correctAnswer'] }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
            </select>
          </div>
        </>
      )}

      {message && <p className="text-sm text-destructive">{message}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : 'Save Question'}</Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  );
}
