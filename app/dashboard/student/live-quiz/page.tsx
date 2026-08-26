'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function JoinLiveQuiz(){
  const router=useRouter();
  const [code,setCode]=useState('');
  const [nickname,setNickname]=useState('');
  const [error,setError]=useState('');

  function join(){
    const c=code.trim().toUpperCase();
    const n=nickname.trim();
    setError('');

    if(c.length!==6){
      setError('Enter the 6-character game code.');
      return;
    }
    if(!n){
      setError('Enter a nickname.');
      return;
    }
    if(n.length>15){
      setError('Nicknames can be at most 15 characters.');
      return;
    }

    // Nicknames are handled by the live-quiz player table when joining.
    // Do not call a separate moderation/Gemini endpoint here.
    router.push(`/dashboard/student/live-quiz/${encodeURIComponent(c)}?name=${encodeURIComponent(n)}`);
  }

  return <main className="flex min-h-screen items-center justify-center px-6"><Card className="w-full max-w-md"><CardHeader className="text-center"><CardTitle className="text-3xl">🟢 Join Live Quiz</CardTitle><p className="text-muted-foreground">Enter the code shown by your teacher.</p></CardHeader><CardContent className="space-y-4"><Input value={code} maxLength={6} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="GAME CODE"/><div className="space-y-1"><Input value={nickname} maxLength={15} onChange={e=>{setNickname(e.target.value.slice(0,15));setError('');}} placeholder="Nickname"/><div className="flex justify-between px-1 text-xs text-muted-foreground"><span>Nickname</span><span>{nickname.length}/15</span></div></div>{error&&<p className="text-sm text-destructive">{error}</p>}<Button className="w-full" onClick={join}>Join Quiz</Button></CardContent></Card></main>
}
