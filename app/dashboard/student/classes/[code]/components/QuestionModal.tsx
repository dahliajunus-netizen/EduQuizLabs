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
  'fill-blank': 'fill_blank',
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
  canvas.width = width; canvas.height = height;
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

  useEffect(() => {
    if (!open || form.questionType !== 'matching') return;
    setPairs(readPairs(form.optionA));
  }, [open, form.questionType]);

  useEffect(() => {
    if (!open) return;
    setImageError(false); setImageMessage('');
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
      if (!requestUrl.includes('/rest/v1/test_questions') || !init?.body || typeof init.body !== 'string') return originalFetch(input, init);
      try {
        const parsed = JSON.parse(init.body) as Record<string, unknown>;
        if (typeof parsed.question_type === 'string') parsed.question_type = toDatabaseQuestionType[fromDatabaseQuestionType(parsed.question_type)];
        return originalFetch(input, { ...init, body: JSON.stringify(parsed) });
      } catch { return originalFetch(input, init); }
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
  const addPair = () => setPairs(prev => { const next = [...prev, { left: '', right: '' }]; setForm(current => ({ ...current, optionA: JSON.stringify(next), optionB: JSON.stringify(next.map(p => p.right.trim()).filter(Boolean)) })); return next; });
  const removePair = (index: number) => setPairs(prev => { const next = prev.filter((_, i) => i !== index); const safe = next.length ? next : [{ left: '', right: '' }]; setForm(current => ({ ...current, optionA: JSON.stringify(safe), optionB: JSON.stringify(safe.map(p => p.right.trim()).filter(Boolean)) })); return safe; });
  const setCorrect = (answer: CorrectAnswer) => setForm(prev => ({ ...prev, correctAnswer: answer }));

  const handleImageUrlChange = (value: string) => {
    setImageUrl(value); setImageDataUrl(''); setImageError(false); setImageMessage('');
    setForm(prev => ({ ...prev, imageUrl: value.trim() }));
    if (typeof window !== 'undefined') { window.sessionStorage.removeItem('eduquiz_question_image_file'); if (value.trim()) window.sessionStorage.setItem('eduquiz_question_image_url', value.trim()); else window.sessionStorage.removeItem('eduquiz_question_image_url'); }
  };

  const handleImageFile = async (file?: File) => {
    if (!file) return;
    setImageBusy(true); setImageMessage(''); setImageError(false);
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl); setImageUrl(''); setForm(prev => ({ ...prev, imageUrl: dataUrl }));
      if (typeof window !== 'undefined') { window.sessionStorage.setItem('eduquiz_question_image_file', dataUrl); window.sessionStorage.removeItem('eduquiz_question_image_url'); }
    } catch (e) {
      setImageDataUrl(''); setForm(prev => ({ ...prev, imageUrl: '' })); setImageMessage(e instanceof Error ? e.message : 'Could not use that image.');
      if (typeof window !== 'undefined') window.sessionStorage.removeItem('eduquiz_question_image_file');
    } finally { setImageBusy(false); }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const image = imageDataUrl || imageUrl.trim() || String(form.imageUrl || '').trim();
    setForm(prev => ({ ...prev, imageUrl: image }));
    if (typeof window !== 'undefined') { if (image.startsWith('data:')) window.sessionStorage.setItem('eduquiz_question_image_file', image); else if (image) window.sessionStorage.setItem('eduquiz_question_image_url', image); }
    onSubmit(e);
  };

  const close = () => {
    if (typeof window !== 'undefined') { window.sessionStorage.removeItem('eduquiz_question_image_url'); window.sessionStorage.removeItem('eduquiz_question_image_file'); }
    setImageUrl(''); setImageDataUrl(''); setForm(prev => ({ ...prev, imageUrl: '' })); onClose();
  };

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"><div className="mx-auto my-6 w-full max-w-3xl"><Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{editing ? 'Edit Question' : 'Add Question'}</CardTitle><Button type="button" variant="ghost" size="icon" onClick={close}><X className="size-4"/></Button></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-5">
    <div><label className="mb-2 block text-sm font-medium">Question type</label><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{(['multiple-choice','true-false','fill-blank','matching'] as QuestionType[]).map(type=><Button key={type} type="button" variant={form.questionType===type?'default':'outline'} onClick={()=>setType(type)}>{type==='multiple-choice'?'Multiple Choice':type==='true-false'?'True / False':type==='fill-blank'?'Fill in the Blank':'Matching'}</Button>)}</div></div>
    <div><label className="mb-2 block text-sm font-medium">Question</label><textarea className="min-h-28 w-full rounded border bg-background p-3" value={form.questionText} onChange={e=>setForm(prev=>({...prev,questionText:e.target.value}))} placeholder="Write the question..." required/></div>
    <div className="rounded-lg border p-4"><div className="mb-3 flex items-center gap-2"><ImageIcon className="size-4"/><span className="font-medium">Question image</span></div><Input value={imageUrl} onChange={e=>handleImageUrlChange(e.target.value)} placeholder="Paste image URL (optional)"/><div className="mt-2 flex items-center gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"><Upload className="size-4"/>Upload image<input type="file" accept="image/*" className="hidden" onChange={e=>void handleImageFile(e.target.files?.[0])}/></label>{imageBusy&&<Loader2 className="size-4 animate-spin"/>}{imageDataUrl&&<FileImage className="size-4 text-green-600"/>}</div>{imageMessage&&<p className="mt-2 text-sm text-destructive">{imageMessage}</p>}{(imageDataUrl||imageUrl)&&<img src={imageDataUrl||imageUrl} alt="Question preview" className="mt-3 max-h-64 max-w-full rounded border object-contain" onError={()=>setImageError(true)}/>} {imageError&&<p className="mt-2 text-sm text-destructive">Image could not be loaded.</p>}</div>
    {form.questionType==='multiple-choice'&&<>
      <div className="grid gap-3 md:grid-cols-2">{(['A','B','C','D'] as const).map(letter=><div key={letter}><label className="mb-1 block text-sm font-medium">Option {letter}</label><Input value={form[`option${letter}`]} onChange={e=>setForm(prev=>({...prev,[`option${letter}`]:e.target.value}))} required placeholder={`Option ${letter}`}/></div>)}</div>
      <div className="rounded-lg border bg-muted/20 p-4">
        <label htmlFor="multiple-choice-correct-answer" className="mb-2 block text-sm font-medium">Correct answer</label>
        <select id="multiple-choice-correct-answer" value={form.correctAnswer} onChange={e=>setCorrect(e.target.value as CorrectAnswer)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
          <option value="A">A — Option A</option><option value="B">B — Option B</option><option value="C">C — Option C</option><option value="D">D — Option D</option>
        </select>
        <p className="mt-2 text-xs text-muted-foreground">Choose which of the four options is the correct answer.</p>
      </div>
    </>}
    {form.questionType==='true-false'&&<div><p className="mb-2 text-sm font-medium">Correct answer</p><div className="flex gap-2"><Button type="button" variant={form.correctAnswer==='A'?'default':'outline'} onClick={()=>setCorrect('A')}>True</Button><Button type="button" variant={form.correctAnswer==='B'?'default':'outline'} onClick={()=>setCorrect('B')}>False</Button></div></div>}
    {form.questionType==='fill-blank'&&<div><label className="mb-2 block text-sm font-medium">Correct answer</label><Input value={form.optionA} onChange={e=>setForm(prev=>({...prev,optionA:e.target.value.toLowerCase(),correctAnswer:'A'}))} placeholder="The answer students should enter" required className="lowercase"/><p className="mt-2 text-xs text-muted-foreground">Lowercase only. Uppercase letters are automatically converted.</p></div>}
    {form.questionType==='matching'&&<div className="space-y-3"><p className="text-sm font-medium">Matching pairs</p>{pairs.map((pair,index)=><div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><Input value={pair.left} onChange={e=>updatePair(index,'left',e.target.value)} placeholder={`Left ${index+1}`}/><Input value={pair.right} onChange={e=>updatePair(index,'right',e.target.value)} placeholder={`Match ${index+1}`}/><Button type="button" variant="ghost" size="icon" onClick={()=>removePair(index)}><Trash2 className="size-4"/></Button></div>)}<Button type="button" variant="outline" onClick={addPair}><Plus className="mr-2 size-4"/>Add pair</Button></div>}
    {message&&<p className="text-sm text-destructive">{message}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={busy||imageBusy}>{busy?<Loader2 className="size-4 animate-spin"/>:'Save Question'}</Button></div>
  </form></CardContent></Card></div></div>;
}