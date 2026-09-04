'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, CheckCircle2, ClipboardList, RefreshCw } from 'lucide-react';

type Test = { id: string; class_code: string; title: string; description: string | null; published: boolean; created_at: string; due_date?: string | null };
type Submission = { id: string; test_id: string; student_id: string; score: number };

function token() {
  if (typeof window === 'undefined') return '';
  for (const name of ['supabase_access_token', 'access_token']) {
    const value = localStorage.getItem(name);
    if (value) return value;
  }
  for (const name of ['supabase.auth.token', 'supabase_session']) {
    try {
      const parsed = JSON.parse(localStorage.getItem(name) || '');
      if (parsed?.access_token) return parsed.access_token;
      if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
    } catch {}
  }
  return '';
}

function headers() {
  return { Authorization: `Bearer ${token()}`, Accept: 'application/json' };
}

export default function StudentTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/student/tests', { headers: headers(), cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Could not load your tests.');
      setTests(Array.isArray(data.tests) ? data.tests : []);
      setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <div className="min-h-screen bg-background"><Navbar/><main className="container mx-auto space-y-6 px-6 py-8"><Link href="/dashboard/student"><Button variant="ghost" className="gap-2"><ArrowLeft className="size-4"/>Back to Dashboard</Button></Link><div><h1 className="text-3xl font-bold">🧪 Tests</h1><p className="text-muted-foreground">Published tests from your classes.</p></div>{error&&<Card className="border-destructive/30 bg-destructive/5"><CardContent className="flex flex-wrap items-center justify-between gap-4 py-4"><p className="text-sm font-medium text-destructive">{error}</p><Button variant="outline" size="sm" onClick={()=>void load()}><RefreshCw className="mr-2 size-4"/>Try again</Button></CardContent></Card>}{loading?<div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground"/></div>:tests.map(t=>{const s=submissions.find(x=>x.test_id===t.id);return <Card key={t.id}><CardHeader><CardTitle>{t.title}</CardTitle><p className="text-sm text-muted-foreground">Class: {t.class_code}</p></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">{t.description||'No description.'}</p>{s?<div className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary"/><span>Submitted · Score: <b>{Math.min(100,Number(s.score)||0)}</b>/100</span></div>:<Link href={`/dashboard/student/tests/${encodeURIComponent(t.id)}?class_code=${encodeURIComponent(t.class_code)}`}><Button><ClipboardList className="mr-2 size-4"/>Take Test</Button></Link>}</CardContent></Card>})}{!loading&&!error&&!tests.length&&<Card><CardContent className="py-10 text-center text-muted-foreground">No published tests from your classes yet.</CardContent></Card>}</main></div>;
}
