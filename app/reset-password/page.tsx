'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token=')) setReady(true);
    else setError('This password reset link is missing or has expired. Please request a new one.');
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !key) return setError('Supabase configuration is missing.');

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    if (!accessToken) return setError('This password reset link is missing or has expired.');

    setLoading(true);
    try {
      const response = await fetch(`${url}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey: key,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const text = await response.text();
        let message = 'Could not update your password.';
        try {
          const data = JSON.parse(text);
          message = data.msg || data.message || message;
        } catch {}
        throw new Error(message);
      }
      setSuccess(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="size-7" /></div>
              <h1 className="text-2xl font-black">Password updated</h1>
              <p className="mt-3 text-sm text-muted-foreground">Your password has been changed successfully.</p>
              <Link href="/" className="mt-6 inline-flex font-medium text-primary hover:underline">Sign in with your new password</Link>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Lock className="size-5" /></div>
                <h1 className="text-3xl font-black tracking-tight">Set a new password</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a new password for your EduQuizLabs account.</p>
              </div>
              {error && <div role="alert" className="mb-5 rounded-md bg-red-500/10 p-3 text-sm font-medium text-red-500">{error}</div>}
              {ready && <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" /></div>
                <div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11" /></div>
                <Button type="submit" disabled={loading} className="h-11 w-full">{loading ? <><Loader2 className="size-4 animate-spin" /> Updating password…</> : 'Update password'}</Button>
              </form>}
              {!ready && <Link href="/forgot-password" className="inline-flex font-medium text-primary hover:underline">Request a new reset link</Link>}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
