'use client';

import type React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Award, X, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const creditsList = ['Aidan Rayka Dewabrata - SMP Labschool Cibubur','Atha Badzikh Dodi Elang Permana - SMP Labschool Cibubur','Bagas Almer Dzaky - SMP Labschool Cibubur','Bilal Abrizam - SMP Labschool Cibubur','Maher Akbar Alvarez - SMP Labschool Cibubur','Raga Natha Aditya - SMP Labschool Cibubur'];

export function LoginForm() {
  const router = useRouter();
  const [showPassword,setShowPassword]=useState(false),[submitting,setSubmitting]=useState(false),[error,setError]=useState<string|null>(null),[isCreditsOpen,setIsCreditsOpen]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[passwordTouched,setPasswordTouched]=useState(false);
  const showPasswordError=passwordTouched&&password.length>0&&password.length<8;
  async function handleSubmit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setError(null);setPasswordTouched(true);const cleanEmail=email.trim().toLowerCase();
    if(!cleanEmail)return setError('Please enter your email.');if(password.length<8)return setError('Password must be at least 8 characters.');
    const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/,''),supabaseAnonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if(!supabaseUrl||!supabaseAnonKey)return setError('Supabase configuration is missing. Please check the Vercel environment variables.');
    setSubmitting(true);
    try{
      const authResponse=await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({email:cleanEmail,password}),cache:'no-store'});
      const authText=await authResponse.text();let authData:any={};try{authData=authText?JSON.parse(authText):{}}catch{}
      if(!authResponse.ok||!authData.access_token||!authData.user?.id){const message=String(authData.error_description||authData.message||authData.msg||authData.error||'').trim(),lower=message.toLowerCase();if(lower.includes('email not confirmed')||lower.includes('confirm your email'))setError('Please confirm your email before signing in.');else if(lower.includes('invalid login credentials')||lower.includes('invalid email or password')||lower.includes('invalid_grant'))setError('Invalid email or password.');else if(message)setError(`Sign in failed: ${message}`);else setError(`Sign in failed (HTTP ${authResponse.status}). Please try again.`);return;}
      const userId=String(authData.user.id),accessToken=String(authData.access_token),refreshToken=String(authData.refresh_token||'');
      const authHeaders={apikey:supabaseAnonKey,Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'};
      let profile:any=null;
      const profileResponse=await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=id,full_name,email,role`,{headers:authHeaders,cache:'no-store'});const profileText=await profileResponse.text();let rows:any=[];try{rows=profileText?JSON.parse(profileText):[]}catch{}
      if(profileResponse.ok&&Array.isArray(rows)&&rows[0])profile=rows[0];
      if(!profile){console.error('[Login] Auth succeeded but public.users profile was not found:',profileText);setError('Your profile could not be loaded. Please try again.');return;}
      const role=String(profile.role||'student').trim().toLowerCase(),validRole=role==='teacher'||role==='student'?role:'student';
      const currentUser={id:userId,user_id:userId,student_id:validRole==='student'?userId:undefined,fullName:profile.full_name||authData.user.user_metadata?.full_name||'User',email:profile.email||authData.user.email||cleanEmail,role:validRole,accessToken};
      localStorage.setItem('current_user',JSON.stringify(currentUser));localStorage.setItem('supabase_access_token',accessToken);if(refreshToken)localStorage.setItem('supabase_refresh_token',refreshToken);localStorage.setItem('supabase_user_id',userId);
      router.replace(`/dashboard/${validRole}`);
    }catch(err){console.error('[Login] Login error:',err);setError('Could not connect to Supabase. Please try again.');}finally{setSubmitting(false);}
  }
  return <div className="relative">
    <div className="mb-5 flex items-center justify-between">
      <Link href="/join?from=signin" className="inline-flex">
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-xs">
          <Radio size={14}/> Join Live Quiz
        </Button>
      </Link>
      <Button type="button" variant="ghost" size="sm" onClick={()=>setIsCreditsOpen(true)} className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"><Award size={14}/> Credits</Button>
    </div>
    {error&&<div role="alert" className="mb-5 break-words rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-500">{error}</div>}
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@school.edu" required value={email} onChange={e=>setEmail(e.target.value)} className="h-11 bg-background"/></div>
      <div className="flex flex-col gap-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link href="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline">Forgot password?</Link></div><div className="relative"><Input id="password" name="password" type={showPassword?'text':'password'} autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={e=>{setPassword(e.target.value);setPasswordTouched(true)}} className={`h-11 bg-background pr-11 transition-colors ${showPasswordError?'border-red-500 focus-visible:ring-1 focus-visible:ring-red-500':'focus-visible:ring-2 focus-visible:ring-primary'}`}/><button type="button" onClick={()=>setShowPassword(p=>!p)} aria-label={showPassword?'Hide password':'Show password'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">{showPassword?<EyeOff className="size-4"/>:<Eye className="size-4"/>}</button></div>{showPasswordError&&<p className="text-xs font-medium text-red-500">Password must be at least 8 characters.</p>}</div>
      <Button type="submit" disabled={submitting} className="mt-1 h-11 w-full text-base">{submitting?<><Loader2 className="size-4 animate-spin"/> Signing in…</>:'Sign in'}</Button>
      <p className="text-center text-sm text-muted-foreground">Don&apos;t have an account? <Link href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">Create one</Link></p>
      <p className="text-center text-xs leading-5 text-muted-foreground">By signing in you agree to our <Link href="/terms?from=signin" className="underline underline-offset-2 hover:text-foreground">Terms</Link> and <Link href="/privacy?from=signin" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.</p>
    </form>
    {isCreditsOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"><div className="relative w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-center justify-between border-b border-border pb-3"><h3 className="flex items-center gap-2 text-lg font-bold text-foreground"><Award size={20} className="text-primary"/> Project Credits</h3><button type="button" onClick={()=>setIsCreditsOpen(false)} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Close credits"><X size={16}/></button></div><div className="max-h-[60vh] space-y-3 overflow-y-auto py-2"><p className="text-xs text-muted-foreground">Developed by the following contributors:</p><ul className="space-y-2">{creditsList.map(c=><li key={c} className="rounded-lg border border-border/50 bg-accent/30 p-2.5 text-sm font-medium text-foreground">{c}</li>)}</ul></div></div></div>}
  </div>;
}
