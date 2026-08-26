'use client';

import type React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Award, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const creditsList = [
  'Aidan Rayka Dewabrata - SMP Labschool Cibubur',
  'Atha Badzikh Dodi Elang Permana - SMP Labschool Cibubur',
  'Bagas Almer Dzaky - SMP Labschool Cibubur',
  'Bilal Abrizam - SMP Labschool Cibubur',
  'Maher Akbar Alvarez - SMP Labschool Cibubur',
  'Raga Natha Aditya - SMP Labschool Cibubur',
];

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);

  const showPasswordError =
    passwordTouched && password.length > 0 && password.length < 8;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordTouched(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim().toLowerCase();

    if (password.length < 8) return;
    setSubmitting(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables are missing.');
      }

      const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        cache: 'no-store',
      });

      const authData = await authResponse.json().catch(() => ({}));

      if (!authResponse.ok || !authData.access_token || !authData.user?.id) {
        setError(
          authData.error_description === 'Email not confirmed'
            ? 'Please confirm your email before signing in.'
            : 'Invalid email or password.'
        );
        setSubmitting(false);
        return;
      }

      const userId = String(authData.user.id);
      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=id,full_name,email,role`,
        {
          method: 'GET',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${authData.access_token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );

      const profiles = await profileResponse.json().catch(() => []);
      const profile = Array.isArray(profiles) ? profiles[0] : null;

      if (!profileResponse.ok || !profile) {
        console.error('[Login] Auth succeeded but profile was not found:', profiles);
        setError('Your account is missing its profile. Please contact the administrator.');
        setSubmitting(false);
        return;
      }

      const role = String(profile.role ?? 'student').toLowerCase();
      const currentUser = {
        id: userId,
        fullName: profile.full_name || 'User',
        email: profile.email || email,
        role,
        accessToken: authData.access_token,
      };

      localStorage.setItem('current_user', JSON.stringify(currentUser));
      localStorage.setItem('supabase_access_token', authData.access_token);

      setSubmitting(false);
      router.push(`/dashboard/${role}`);
    } catch (err) {
      console.error('[Login] Login error:', err);
      setSubmitting(false);
      setError('Could not connect to cloud database. Please try again.');
    }
  }

  return (
    <div className="relative flex flex-col gap-6">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreditsOpen(true)} className="h-7 gap-1.5 px-2 text-xs text-muted-foreground">
          <Award size={14} /> Credits
        </Button>
      </div>

      {error && <div className="rounded-md bg-red-500/10 p-3 text-sm font-medium text-red-500">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@school.edu" required className="h-11 bg-card" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline">Forgot password?</Link>
          </div>

          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true); }}
              className={`h-11 bg-card pr-11 transition-colors ${showPasswordError ? 'border-red-500 focus-visible:ring-1 focus-visible:ring-red-500' : 'focus-visible:ring-2 focus-visible:ring-blue-500'}`}
            />
            <button type="button" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {showPasswordError && <p className="text-xs font-medium text-red-500">Password must be min. 8 characters</p>}
        </div>

        <Button type="submit" disabled={submitting} className="h-11 w-full text-base">
          {submitting ? <><Loader2 className="size-4 animate-spin" /> Signing in…</> : 'Sign in'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">Create one</Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          By signing in you agree to our{' '}
          <Link href="/terms?from=signin" className="underline underline-offset-2 hover:text-foreground">Terms</Link>{' '}and{' '}
          <Link href="/privacy?from=signin" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
        </p>
      </form>

      {isCreditsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-foreground"><Award size={20} className="text-primary" /> Project Credits</h3>
              <button type="button" onClick={() => setIsCreditsOpen(false)} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto py-2">
              <p className="text-xs text-muted-foreground">Developed by the following contributors:</p>
              <ul className="space-y-2">
                {creditsList.map((credit) => <li key={credit} className="rounded-lg border border-border/50 bg-accent/30 p-2.5 text-sm font-medium text-foreground">{credit}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
