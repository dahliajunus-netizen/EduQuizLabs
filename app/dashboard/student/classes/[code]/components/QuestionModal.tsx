'use client';

import type React from 'react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, X } from 'lucide-react';

export type QuestionType = 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
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

// The database uses snake_case question type values while the UI uses
// kebab-case values. Keep the UI readable and translate only at the API edge.
const toDatabaseQuestionType: Record<QuestionType, string> = {
  'multiple-choice': 'multiple_choice',
  'true-false': 'true_false',
  'fill-blank': 'fill_blank',
  matching: 'matching',
};

const fromDatabaseQuestionType = (value: string): QuestionType => {
  const map: Record<string, QuestionType> = {
    'multiple-choice': 'multiple-choice',
    multiple_choice: 'multiple-choice',
    'true-false': 'true-false',
    true_false: 'true-false',
    'fill-blank': 'fill-blank',
    fill_blank: 'fill-blank',
    matching: 'matching',
  };
  return map[value] || 'multiple-choice';
};

export default function QuestionModal({ open, editing, form, setForm, onSubmit, onClose, busy = false, message = '' }: Props) {
  // Existing rows come back from Supabase using the database spelling.
  // Normalize them before the parent save/validation logic sees them.
  useEffect(() => {
    const normalized = fromDatabaseQuestionType(String(form.questionType));
    if (normalized !== form.questionType) {
      setForm(prev => ({ ...prev, questionType: normalized }));
    }
  }, [form.questionType, setForm]);

  // Compatibility layer for the existing test_questions CHECK constraint.
  // The rest of the builder can continue using the UI-friendly names.
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const isQuestionRequest = requestUrl.includes('/rest/v1/test_questions');

      if (!isQuestionRequest || !init?.body || typeof init.body !== 'string') {
        return originalFetch(input, init);
      }

      try {
        const parsed = JSON.parse(init.body) as Record<string, unknown>;
        if (typeof parsed.question_type === 'string') {
          const uiType = fromDatabaseQuestionType(parsed.question_type);
          parsed.question_type = toDatabaseQuestionType[uiType];
        }
        return originalFetch(input, { ...init, body: JSON.stringify(parsed) });
      } catch {
        return originalFetch(input, init);
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (!open) return null;

  const setType = (type: QuestionType) => {
    setForm(prev => {
      if (type === 'true-false') return { ...prev, questionType: type, optionA: 'True', optionB: 'False', optionC: '', optionD: '', correctAnswer: prev.correctAnswer === 'B' ? 'B' : 'A' };
      if (type === 'fill-blank') return { ...prev, questionType: type, optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A' };
      if (type === 'matching') return { ...prev, questionType: type, optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'B' };
      return { ...prev, questionType: type, optionA: prev.optionA === 'True' ? '' : prev.optionA, optionB: prev.optionB === 'False' ? '' : prev.optionB, correctAnswer: 'A' };
    });
  };

  const optionValue = (letter: 'A' | 'B' | 'C' | 'D') => form[`option${letter}` as keyof Pick<QuestionFormState, 'optionA' | 'optionB' | 'optionC' | 'optionD'>] as string;
  const setOption = (letter: 'A' | 'B' | 'C' | 'D', value: string) => setForm(prev => ({ ...prev, [`option${letter}`]: value }));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle>{editing ? 'Edit Question' : 'Add Question'}</CardTitle><Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}><X /></Button></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><label className="text-sm font-medium">Question type</label><select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={fromDatabaseQuestionType(String(form.questionType))} onChange={e => setType(e.target.value as QuestionType)} disabled={busy}><option value="multiple-choice">Multiple Choice</option><option value="true-false">True / False</option><option value="fill-blank">Fill in the Blank</option><option value="matching">Matching</option></select></div>
            <div><label className="text-sm font-medium">Question text</label><textarea className="mt-1 w-full rounded border bg-background p-2" rows={3} value={form.questionText} onChange={e => setForm(prev => ({ ...prev, questionText: e.target.value }))} required disabled={busy} /></div>
            {form.questionType === 'multiple-choice' && <div className="grid gap-3 md:grid-cols-2">{(['A','B','C','D'] as const).map(letter => <div key={letter}><label className="text-sm font-medium">{letter}</label><Input value={optionValue(letter)} onChange={e => setOption(letter, e.target.value)} required disabled={busy} /></div>)}</div>}
            {form.questionType === 'true-false' && <div className="grid gap-3 md:grid-cols-2"><div><label className="text-sm font-medium">True</label><Input value="True" disabled /></div><div><label className="text-sm font-medium">False</label><Input value="False" disabled /></div></div>}
            {form.questionType === 'fill-blank' && <div><label className="text-sm font-medium">Correct Answer</label><Input value={form.optionA} onChange={e => setForm(prev => ({ ...prev, optionA: e.target.value }))} placeholder="Answer students must type" required disabled={busy} /></div>}
            {form.questionType === 'matching' && <div className="grid gap-3 md:grid-cols-2"><div><label className="text-sm font-medium">Item</label><Input value={form.optionA} onChange={e => setForm(prev => ({ ...prev, optionA: e.target.value }))} placeholder="Example: France" required disabled={busy} /></div><div><label className="text-sm font-medium">Matching Answer</label><Input value={form.optionB} onChange={e => setForm(prev => ({ ...prev, optionB: e.target.value }))} placeholder="Example: Paris" required disabled={busy} /></div></div>}
            {(form.questionType === 'multiple-choice' || form.questionType === 'true-false') && <div><label className="text-sm font-medium">Correct Answer</label><select className="mt-1 h-10 w-full rounded border bg-background px-3" value={form.correctAnswer} onChange={e => setForm(prev => ({ ...prev, correctAnswer: e.target.value as CorrectAnswer }))} disabled={busy}><option value="A">{form.questionType === 'true-false' ? 'True' : 'A'}</option><option value="B">{form.questionType === 'true-false' ? 'False' : 'B'}</option>{form.questionType === 'multiple-choice' && <><option value="C">C</option><option value="D">D</option></>}</select></div>}
            <div className="rounded border bg-muted/30 p-3 text-sm text-muted-foreground">No points are entered manually. The test is always worth 100 points total and points are recalculated automatically.</div>
            {message && <p className="text-sm text-destructive">{message}</p>}
            <div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" className="w-1/2" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : editing ? 'Save Changes' : 'Add Question'}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
