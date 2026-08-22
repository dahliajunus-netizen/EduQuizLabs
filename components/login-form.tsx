'use client';

import type React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
  Award,
  X,
} from 'lucide-react';
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

  const [showPassword, setShowPassword] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [isCreditsOpen, setIsCreditsOpen] =
    useState(false);

  const [password, setPassword] =
    useState('');

  const [passwordTouched, setPasswordTouched] =
    useState('');

  const showPasswordError =
    passwordTouched &&
    password.length > 0 &&
    password.length < 8;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setPasswordTouched('true');
    setError(null);

    if (password.length < 8) {
      return;
    }

    setSubmitting(true);

    const formData = new FormData(
      event.currentTarget
    );

    const email = (
      formData.get('email') as string
    ).trim();

    try {
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

      const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (
        !supabaseUrl ||
        !supabaseAnonKey
      ) {
        throw new Error(
          'Supabase environment variables are missing.'
        );
      }

      /*
       * ========================================================
       * FIND USER
       * ========================================================
       */

      const response = await fetch(
        `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(
          email
        )}&select=*`,
        {
          method: 'GET',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );

      const responseText =
        await response.text();

      if (!response.ok) {
        console.error(
          'Supabase Error Response:',
          responseText
        );

        throw new Error(
          'Server error during login'
        );
      }

      const users = JSON.parse(
        responseText
      );

      const user = users?.[0];

      /*
       * ========================================================
       * CHECK PASSWORD
       * ========================================================
       */

      if (
        !user ||
        !user.password ||
        user.password.trim() !==
          password.trim()
      ) {
        setSubmitting(false);
        setError(
          'Invalid email or password.'
        );
        return;
      }

      /*
       * ========================================================
       * GET USER ID
       * ========================================================
       *
       * Your dashboard needs a unique teacher ID.
       *
       * Normally this should be `user.id`.
       *
       * We also support `user.user_id` and `user.uid`
       * in case your users table uses one of those names.
       */

      const userId =
        user.id ??
        user.user_id ??
        user.uid ??
        null;

      console.log(
        '[Login] User returned from database:',
        user
      );

      console.log(
        '[Login] Detected user ID:',
        userId
      );

      if (
        userId === null ||
        userId === undefined ||
        String(userId).trim() === ''
      ) {
        console.error(
          '[Login] User has no usable ID.',
          user
        );

        setSubmitting(false);

        setError(
          'This account is missing a user ID. Please contact the administrator.'
        );

        return;
      }

      /*
       * ========================================================
       * ROLE
       * ========================================================
       */

      const role = user.role
        ? String(user.role).toLowerCase()
        : 'student';

      /*
       * ========================================================
       * SAVE CURRENT USER
       * ========================================================
       */

      const currentUser = {
        id: String(userId),
        fullName:
          user.fullName ||
          user.full_name ||
          'User',
        email: user.email,
        role: role,
      };

      console.log(
        '[Login] Saving current_user:',
        currentUser
      );

      localStorage.setItem(
        'current_user',
        JSON.stringify(currentUser)
      );

      /*
       * Verify that localStorage actually contains
       * the ID before navigating.
       */

      const savedUser =
        localStorage.getItem(
          'current_user'
        );

      console.log(
        '[Login] Saved current_user:',
        savedUser
      );

      setSubmitting(false);

      /*
       * ========================================================
       * REDIRECT
       * ========================================================
       */

      router.push(
        `/dashboard/${role}`
      );
    } catch (err) {
      console.error(
        '[Login] Login error:',
        err
      );

      setSubmitting(false);

      setError(
        'Could not connect to cloud database. Please try again.'
      );
    }
  }

  return (
    <div className="flex flex-col gap-5 relative">

      {/* Credits */}
      <div className="flex justify-end mb-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setIsCreditsOpen(true)
          }
          className="gap-1.5 h-8 text-xs"
        >
          <Award size={14} />
          Credits
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 text-sm bg-red-500/10 text-red-500 rounded-md font-medium">
          {error}
        </div>
      )}

      {/* Login Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >

        {/* Email */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">
            Email
          </Label>

          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            required
            className="h-11 bg-card"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">

          <div className="flex items-center justify-between">
            <Label htmlFor="password">
              Password
            </Label>

            <a
              href="#"
              className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              Forgot password?
            </a>
          </div>

          <div className="relative">

            <Input
              id="password"
              name="password"
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => {
                setPassword(
                  e.target.value
                );

                setPasswordTouched(
                  'true'
                );
              }}
              className={`h-11 bg-card pr-11 transition-colors ${
                showPasswordError
                  ? 'border-red-500 focus-visible:ring-1 focus-visible:ring-red-500'
                  : 'focus-visible:ring-2 focus-visible:ring-blue-500'
              }`}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (prev) => !prev
                )
              }
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>

          </div>

          {showPasswordError && (
            <p className="text-xs font-medium text-red-500">
              Password must be min. 8 characters
            </p>
          )}

        </div>

        {/* Remember Me */}
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="remember"
            className="size-4 rounded border-border accent-primary"
          />

          Keep me signed in
        </label>

        {/* Sign In */}
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full text-base"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>

        {/* Sign Up */}
        <p className="text-center text-sm text-muted-foreground">
          {"Don't have an account? "}

          <Link
            href="/sign-up"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>

        {/* Terms */}
        <p className="pt-2 text-center text-xs text-muted-foreground">
          By signing in you agree to our{' '}

          <Link
            href="/terms?from=signin"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Terms
          </Link>{' '}

          and{' '}

          <Link
            href="/privacy?from=signin"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>

      </form>

      {/* ======================================================
          CREDITS MODAL
          ====================================================== */}

      {isCreditsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

          <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl p-6 relative space-y-4">

            <div className="flex items-center justify-between border-b border-border pb-3">

              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Award
                  size={20}
                  className="text-primary"
                />

                Project Credits
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsCreditsOpen(
                    false
                  )
                }
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
              >
                <X size={16} />
              </button>

            </div>

            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">

              <p className="text-xs text-muted-foreground">
                Developed by the following contributors:
              </p>

              <ul className="space-y-2">

                {creditsList.map(
                  (credit, idx) => (
                    <li
                      key={idx}
                      className="text-sm bg-accent/30 p-2.5 rounded-lg border border-border/50 text-foreground font-medium"
                    >
                      {credit}
                    </li>
                  )
                )}

              </ul>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
