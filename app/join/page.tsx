'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function PublicJoinLiveQuiz() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  function join() {
    const c = code.trim().toUpperCase();
    const n = nickname.trim();
    setError('');
    if (c.length !== 6) return setError('Enter the 6-character game code.');
    if (!n) return setError('Enter a nickname.');
    if (n.length > 15) return setError('Nicknames can be at most 15 characters.');
    router.push(`/dashboard/student/live-quiz/${encodeURIComponent(c)}?name=${encodeURIComponent(n)}`);
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
          <p className="text-muted-foreground">No account needed. Enter the code from your teacher.</p>
        </CardHeader>
        <CardContent className="space-y-4 p-7 pt-0">
          <Input value={code} maxLength={6} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="GAME CODE" className="h-12 rounded-xl text-center text-lg font-black tracking-[0.25em]" />
          <div className="space-y-1">
            <Input value={nickname} maxLength={15} onChange={e => { setNickname(e.target.value.slice(0, 15)); setError(''); }} placeholder="Nickname" className="h-12 rounded-xl" />
            <div className="flex justify-end px-1 text-xs text-muted-foreground">{nickname.length}/15</div>
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button size="lg" className="h-12 w-full rounded-xl font-black" onClick={join}>Join Quiz <Zap className="ml-2 size-5" /></Button>
        </CardContent>
      </Card>
    </main>
  );
}
