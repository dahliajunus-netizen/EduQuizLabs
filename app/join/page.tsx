'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function PublicJoinLiveQuiz() {
  const router = useRouter();
  const nicknameRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);
  const [returnSource, setReturnSource] = useState<'dashboard' | 'signup' | 'signin' | ''>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scannedCode = (params.get('code') || '').trim().toUpperCase();
    const explicitSource = params.get('from');
    const referrer = document.referrer;
    const source = explicitSource === 'dashboard' || explicitSource === 'signup' || explicitSource === 'signin'
      ? explicitSource
      : referrer.includes('/dashboard/student')
        ? 'dashboard'
        : referrer.includes('/sign-up')
          ? 'signup'
          : referrer === window.location.origin || referrer.includes(`${window.location.origin}/`)
            ? 'signin'
            : '';

    setReturnSource(source);
    if (scannedCode) {
      setCode(scannedCode.slice(0, 6));
      setScanned(true);
      window.setTimeout(() => nicknameRef.current?.focus(), 50);
    }
  }, []);

  function join() {
    const c = code.trim().toUpperCase();
    const n = nickname.trim();
    setError('');
    if (c.length !== 6) return setError('Enter the 6-character game code.');
    if (!n) return setError('Enter a nickname.');
    if (n.length > 15) return setError('Nicknames can be at most 15 characters.');
    const source = returnSource ? `&from=${encodeURIComponent(returnSource)}` : '';
    router.push(`/dashboard/student/live-quiz/${encodeURIComponent(c)}?name=${encodeURIComponent(n)}${source}`);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.18),transparent_55%)]" />
      <Card className="relative w-full max-w-md rounded-[2rem] border-0 shadow-2xl">
        <CardHeader className="p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Zap className="size-8" />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.3em] text-primary">EduQuizLabs Live</p>
          <CardTitle className="mt-2 text-3xl font-black">Join a Live Quiz</CardTitle>
          <p className="text-muted-foreground">{scanned ? 'You’re almost in. Just choose a nickname.' : 'Enter the code from your teacher to join.'}</p>
        </CardHeader>
        <CardContent className="space-y-4 p-7 pt-0">
          {scanned ? (
            <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Game code</p>
                <p className="font-mono text-xl font-black tracking-[0.18em]">{code}</p>
              </div>
              <Check className="size-5 text-primary" />
            </div>
          ) : (
            <Input
              value={code}
              maxLength={6}
              autoComplete="off"
              onChange={e => {
                setCode(e.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase());
                setError('');
              }}
              placeholder="GAME CODE"
              className="h-12 rounded-xl text-center text-lg font-black font-mono tracking-[0.18em] pl-0 pr-0"
            />
          )}
          <div className="space-y-1">
            <Input ref={nicknameRef} value={nickname} maxLength={15} onChange={e => { setNickname(e.target.value.slice(0, 15)); setError(''); }} onKeyDown={e => { if (e.key === 'Enter') join(); }} placeholder="Nickname" className="h-12 rounded-xl" />
            <div className="flex justify-end px-1 text-xs text-muted-foreground">{nickname.length}/15</div>
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button size="lg" className="h-12 w-full rounded-xl font-black" onClick={join}>Join Quiz <Zap className="ml-2 size-5" /></Button>
          <Link href="/" className="flex h-10 items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to Sign In
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
