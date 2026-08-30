'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, CheckCircle2, ClipboardList } from 'lucide-react';

type Test = { id: string; class_code: string; title: string; description: string | null; published: boolean; created_at: string };
type Submission = { id: string; test_id: string; student_id: string; score: number };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const headers = { apikey: key, Authorization: `Bearer ${key}` };

function studentId() {
  try { const raw = localStorage.getItem('current_user'); if (!raw) return null; const u = JSON.parse(raw); return String(u.student_id ?? u.id ?? u.user_id ?? u.uid ?? '').trim() || null; } catch { return null; }
}

export default function StudentTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try {
    const id = studentId();
    if (!id) throw new Error('Student UUID not found. Please sign in again.');
    const cr = await fetch(`${url}/rest/v1/student_classes?student_id=eq.${encodeURIComponent(id)}&select=code`, { headers, cache:'no-store' });
    if (!cr.ok) throw new Error(await cr.text());
    const classes: { code: string }[] = await cr.json();
    const codes = [...new Set(classes.map(x => String(x.code || '').trim()).filter(Boolean))];
    if (!codes.length) { setTests([]); setSubmissions([]); return; }
    const filter = codes.map(x => `"${x.replace(/"/g, '\\"')}"`).join(',');
    const tr = await fetch(`${url}/rest/v1/tests?published=eq.true&class_code=in.(${filter})&select=*&order=created_at.desc`, { headers, cache:'no-store' });
    if (!tr.ok) throw new Error(await tr.text());
    setTests(await tr.json());
    const sr = await fetch(`${url}/rest/v1/test_submissions?student_id=eq.${encodeURIComponent(id)}&select=id,test_id,student_id,score`, { headers, cache:'no-store' });
    if (sr.ok) setSubmissions(await sr.json());
  } catch(e) { console.error(e); alert(e instanceof Error ? e.message : 'Failed to load tests.'); } finally { setLoading(false); } })(); }, []);
  return <div className="min-h-screen bg-background"><Navbar/><main className="container mx-auto space-y-6 px-6 py-8"><Link href="/dashboard/student"><Button variant="ghost" className="gap-2"><ArrowLeft className="size-4"/>Back to Dashboard</Button></Link><div><h1 className="text-3xl font-bold">🧪 Tests</h1><p className="text-muted-foreground">Published tests from your classes.</p></div>{loading ? <Loader2 className="mx-auto size-8 animate-spin"/> : tests.map(t => { const s=submissions.find(x=>x.test_id===t.id); return <Card key={t.id}><CardHeader><CardTitle>{t.title}</CardTitle><p className="text-sm text-muted-foreground">Class: {t.class_code}</p></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">{t.description || 'No description.'}</p>{s ? <div className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary"/><span>Submitted · Score: <b>{Math.min(100, Number(s.score) || 0)}</b>/100</span></div> : <Link href={`/dashboard/student/tests/${encodeURIComponent(t.id)}?class_code=${encodeURIComponent(t.class_code)}`}><Button><ClipboardList className="mr-2 size-4"/>Take Test</Button></Link>}</CardContent></Card>; })}{!loading && !tests.length && <Card><CardContent className="py-10 text-center text-muted-foreground">No published tests from your classes yet.</CardContent></Card>}</main></div>;
}
