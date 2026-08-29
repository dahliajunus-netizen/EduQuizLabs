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

function installAuthenticatedFetch() {
  if (installed || typeof window === 'undefined') return

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '')
  if (!supabaseUrl) return

  installed = true
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    const isSupabaseRestRequest = requestUrl.startsWith(`${supabaseUrl}/rest/v1/`)

    if (!isSupabaseRestRequest) {
      return originalFetch(input, init)
    }

    const token = getAccessToken()
    if (!token) {
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
}

// Install immediately when this client module is evaluated instead of waiting
// for useEffect. This prevents page-level useEffect fetches from racing the
// authentication wrapper during navigation to dashboard pages.
installAuthenticatedFetch()

export function SupabaseAuthFetch() {
  return null
}
