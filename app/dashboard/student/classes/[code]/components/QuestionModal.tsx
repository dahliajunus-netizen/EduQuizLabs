'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, X, Image as ImageIcon } from 'lucide-react';

export type QuestionType = 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
type CorrectAnswer = 'A' | 'B' | 'C' | 'D';
type MatchPair = { left: string; right: string };

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

const toDatabaseQuestionType: Record<QuestionType, string> = {
  'multiple-choice': 'multiple_choice',
  'true-false': 'true_false',
  'fill-blank': 'fill_blank',
  matching: 'matching',
};

const fromDatabaseQuestionType = (value: string): QuestionType => ({
  'multiple-choice': 'multiple-choice', multiple_choice: 'multiple-choice',
  'true-false': 'true-false', true_false: 'true-false',
  'fill-blank': 'fill-blank', fill_blank: 'fill-blank',
  matching: 'matching',
}[value] || 'multiple-choice');

function readPairs(value: string): MatchPair[] {
  if (!value.trim()) return [{ left: '', right: '' }];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const pairs = parsed.map((p: any) => ({ left: String(p?.left ?? ''), right: String(p?.right ?? '') })).filter((p: MatchPair) => p.left || p.right);
      return pairs.length ? pairs : [{ left: '', right: '' }];
    }
  } catch {}
  return [{ left: value, right: '' }];
}

const clearStoredImage = () => {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem('eduquiz_question_image_url');
};

export default function QuestionModal({ open, editing, form, setForm, onSubmit, onClose, busy = false, message = '' }: Props) {
  const [pairs, setPairs] = useState<MatchPair[]>([{ left: '', right: '' }]);
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!open || form.questionType !== 'matching') return;
    setPairs(readPairs(form.optionA));
  }, [open, form.questionType]);

  useEffect(() => {
    if (!open) return;
    setImageError(false);
    const saved = typeof window !== 'undefined' ? window.sessionStorage.getItem('eduquiz_question_image_url') : '';
    setImageUrl(saved || '');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const normalized = fromDatabaseQuestionType(String(form.questionType));
    if (normalized !== form.questionType) setForm(prev => ({ ...prev, questionType: normalized }));
  }, [open, form.questionType, setForm]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (!requestUrl.includes('/rest/v1/test_questions') || !init?.body || typeof init.body !== 'string') return originalFetch(input, init);
      try {
        const parsed = JSON.parse(init.body) as Record<string, unknown>;
        if (typeof parsed.question_type === 'string') parsed.question_type = toDatabaseQuestionType[fromDatabaseQuestionType(parsed.question_type)];
        const storedImage = typeof window !== 'undefined' ? window.sessionStorage.getItem('eduquiz_question_image_url') || '' : '';
        if (storedImage.trim()) parsed.image_url = storedImage.trim();
        return originalFetch(input, { ...init, body: JSON.stringify(parsed) });
      } catch { return originalFetch(input, init); }
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  const matchingAnswers = useMemo(() => pairs.map(p => p.right.trim()).filter(Boolean), [pairs]);
  if (!open) return null;

  const setType = (type: QuestionType) => {
    setForm(prev => {
      if (type === 'true-false') return { ...prev, questionType: type, optionA: 'True', optionB: 'False', optionC: '', optionD: '', correctAnswer: 'A' };
      if (type === 'fill-blank') return { ...prev, questionType: type, optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A' };
      if (type === 'matching') {
        const nextPairs = [{ left: '', right: '' }]; setPairs(nextPairs);
        return { ...prev, questionType: type, optionA: JSON.stringify(nextPairs), optionB: JSON.stringify([]), optionC: '', optionD: '', correctAnswer: 'A' };
      }
      return { ...prev, questionType: type, optionA: prev.optionA === 'True' ? '' : prev.optionA, optionB: prev.optionB === 'False' ? '' : prev.optionB, correctAnswer: 'A' };
    });
  };

  const updatePair = (index: number, field: keyof MatchPair, value: string) => {
    setPairs(prev => {
      const next = prev.map((pair, i) => i === index ? { ...pair, [field]: value } : pair);
      setForm(current => ({ ...current, optionA: JSON.stringify(next), optionB: JSON.stringify(next.map(p => p.right.trim()).filter(Boolean)) }));
      return next;
    });
  };
  const addPair = () => setPairs(prev => { const next = [...prev, { left: '', right: '' }]; setForm(current => ({ ...current, optionA: JSON.stringify(next), optionB: JSON.stringify(next.map(p => p.right.trim()).filter(Boolean)) })); return next; });
  const removePair = (index: number) => setPairs(prev => { const next = prev.filter((_, i) => i !== index); const safe = next.length ? next : [{ left: '', right: '' }]; setForm(current => ({ ...current, optionA: JSON.stringify(safe), optionB: JSON.stringify(safe.map(p => p.right.trim()).filter(Boolean)) })); return safe; });
  const setCorrect = (answer: CorrectAnswer) => setForm(prev => ({ ...prev, correctAnswer: answer }));

  const handleImageUrlChange = (value: string) => {
    setImageUrl(value); setImageError(false);
    if (typeof window !== 'undefined') {
      if (value.trim()) window.sessionStorage.setItem('eduquiz_question_image_url', value.trim());
      else clearStoredImage();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (typeof window !== 'undefined') {
      if (imageUrl.trim()) window.sessionStorage.setItem('eduquiz_question_image_url', imageUrl.trim());
      else clearStoredImage();
    }
    onSubmit(e);
    window.setTimeout(clearStoredImage, 1000);
  };

  const close = () => { clearStoredImage(); setImageUrl(''); onClose(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between border-b">
          <div><CardTitle>{editing ? 'Edit Question' : 'Add Question'}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Choose a question type and build it below.</p></div>
          <Button type="button" variant="ghost" size="sm" onClick={close} disabled={busy}><X /></Button>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div><label className="text-sm font-semibold">Question type</label><div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">{([['multiple-choice','Multiple Choice'],['true-false','True / False'],['fill-blank','Fill in the Blank'],['matching','Matching']] as const).map(([value,label])=><button key={value} type="button" disabled={busy} onClick={()=>setType(value)} className={`rounded-lg border p-3 text-sm font-medium transition ${form.questionType===value?'border-primary bg-primary/10 text-primary':'hover:bg-accent'}`}>{label}</button>)}</div></div>
            <div><label className="text-sm font-semibold">Question</label><textarea className="mt-2 min-h-24 w-full rounded-lg border bg-background p-3 outline-none focus:ring-2 focus:ring-primary" placeholder="Write your question..." rows={3} value={form.questionText} onChange={e=>setForm(prev=>({...prev,questionText:e.target.value}))} required disabled={busy}/></div>

            <section className="rounded-xl border bg-muted/20 p-4"><div className="flex items-center gap-2"><ImageIcon className="size-5 text-primary"/><div><h3 className="font-semibold">Question image</h3><p className="text-xs text-muted-foreground">Optional — paste a direct image URL.</p></div></div><Input className="mt-3" type="url" value={imageUrl} onChange={e=>handleImageUrlChange(e.target.value)} placeholder="https://example.com/question-image.jpg" disabled={busy}/>{imageUrl.trim()&&!imageError&&<div className="mt-3 overflow-hidden rounded-lg border bg-background p-2"><img src={imageUrl.trim()} alt="Question preview" className="max-h-64 max-w-full rounded object-contain" onError={()=>setImageError(true)}/><p className="mt-2 text-xs text-muted-foreground">Preview</p></div>}{imageUrl.trim()&&imageError&&<p className="mt-2 text-sm text-destructive">That image could not be loaded. Check that the URL points directly to an image.</p>}</section>

            {form.questionType==='multiple-choice'&&<section className="rounded-xl border bg-muted/20 p-4"><h3 className="font-semibold">Answer choices</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{(['A','B','C','D'] as const).map(letter=><div key={letter}><label className="text-sm font-medium">Option {letter}</label><Input className="mt-1" value={form[`option${letter}` as 'optionA'|'optionB'|'optionC'|'optionD']} onChange={e=>setForm(prev=>({...prev,[`option${letter}`]:e.target.value}))} required disabled={busy}/></div>)}</div><div className="mt-4"><label className="text-sm font-semibold">Correct answer</label><select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={form.correctAnswer} onChange={e=>setCorrect(e.target.value as CorrectAnswer)} disabled={busy}>{(['A','B','C','D'] as const).map(x=><option key={x} value={x}>Option {x}</option>)}</select></div></section>}
            {form.questionType==='true-false'&&<section className="rounded-xl border bg-muted/20 p-4"><h3 className="font-semibold">Choose the correct answer</h3><div className="mt-3 grid grid-cols-2 gap-3">{(['A','B'] as const).map(value=>{const selected=form.correctAnswer===value;return <button key={value} type="button" disabled={busy} onClick={()=>setCorrect(value)} className={`rounded-xl border-2 p-5 text-lg font-semibold transition ${selected?'border-primary bg-primary/10 text-primary':'hover:bg-accent'}`}>{value==='A'?'✓ True':'✕ False'}</button>})}</div><p className="mt-2 text-xs text-muted-foreground">Students will see two clear True / False choices.</p></section>}
            {form.questionType==='fill-blank'&&<section className="rounded-xl border bg-muted/20 p-4"><h3 className="font-semibold">Correct answer</h3><p className="mt-1 text-sm text-muted-foreground">Students will type their answer into an input box.</p><Input className="mt-3 h-12 text-base" value={form.optionA} onChange={e=>setForm(prev=>({...prev,optionA:e.target.value}))} placeholder="Type the correct answer" required disabled={busy}/></section>}
            {form.questionType==='matching'&&<section className="rounded-xl border bg-muted/20 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">Matching pairs</h3><p className="mt-1 text-sm text-muted-foreground">Add as many pairs as you need. Each row is one match.</p></div><Button type="button" variant="outline" size="sm" onClick={addPair} disabled={busy}><Plus className="mr-1 size-4"/>Add Match</Button></div><div className="mt-4 space-y-3">{pairs.map((pair,index)=><div key={index} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 rounded-lg border bg-background p-3"><div><label className="text-xs font-medium text-muted-foreground">Item {index+1}</label><Input className="mt-1" value={pair.left} onChange={e=>updatePair(index,'left',e.target.value)} placeholder="e.g. France" required disabled={busy}/></div><span className="pt-5 text-muted-foreground">↔</span><div><label className="text-xs font-medium text-muted-foreground">Matches with</label><Input className="mt-1" value={pair.right} onChange={e=>updatePair(index,'right',e.target.value)} placeholder="e.g. Paris" required disabled={busy}/></div><Button type="button" variant="ghost" size="icon" className="mt-5" onClick={()=>removePair(index)} disabled={busy||pairs.length===1} title="Remove match"><Trash2 className="size-4"/></Button></div>)}</div>{matchingAnswers.length>0&&<p className="mt-3 text-xs text-muted-foreground">{matchingAnswers.length} match{matchingAnswers.length===1?'':'es'} added.</p>}</section>}
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">No points are entered manually. The test remains worth 100 points total and points are recalculated automatically.</div>
            {message&&<p className="text-sm text-destructive">{message}</p>}
            <div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={close} disabled={busy}>Cancel</Button><Button type="submit" className="w-1/2" disabled={busy}>{busy?<Loader2 className="size-4 animate-spin"/>:editing?'Save Changes':'Add Question'}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
