'use client'

import { useEffect } from 'react'

let installed = false

function getAccessToken() {
  try {
    const token = localStorage.getItem('supabase_access_token')
    return token?.trim() || null
  } catch {
    return null
  }
}

export function SupabaseAuthFetch() {
  useEffect(() => {
    if (installed) return
    installed = true

    const originalFetch = window.fetch.bind(window)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '')

    if (!supabaseUrl) return

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = getAccessToken()
      const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const isSupabaseRestRequest = requestUrl.startsWith(`${supabaseUrl}/rest/v1/`)

      if (!token || !isSupabaseRestRequest) {
        return originalFetch(input, init)
      }

      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : undefined),
      )

      headers.set('Authorization', `Bearer ${token}`)

      return originalFetch(input, {
        ...init,
        headers,
      })
    }
  }, [])

  return null
}
