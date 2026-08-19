'use client';

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Award, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const creditsList = [
  "Aidan Rayka Dewabrata - SMP Labschool Cibubur",
  "Atha Badzikh Dodi Elang Permana - SMP Labschool Cibubur",
  "Bagas Almer Dzaki - SMP Labschool Cibubur",
  "Bilal Abrizam - SMP Labschool Cibubur",
  "Maher Akbar Alvarez - SMP Labschool Cibubur",
  "Raga Natha Aditya - SMP Labschool Cibubur"
];

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Credits Modal State
  const [isCreditsOpen, setIsCreditsOpen] = useState(false)

  // Real-time password validation states
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState('')

  const showPasswordError = passwordTouched && password.length > 0 && password.length < 8

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordTouched('true')
    setError(null)

    if (password.length < 8) {
      return 
    }

    setSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string

    try {
      // Query Supabase Cloud to check if email and password match
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}&select=*`,
        {
          method: 'GET',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error('Server error during login');
      }

      const users = await response.json();
      const user = users[0]; // Get the first matching user if found

      setSubmitting(false)

      if (user) {
        const role = user.role ? user.role.toLowerCase() : 'student'
        router.push(`/dashboard/${role}`)
      } else {
        setError('Invalid email or password.')
      }
    } catch (err) {
      setSubmitting(false)
      setError('Could not connect to cloud database. Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-5 relative">
      {/* Credits Button Header Action */}
      <div className="flex justify-end mb-1">
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => setIsCreditsOpen(true)}
          className="gap-1.5 h-8 text-xs"
        >
          <Award size={14} /> Credits
        </Button>
      </div>

      {error && <div className="p-3 text-sm bg-red-500/10 text-red-500 rounded-md font-medium">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
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
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordTouched('true')
              }}
              className={`h-11 bg-card pr-11 transition-colors ${
                showPasswordError
                  ? 'border-red-500 focus-visible:ring-1 focus-visible:ring-red-500'
                  : 'focus-visible:ring-2 focus-visible:ring-blue-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {showPasswordError && (
            <p className="text-xs font-medium text-red-500">
              Password must be min. 8 characters
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="remember"
            className="size-4 rounded border-border accent-primary"
          />
          Keep me signed in
        </label>

        <Button type="submit" disabled={submitting} className="h-11 w-full text-base">
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {"Don't have an account? "}
          <Link
            href="/sign-up"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          By signing in you agree to our{' '}
          <Link href="/terms?from=signin" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy?from=signin" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      {/* Credits Modal Popup */}
      {isCreditsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl p-6 relative space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Award size={20} className="text-primary" /> Project Credits
              </h3>
              <button 
                onClick={() => setIsCreditsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground">Developed by the following contributors:</p>
              <ul className="space-y-2">
                {creditsList.map((credit, idx) => (
                  <li key={idx} className="text-sm bg-accent/30 p-2.5 rounded-lg border border-border/50 text-foreground font-medium">
                    {credit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
