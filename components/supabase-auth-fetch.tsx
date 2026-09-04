'use client'

let installed = false
let storageIsolated = false
let refreshPromise: Promise<string | null> | null = null

// Auth state is tab-scoped while the last successful sign-in is remembered
// persistently. This lets multiple tabs use different accounts, while a new
// visit can restore the most recently signed-in account automatically.
const TAB_AUTH_KEYS = new Set([
  'current_user',
  'supabase_access_token',
  'supabase_refresh_token',
  'supabase_user_id',
  'access_token',
  'supabase.auth.token',
])

const REMEMBERED_SESSION_KEY = 'eduquizlabs_remembered_session'

function restoreRememberedSession() {
  if (typeof window === 'undefined') return
  try {
    const hasTabUser = !!window.sessionStorage.getItem('current_user')
    const hasTabToken = !!window.sessionStorage.getItem('supabase_access_token')
    if (hasTabUser && hasTabToken) return

    const raw = window.localStorage.getItem(REMEMBERED_SESSION_KEY)
    if (!raw) return
    const remembered = JSON.parse(raw)
    if (!remembered?.current_user) return

    window.sessionStorage.setItem('current_user', JSON.stringify(remembered.current_user))
    if (remembered.access_token) window.sessionStorage.setItem('supabase_access_token', String(remembered.access_token))
    if (remembered.refresh_token) window.sessionStorage.setItem('supabase_refresh_token', String(remembered.refresh_token))
    if (remembered.user_id) window.sessionStorage.setItem('supabase_user_id', String(remembered.user_id))
  } catch {}
}

function installTabScopedAuthStorage() {
  if (storageIsolated || typeof window === 'undefined') return
  storageIsolated = true

  const proto = Storage.prototype
  const originalGetItem = proto.getItem
  const originalSetItem = proto.setItem
  const originalRemoveItem = proto.removeItem
  const originalClear = proto.clear

  proto.getItem = function (key: string) {
    if (this === window.localStorage && TAB_AUTH_KEYS.has(key)) return originalGetItem.call(window.sessionStorage, key)
    return originalGetItem.call(this, key)
  }

  proto.setItem = function (key: string, value: string) {
    if (this === window.localStorage && TAB_AUTH_KEYS.has(key)) {
      originalSetItem.call(window.sessionStorage, key, value)
      return
    }
    originalSetItem.call(this, key, value)
  }

  proto.removeItem = function (key: string) {
    if (this === window.localStorage && TAB_AUTH_KEYS.has(key)) {
      originalRemoveItem.call(window.sessionStorage, key)
      return
    }
    originalRemoveItem.call(this, key)
  }

  proto.clear = function () {
    if (this === window.localStorage) {
      for (const key of TAB_AUTH_KEYS) originalRemoveItem.call(window.sessionStorage, key)
      return
    }
    originalClear.call(this)
  }
}

function getAccessToken() { try { return localStorage.getItem('supabase_access_token')?.trim() || null } catch { return null } }
function getRefreshToken() { try { return localStorage.getItem('supabase_refresh_token')?.trim() || null } catch { return null } }
function getCurrentRole() {
  try {
    const raw = localStorage.getItem('current_user')
    if (!raw) return ''
    const user = JSON.parse(raw)
    return String(user?.role ?? user?.user?.role ?? '').trim().toLowerCase()
  } catch {
    return ''
  }
}

function setTokens(accessToken: string, refreshToken?: string) {
  try {
    localStorage.setItem('supabase_access_token', accessToken)
    if (refreshToken) localStorage.setItem('supabase_refresh_token', refreshToken)
    const raw = localStorage.getItem('current_user')
    if (raw) {
      const user = JSON.parse(raw)
      user.accessToken = accessToken
      localStorage.setItem('current_user', JSON.stringify(user))
    }
    const remembered = window.localStorage.getItem(REMEMBERED_SESSION_KEY)
    if (remembered) {
      const session = JSON.parse(remembered)
      session.access_token = accessToken
      if (refreshToken) session.refresh_token = refreshToken
      session.current_user = { ...(session.current_user || {}), accessToken }
      window.localStorage.setItem(REMEMBERED_SESSION_KEY, JSON.stringify(session))
    }
  } catch {}
}

function hasExplicitAuthorization(init?: RequestInit, input?: RequestInfo | URL) {
  if (init?.headers && new Headers(init.headers).has('Authorization')) return true
  if (input instanceof Request) return input.headers.has('Authorization')
  return false
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '')
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const refreshToken = getRefreshToken()
  if (!base || !key || !refreshToken) return null
  refreshPromise = (async () => {
    try {
      const r = await fetch(`${base}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: 'no-store',
      })
      const data = await r.json().catch(() => null)
      if (!r.ok || !data?.access_token) return null
      setTokens(String(data.access_token), data.refresh_token ? String(data.refresh_token) : undefined)
      return String(data.access_token)
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

function tokenNeedsRefresh(token: string | null) {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = Number(payload?.exp)
    return !Number.isFinite(exp) || exp * 1000 - Date.now() < 60_000
  } catch {
    return true
  }
}

export async function ensureFreshAuthSession() {
  if (typeof window === 'undefined') return false
  restoreRememberedSession()
  const token = getAccessToken()
  if (!token) return !!getRefreshToken() && !!(await refreshAccessToken())
  if (tokenNeedsRefresh(token)) return !!(await refreshAccessToken())
  return true
}

function isTeacherLiveQuizPage() {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/dashboard/teacher/live-quiz')
}

function rewriteStudentQuizRead(requestUrl: string, method: string) {
  if (!['GET', 'HEAD'].includes(method.toUpperCase())) return requestUrl

  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '')
    if (!base || !requestUrl.startsWith(`${base}/rest/v1/`)) return requestUrl
    const parsed = new URL(requestUrl)
    const role = getCurrentRole()

    if (role === 'student') {
      if (parsed.pathname === '/rest/v1/tests') parsed.pathname = '/rest/v1/student_visible_tests'
      else if (parsed.pathname === '/rest/v1/test_questions') parsed.pathname = '/rest/v1/student_visible_test_questions'
    }

    // Live Quiz participants are allowed to enter without an account. The
    // public player page therefore receives only safe quiz/question columns.
    // The teacher host page continues to read the protected base tables.
    if (!isTeacherLiveQuizPage()) {
      if (parsed.pathname === '/rest/v1/live_quizzes') parsed.pathname = '/rest/v1/live_quiz_public'
      else if (parsed.pathname === '/rest/v1/live_quiz_questions') parsed.pathname = '/rest/v1/live_quiz_public_questions'
    }

    return parsed.toString()
  } catch {
    return requestUrl
  }
}

function installAuthenticatedFetch() {
  if (installed || typeof window === 'undefined') return
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '')
  if (!supabaseUrl) return
  installed = true
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const originalUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = init?.method || (input instanceof Request ? input.method : 'GET')
    const requestUrl = rewriteStudentQuizRead(originalUrl, method)

    if (!originalUrl.startsWith(`${supabaseUrl}/rest/v1/`) && requestUrl === originalUrl) return originalFetch(input, init)

    let token = getAccessToken()
    const shouldUseAuthHeader = !hasExplicitAuthorization(init, input) || requestUrl !== originalUrl
    if (!token && !shouldUseAuthHeader) return originalFetch(requestUrl, init)
    if (!token) return originalFetch(requestUrl, init)

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
    headers.set('Authorization', `Bearer ${token}`)
    const response = await originalFetch(requestUrl, { ...init, headers })
    if (response.status !== 401) return response

    const fresh = await refreshAccessToken()
    if (!fresh) return response
    const retryHeaders = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
    retryHeaders.set('Authorization', `Bearer ${fresh}`)
    return originalFetch(requestUrl, { ...init, headers: retryHeaders })
  }
}

installTabScopedAuthStorage()
restoreRememberedSession()
installAuthenticatedFetch()
export function SupabaseAuthFetch() { return null }
