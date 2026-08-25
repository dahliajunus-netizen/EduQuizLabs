'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL!; const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
export default function JoinLiveQuiz(){const router=useRouter();const [code,setCode]=useState(''),[nickname,setNickname]=useState(''),[error,setError]=useState('');function join(){const c=code.trim().toUpperCase();const n=nickname.trim();if(c.length!==6){setError('Enter the 6-character game code.');return;}if(!n){setError('Enter a nickname.');return;}router.push(`/dashboard/student/live-quiz/${encodeURIComponent(c)}?name=${encodeURIComponent(n)}`);}return <main className="flex min-h-screen items-center justify-center px-6"><Card className="w-full max-w-md"><CardHeader className="text-center"><CardTitle className="text-3xl">🟢 Join Live Quiz</CardTitle><p className="text-muted-foreground">Enter the code shown by your teacher.</p></CardHeader><CardContent className="space-y-4"><Input value={code} maxLength={6} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="GAME CODE"/><Input value={nickname} maxLength={20} onChange={e=>setNickname(e.target.value)} placeholder="Nickname"/>{error&&<p className="text-sm text-destructive">{error}</p>}<Button className="w-full" onClick={join}>Join Quiz</Button></CardContent></Card></main>}
