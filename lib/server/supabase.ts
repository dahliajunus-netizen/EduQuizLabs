import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

export function serverConfigOk() {
  return Boolean(supabaseUrl && anonKey && serviceKey);
}

export async function authenticatedUser(request: NextRequest) {
  if (!supabaseUrl || !anonKey) return null;

  // Prefer the HttpOnly cookie. Keep Bearer support temporarily so existing
  // clients can migrate without breaking in-flight sessions.
  const cookieToken = request.cookies.get('eduquiz_access_token')?.value || '';
  const authorization = request.headers.get('authorization') || '';
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const accessToken = cookieToken || bearerToken;
  if (!accessToken) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return response.ok ? response.json() : null;
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
