'use client'

import { useEffect } from 'react'

// Pages that only make sense signed in. Live quiz player screens are public so
// guests can join from a teacher's code.
function needsSession(pathname: string) {
  if (pathname.startsWith('/dashboard/student/live-quiz/')) return false
  return pathname.startsWith('/dashboard/') || pathname.startsWith('/settings')
}

const STORED_PROFILE_KEYS = ['current_user', 'supabase_user_id', 'supabase_access_token', 'supabase_refresh_token', 'eduquizlabs_remembered_session']

let verifying: Promise<void> | null = null

function endSession() {
  try {
    for (const key of STORED_PROFILE_KEYS) {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    }
  } catch {}
  window.location.replace('/?expired=1')
}

// A 401 from one API route can also mean "wrong role for this route", so ask the
// session endpoint before signing the user out.
function verifySession(fetchImpl: typeof window.fetch) {
  if (verifying) return verifying
  verifying = (async () => {
    try {
      const response = await fetchImpl('/api/auth/session', { credentials: 'include', cache: 'no-store' })
      if (response.status === 401) endSession()
    } catch {
      // Offline or server error: leave the page as it is.
    } finally {
      verifying = null
    }
  })()
  return verifying
}

/**
 * Sends people back to sign in when their session has expired, instead of
 * leaving them on a page full of "Unauthorized." errors. The browser keeps a
 * copy of the profile in localStorage, which can outlive the real session.
 */
export function SessionWatcher() {
  useEffect(() => {
    const originalFetch = window.fetch

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init)
      if (response.status === 401 && needsSession(window.location.pathname)) {
        try {
          const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
          const url = new URL(raw, window.location.href)
          if (url.origin === window.location.origin && url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth/')) {
            void verifySession(originalFetch)
          }
        } catch {}
      }
      return response
    }

    let hasProfile = false
    try { hasProfile = Boolean(window.localStorage.getItem('current_user')) } catch {}
    if (hasProfile && needsSession(window.location.pathname)) void verifySession(originalFetch)

    return () => { window.fetch = originalFetch }
  }, [])

  return null
}
