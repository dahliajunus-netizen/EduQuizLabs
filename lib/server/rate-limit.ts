type Entry = { count: number; resetAt: number };

const entries = new Map<string, Entry>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;

export function assessmentPasswordRateLimited(key: string) {
  const now = Date.now();
  const current = entries.get(key);
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS;
}
