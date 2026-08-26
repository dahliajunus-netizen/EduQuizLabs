'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, X, Image as ImageIcon, Upload, FileImage } from 'lucide-react';

export type QuestionType = 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
type CorrectAnswer = 'A' | 'B' | 'C' | 'D';
type MatchPair = { left: string; right: string };

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

export type QuestionFormState = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  questionType: QuestionType;
  correctAnswer: CorrectAnswer;
  imageUrl?: string;
};

const toDatabaseQuestionType: Record<QuestionType, string> = {
  'multiple-choice': 'multiple_choice',
  'true-false': 'true_false',
  'fill-blank': 'fill_in_blank',
  matching: 'matching',
};

const fromDatabaseQuestionType = (value: string): QuestionType => ({
  'multiple-choice': 'multiple-choice', multiple_choice: 'multiple-choice',
  'true-false': 'true-false', true_false: 'true-false',
  'fill-blank': 'fill-blank', fill_blank: 'fill-blank', fill_in_blank: 'fill-blank',
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

async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Images must be 8 MB or smaller.');

  const source = await new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('That image could not be read.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.readAsDataURL(file);
  });

  const maxSize = 1600;
  const scale = Math.min(1, maxSize / Math.max(source.naturalWidth || source.width, source.naturalHeight || source.height));
  const width = Math.max(1, Math.round((source.naturalWidth || source.width) * scale));
  const height = Math.max(1, Math.round((source.naturalHeight || source.height) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process this image.');
  ctx.drawImage(source, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.82);
}

export default function QuestionModal({ open, editing, form, setForm, onSubmit, onClose, busy = false, message = '' }: Props) {
  const [pairs, setPairs] = useState<MatchPair[]>([{ left: '', right: '' }]);
  const [imageUrl, setImageUrl] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [imageError, setImageError] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageMessage, setImageMessage] = useState('');
  const [draggingImage, setDraggingImage] = useState(false);

  useEffect(() => {
    if (!open || form.questionType !== 'matching') return;
    setPairs(readPairs(form.optionA));
  }, [open, form.questionType]);

  useEffect(() => {
    if (!open) return;
    setImageError(false);
    setImageMessage('');
    const formImage = typeof form.imageUrl === 'string' ? form.imageUrl : '';
    const savedUrl = typeof window !== 'undefined' ? window.sessionStorage.getItem('eduquiz_question_image_url') : '';
    const savedFile = typeof window !== 'undefined' ? window.sessionStorage.getItem('eduquiz_question_image_file') : '';
    const restored = formImage || savedUrl || savedFile || '';
    setImageUrl(restored.startsWith('data:') ? '' : restored);
    setImageDataUrl(restored.startsWith('data:') ? restored : '');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const normalized = fromDatabaseQuestionType(String(form.questionType));
    if (normalized !== form.questionType) setForm(prev => ({ ...prev, questionType: normalized }));
  }, [open, form.questionType, setForm]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const isQuestionRequest = requestUrl.includes('/rest/v1/test_questions');
      if (!isQuestionRequest || !init?.body || typeof init.body !== 'string') return originalFetch(input, init);
      try {
        const parsed = JSON.parse(init.body) as Record<string, unknown>;
        if (typeof parsed.question_type === 'string') parsed.question_type = toDatabaseQuestionType[fromDatabaseQuestionType(parsed.question_type)];
        return originalFetch(input, { ...init, body: JSON.stringify(parsed) });
      } catch {
        return originalFetch(input, init);
      }
    };
    return () => { window.fetch = originalFetch; };
  }, [open]);

  const matchingAnswers = useMemo(() => pairs.map(p => p.right.trim()).filter(Boolean), [pairs]);
  if (!open) return null;

  const setType = (type: QuestionType) => {
    setForm(prev => {
      if (type === 'true-false') return { ...prev, questionType: type, optionA: 'True', optionB: 'False', optionC: '', optionD: '', correctAnswer: 'A' };
      if (type === 'fill-blank') return { ...prev, questionType: type, optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A' };
      if (type === 'matching') {
        const nextPairs = [{ left: '', right: '' }];
        setPairs(nextPairs);
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

  const addPair = () => setPairs(prev => {
    const next = [...prev, { left: '', right: '' }];
    setForm(current => ({ ...current, optionA: JSON.stringify(next), optionB: JSON.stringify(next.map(p => p.right.trim()).filter(Boolean)) }));
    return next;
  });

  const removePair = (index: number) => setPairs(prev => {
    const next = prev.filter((_, i) => i !== index);
    const safe = next.length ? next : [{ left: '', right: '' }];
    setForm(current => ({ ...current, optionA: JSON.stringify(safe), optionB: JSON.stringify(safe.map(p => p.right.trim()).filter(Boolean)) }));
    return safe;
  });

  const setCorrect = (answer: CorrectAnswer) => setForm(prev => ({ ...prev, correctAnswer: answer }));

  const handleImageUrlChange = (value: string) => {
    setImageUrl(value);
    setImageDataUrl('');
    setImageError(false);
    setImageMessage('');
    setForm(prev => ({ ...prev, imageUrl: value.trim() }));
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('eduquiz_question_image_file');
      if (value.trim()) window.sessionStorage.setItem('eduquiz_question_image_url', value.trim());
      else window.sessionStorage.removeItem('eduquiz_question_image_url');
    }
  };

  const handleImageFile = async (file?: File) => {
    if (!file) return;
    setImageBusy(true);
    setImageMessage('');
    setImageError(false);
    try {
      const dataUrl = await fileToDataUrl(file);
      // The old implementation only kept the selected file in component state.
      // The parent never received it, so saving the question discarded the image.
      // Put the processed image directly into the shared form state so saveQuestion
      // persists it in test_questions.answer_data.image_url.
      setImageDataUrl(dataUrl);
      setImageUrl('');
      setForm(prev => ({ ...prev, imageUrl: dataUrl }));
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('eduquiz_question_image_file', dataUrl);
        window.sessionStorage.removeItem('eduquiz_question_image_url');
      }
    } catch (e) {
      setImageDataUrl('');
      setForm(prev => ({ ...prev, imageUrl: '' }));
      setImageMessage(e instanceof Error ? e.message : 'Could not use that image.');
      if (typeof window !== 'undefined') window.sessionStorage.removeItem('eduquiz_question_image_file');
    } finally {
      setImageBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const image = imageDataUrl || imageUrl.trim() || String(form.imageUrl || '').trim();
    setForm(prev => ({ ...prev, imageUrl: image }));
    if (typeof window !== 'undefined') {
      if (image.startsWith('data:')) window.sessionStorage.setItem('eduquiz_question_image_file', image);
      else if (image) window.sessionStorage.setItem('eduquiz_question_image_url', image);
    }
    onSubmit(e);
  };

  const close = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('eduquiz_question_image_url');
      window.sessionStorage.removeItem('eduquiz_question_image_file');
    }
    setImageUrl('');
    setImageDataUrl('');
    setForm(prev => ({ ...prev, imageUrl: '' }));
    onClose();
  };

  const displayedImage = imageDataUrl || imageUrl.trim() || String(form.imageUrl || '').trim();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between border-b">
          <div><CardTitle>{editing ? 'Edit Question' : 'Add Question'}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Choose a question type and build it below.</p></div>
          <Button type="button" variant="ghost" size="sm" onClick={close} disabled={busy}><X /></Button>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div><label className="text-sm font-semibold">Question type</label><div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">{([['multiple-choice','Multiple Choice'],['true-false','True / False'],['fill-blank','Fill in the Blank'],['matching','Matching']] as const).map(([value,label]) => <button key={value} type="button" disabled={busy} onClick={() => setType(value)} className={`rounded-lg border p-3 text-sm font-medium transition ${form.questionType === value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}>{label}</button>)}</div></div>
            <div><label className="text-sm font-semibold">Question</label><textarea className="mt-2 min-h-24 w-full rounded-lg border bg-background p-3 outline-none focus:ring-2 focus:ring-primary" placeholder="Write your question..." rows={3} value={form.questionText} onChange={e => setForm(prev => ({ ...prev, questionText: e.target.value }))} required disabled={busy}/></div>

            <section className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2"><ImageIcon className="size-5 text-primary"/><div><h3 className="font-semibold">Question image</h3><p className="text-xs text-muted-foreground">Optional — paste an image URL or drop an image file here.</p></div></div>
              <div className={`mt-3 rounded-xl border-2 border-dashed p-5 text-center transition ${draggingImage ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 bg-background hover:border-primary/50'}`} onDragOver={e => { e.preventDefault(); if (!busy && !imageBusy) setDraggingImage(true); }} onDragLeave={() => setDraggingImage(false)} onDrop={e => { e.preventDefault(); setDraggingImage(false); if (!busy && !imageBusy) void handleImageFile(e.dataTransfer.files?.[0]); }}>
                <input id="question-image-file" type="file" accept="image/*" className="hidden" disabled={busy || imageBusy} onChange={e => { void handleImageFile(e.target.files?.[0]); e.currentTarget.value = ''; }} />
                {imageBusy ? <><Loader2 className="mx-auto size-8 animate-spin text-primary"/><p className="mt-2 text-sm font-semibold">Processing image…</p></> : <><Upload className="mx-auto size-8 text-primary"/><p className="mt-2 text-sm font-semibold">Drag & drop an image here</p><p className="mt-1 text-xs text-muted-foreground">or</p><label htmlFor="question-image-file" className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"><FileImage className="size-4"/>Choose image file</label><p className="mt-2 text-[11px] text-muted-foreground">PNG, JPG, GIF, WebP • maximum 8 MB</p></>}
              </div>
              <div className="my-3 flex items-center gap-3"><div className="h-px flex-1 bg-border"/><span className="text-xs font-medium text-muted-foreground">OR IMAGE URL</span><div className="h-px flex-1 bg-border"/></div>
              <Input type="url" value={imageUrl} onChange={e => handleImageUrlChange(e.target.value)} placeholder="https://example.com/question-image.jpg" disabled={busy || imageBusy}/>
              {imageMessage && <p className="mt-2 text-sm text-destructive">{imageMessage}</p>}
              {displayedImage && !imageError && <div className="mt-3 overflow-hidden rounded-lg border bg-background p-2"><img src={displayedImage} alt="Question preview" className="max-h-64 max-w-full rounded object-contain" onError={() => setImageError(true)}/><p className="mt-2 text-xs text-muted-foreground">Preview</p></div>}
              {displayedImage && imageError && <p className="mt-2 text-sm text-destructive">That image could not be loaded. Check the file or URL and try again.</p>}
            </section>

            {form.questionType === 'multiple-choice' && <section className="space-y-3"><label className="text-sm font-semibold">Answer choices</label>{(['A','B','C','D'] as const).map(letter => <div key={letter} className="flex items-center gap-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold">{letter}</span><Input value={form[`option${letter}` as 'optionA'|'optionB'|'optionC'|'optionD']} onChange={e => setForm(prev => ({ ...prev, [`option${letter}`]: e.target.value }))} placeholder={`Option ${letter}`} required disabled={busy}/></div>)}</section>}
            {form.questionType === 'true-false' && <section className="space-y-3"><label className="text-sm font-semibold">Correct answer</label><div className="grid grid-cols-2 gap-3"><button type="button" className={`rounded-lg border p-3 ${form.correctAnswer === 'A' ? 'border-primary bg-primary/10 text-primary' : ''}`} onClick={() => setCorrect('A')}>True</button><button type="button" className={`rounded-lg border p-3 ${form.correctAnswer === 'B' ? 'border-primary bg-primary/10 text-primary' : ''}`} onClick={() => setCorrect('B')}>False</button></div></section>}
            {form.questionType === 'fill-blank' && <section className="space-y-2"><label className="text-sm font-semibold">Correct answer</label><Input value={form.optionA} onChange={e => setForm(prev => ({ ...prev, optionA: e.target.value }))} placeholder="Enter the correct answer" required disabled={busy}/></section>}
            {form.questionType === 'matching' && <section className="space-y-3"><div className="flex items-center justify-between"><label className="text-sm font-semibold">Matching pairs</label><Button type="button" variant="outline" size="sm" onClick={addPair}><Plus className="mr-1 size-4"/>Add pair</Button></div>{pairs.map((pair,index) => <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><Input value={pair.left} onChange={e => updatePair(index,'left',e.target.value)} placeholder="Left side"/><Input value={pair.right} onChange={e => updatePair(index,'right',e.target.value)} placeholder="Right side"/><Button type="button" variant="ghost" size="icon" onClick={() => removePair(index)}><Trash2 className="size-4"/></Button></div>)}</section>}

            {message && <p className="text-sm text-destructive">{message}</p>}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy || imageBusy}>{busy ? <Loader2 className="mr-2 size-4 animate-spin"/> : null}{editing ? 'Save Changes' : 'Add Question'}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
