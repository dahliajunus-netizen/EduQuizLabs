import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function serverConfigOk() {
  return Boolean(supabaseUrl && publishableKey && serviceKey);
}

export async function authenticatedUser(request: NextRequest) {
  if (!supabaseUrl || !publishableKey) return null;

  const accessToken = request.cookies.get('eduquiz_access_token')?.value || '';
  if (!accessToken) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (response.ok) return response.json();

  // Access tokens expire. Use the longer-lived refresh token when available.
  const refreshToken = request.cookies.get('eduquiz_refresh_token')?.value || '';
  if (!refreshToken) return null;

  const refreshResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: 'no-store',
  });
  if (!refreshResponse.ok) return null;

  const refreshed = await refreshResponse.json().catch(() => null);
  return refreshed?.user || null;
}

export async function supabaseDb(path: string, init: RequestInit = {}) {
  if (!supabaseUrl || !serviceKey) throw new Error('Server database configuration is missing.');
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw new Error(text || `Supabase request failed (${response.status}).`);
  return data;
}

export async function supabaseRpc(name: string, args: Record<string, unknown>) {
  return supabaseDb(`rpc/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
}
