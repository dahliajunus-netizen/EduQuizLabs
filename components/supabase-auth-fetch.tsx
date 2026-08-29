'use client'

let installed = false

function getAccessToken() {
  try {
    const token = localStorage.getItem('supabase_access_token')
    return token?.trim() || null
  } catch {
    return null
  }
}

function hasExplicitAuthorization(init?: RequestInit, input?: RequestInfo | URL) {
  if (init?.headers) {
    const headers = new Headers(init.headers)
    if (headers.has('Authorization')) return true
  }
  if (input instanceof Request) return input.headers.has('Authorization')
  return false
}

function installAuthenticatedFetch() {
  if (installed || typeof window === 'undefined') return

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '')
  if (!supabaseUrl) return

  installed = true
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url

    if (!requestUrl.startsWith(`${supabaseUrl}/rest/v1/`)) {
      return originalFetch(input, init)
    }

    // Preserve freshly-issued Supabase tokens supplied explicitly by login.
    // Otherwise a stale localStorage token can overwrite them and cause 401/JWT expired.
    if (hasExplicitAuthorization(init, input)) {
      return originalFetch(input, init)
    }

    const token = getAccessToken()
    if (!token) return originalFetch(input, init)

    const headers = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined),
    )
    headers.set('Authorization', `Bearer ${token}`)

    return originalFetch(input, { ...init, headers })
  }
}

// Install immediately so dashboard requests cannot race the wrapper setup.
installAuthenticatedFetch()

export function SupabaseAuthFetch() {
  return null
}
