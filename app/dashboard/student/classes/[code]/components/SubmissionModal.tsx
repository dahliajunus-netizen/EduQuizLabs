'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

type Props = {
  name: string;
  className: string;
  setClassName: (value: string) => void;
  link: string;
  setLink: (value: string) => void;
  busy?: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export default function SubmissionModal({ name, className, setClassName, link, setLink, busy, onSubmit, onCancel }: Props) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Submit Assignment</CardTitle></CardHeader><CardContent><form onSubmit={onSubmit} className="space-y-3"><Input value={name} disabled /><Input placeholder="Class e.g. 8A" value={className} onChange={e => setClassName(e.target.value)} required /><Input type="url" placeholder="Submission link" value={link} onChange={e => setLink(e.target.value)} required /><div className="flex gap-2"><Button type="button" variant="outline" className="w-1/2" onClick={onCancel} disabled={busy}>Cancel</Button><Button type="submit" className="w-1/2" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : 'Submit'}</Button></div></form></CardContent></Card></div>;
}
