'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Real-time password validation states
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState('')

  const showPasswordError = passwordTouched && password.length > 0 && password.length < 8

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: '987240308433-40vrgkfn275ptpl110dqo5dlhk14oa5r.apps.googleusercontent.com',
          callback: handleGoogleResponse,
        })

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button-div'),
          { theme: 'outline', size: 'large', width: '100%' }
        )
      }
    }

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  function handleGoogleResponse(response: any) {
    try {
      const base64Url = response.credential.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
      
      const googleUser = JSON.parse(jsonPayload)
      
      const existingUsers = JSON.parse(localStorage.getItem('edu_users') || '[]')
      let user = existingUsers.find((u: any) => u.email === googleUser.email)

      if (!user) {
        user = { 
          fullName: googleUser.name, 
          email: googleUser.email, 
          age: 18,
          country: 'United States', 
          password: 'oauth_google_user', 
          role: 'student' 
        }
        existingUsers.push(user)
        localStorage.setItem('edu_users', JSON.stringify(existingUsers))
      }

      // Redirect based on role
      const role = user.role ? user.role.toLowerCase() : 'student'
      router.push(`/dashboard/${role}`)
    } catch (err) {
      setError('Google Sign-In failed. Please try again.')
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordTouched('true')
    setError(null)

    if (password.length < 8) {
      return // Stop form submission if password is under 8 characters
    }

    setSubmitting(true)
    
    // Check credentials against localStorage
    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const existingUsers = JSON.parse(localStorage.getItem('edu_users') || '[]')
    const user = existingUsers.find((u: any) => u.email === email && u.password === password)

    setTimeout(() => {
      setSubmitting(false)
      if (user) {
        // Redirect to specific dashboard based on role
        const role = user.role ? user.role.toLowerCase() : 'student'
        router.push(`/dashboard/${role}`)
      } else {
        setError('Invalid email or password.')
      }
    }, 1200)
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <div className="p-3 text-sm bg-red-500/10 text-red-500 rounded-md font-medium">{error}</div>}

      <div id="google-signin-button-div" className="flex justify-center w-full"></div>

      <div className="flex items-center my-1">
        <div className="flex-grow border-t border-muted"></div>
        <span className="px-3 text-xs uppercase text-muted-foreground">Or continue with</span>
        <div className="flex-grow border-t border-muted"></div>
      </div>

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
          {/* Red Pop-up Error Message */}
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

        {/* Single Working Terms & Privacy Links */}
        <p className="pt-2 text-center text-xs text-muted-foreground">
          By signing in you agree to our{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </div>
  )
}
