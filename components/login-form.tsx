'use client'

import type React from 'react'
import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    // Simulate an auth request for the demo.
    setTimeout(() => setSubmitting(false), 1200)
  }

  return (
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
            className="h-11 bg-card pr-11"
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
        <a href="#" className="font-medium text-primary underline-offset-4 hover:underline">
          Create one
        </a>
      </p>
    </form>
  )
}
