/**
 * How long the host shows a question before answers open. Answers open at
 * reveal start + this delay on every device at once, so players do not lose
 * the first seconds of a question waiting for their next state poll.
 */
export const LIVE_QUIZ_REVEAL_MS = 3400;

/** When answers open (ms since epoch) for a quiz in question_reveal or answering. */
export function answersOpenAt(status: string, questionStartedAt?: string | null) {
  const started = questionStartedAt ? new Date(questionStartedAt).getTime() : NaN;
  if (!Number.isFinite(started)) return null;
  if (status === 'question_reveal') return started + LIVE_QUIZ_REVEAL_MS;
  if (status === 'answering') return started;
  return null;
}

/**
 * Estimates how far this device's clock is from the server's, so countdowns
 * match the server's answer window even when a phone's clock is off.
 * Each sample (server time minus arrival time) can only undershoot the true
 * offset by the response's travel time, so the largest recent sample wins.
 */
export function createServerClock(window = 12) {
  const samples: number[] = [];
  let offset = 0;
  return {
    sync(serverNow: unknown, receivedAt = Date.now()) {
      const server = new Date(String(serverNow || '')).getTime();
      if (!Number.isFinite(server)) return;
      samples.push(server - receivedAt);
      if (samples.length > window) samples.shift();
      offset = Math.max(...samples);
    },
    now() {
      return Date.now() + offset;
    },
  };
}
