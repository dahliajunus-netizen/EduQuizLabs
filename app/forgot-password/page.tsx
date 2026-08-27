'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSent(false);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError('Please enter your email.');

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !key) return setError('Supabase configuration is missing.');

    setLoading(true);
    try {
      const response = await fetch(`${url}/auth/v1/recover`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          redirect_to: `${window.location.origin}/reset-password`,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        let message = 'Could not send the reset email.';
        try {
          const data = JSON.parse(text);
          message = data.msg || data.message || message;
        } catch {}
        throw new Error(message);
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.');
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
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="size-7" />
              </div>
              <h1 className="text-2xl font-black">Check your email</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                If an account exists for <strong>{email.trim()}</strong>, we sent a password reset link. Check your inbox and spam folder.
              </p>
              <Link href="/" className="mt-6 inline-flex font-medium text-primary hover:underline">Return to sign in</Link>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Mail className="size-5" />
                </div>
                <h1 className="text-3xl font-black tracking-tight">Forgot your password?</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Enter the email on your EduQuizLabs account and we&apos;ll send you a secure reset link.</p>
              </div>
              {error && <div role="alert" className="mb-5 rounded-md bg-red-500/10 p-3 text-sm font-medium text-red-500">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input id="reset-email" type="email" autoComplete="email" placeholder="you@school.edu" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full">
                  {loading ? <><Loader2 className="size-4 animate-spin" /> Sending reset link…</> : 'Send reset link'}
                </Button>
              </form>
            </>
          )}
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">Remember your password? <Link href="/" className="text-primary hover:underline">Sign in</Link></p>
      </div>
    </main>
  );
}
