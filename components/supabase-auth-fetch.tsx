'use client'

let installed = false
let storageIsolated = false
let refreshPromise: Promise<string | null> | null = null

// Auth state must be tab-scoped. localStorage is shared by every tab on the
// same origin, so logging into a second account would overwrite the first
// account's session. Keep the existing localStorage API used throughout the
// app, but transparently store auth keys in sessionStorage instead.
const TAB_AUTH_KEYS = new Set([
  'current_user',
  'supabase_access_token',
  'supabase_refresh_token',
  'supabase_user_id',
  'access_token',
  'supabase.auth.token',
])

function installTabScopedAuthStorage() {
  if (storageIsolated || typeof window === 'undefined') return
  storageIsolated = true

  const proto = Storage.prototype
  const originalGetItem = proto.getItem
  const originalSetItem = proto.setItem
  const originalRemoveItem = proto.removeItem
  const originalClear = proto.clear

  proto.getItem = function (key: string) {
    if (this === window.localStorage && TAB_AUTH_KEYS.has(key)) {
      return originalGetItem.call(window.sessionStorage, key)
    }
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
function setTokens(accessToken: string, refreshToken?: string) { try { localStorage.setItem('supabase_access_token', accessToken); if (refreshToken) localStorage.setItem('supabase_refresh_token', refreshToken); const raw=localStorage.getItem('current_user'); if(raw){const user=JSON.parse(raw);user.accessToken=accessToken;localStorage.setItem('current_user',JSON.stringify(user))} } catch {} }
function hasExplicitAuthorization(init?: RequestInit,input?: RequestInfo|URL){ if(init?.headers&&new Headers(init.headers).has('Authorization')) return true; if(input instanceof Request) return input.headers.has('Authorization'); return false }

async function refreshAccessToken(): Promise<string|null> {
  if (refreshPromise) return refreshPromise
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/,'')
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const refreshToken=getRefreshToken()
  if(!base||!key||!refreshToken) return null
  refreshPromise=(async()=>{ try { const r=await fetch(`${base}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken}),cache:'no-store'}); const data=await r.json().catch(()=>null); if(!r.ok||!data?.access_token) return null; setTokens(String(data.access_token),data.refresh_token?String(data.refresh_token):undefined); return String(data.access_token) } catch { return null } finally { refreshPromise=null } })()
  return refreshPromise
}

function installAuthenticatedFetch(){
  if(installed||typeof window==='undefined') return
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/,''); if(!supabaseUrl) return
  installed=true
  const originalFetch=window.fetch.bind(window)
  window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
    const requestUrl=typeof input==='string'?input:input instanceof URL?input.toString():input.url
    if(!requestUrl.startsWith(`${supabaseUrl}/rest/v1/`)) return originalFetch(input,init)
    if(hasExplicitAuthorization(init,input)) return originalFetch(input,init)
    let token=getAccessToken()
    if(!token) return originalFetch(input,init)
    const headers=new Headers(init?.headers||(input instanceof Request?input.headers:undefined));headers.set('Authorization',`Bearer ${token}`)
    const response=await originalFetch(input,{...init,headers})
    if(response.status!==401) return response
    const fresh=await refreshAccessToken()
    if(!fresh) return response
    const retryHeaders=new Headers(init?.headers||(input instanceof Request?input.headers:undefined));retryHeaders.set('Authorization',`Bearer ${fresh}`)
    return originalFetch(input,{...init,headers:retryHeaders})
  }
}

installTabScopedAuthStorage()
installAuthenticatedFetch()
export function SupabaseAuthFetch(){return null}
