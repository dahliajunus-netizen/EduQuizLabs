const ITERATIONS = 120000;
const KEY_LENGTH = 256;
const SALT_BYTES = 16;
const PREFIX = 'pbkdf2-sha256';

function bytesToBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64url');
}

function base64ToBytes(value: string) {
  return new Uint8Array(Buffer.from(value, 'base64url'));
}

async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_LENGTH,
  );
  return new Uint8Array(bits);
}

export async function hashAssessmentPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derive(password, salt);
  return `${PREFIX}$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a[i] ^ b[i];
  return result === 0;
}

export async function verifyAssessmentPassword(password: string, stored: string) {
  if (!stored) return { valid: true, legacy: false };
  if (!stored.startsWith(`${PREFIX}$`)) return { valid: password === stored, legacy: true };

  const [, iterationsText, saltText, hashText] = stored.split('$');
  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations < 100000 || !saltText || !hashText) return { valid: false, legacy: false };

  const salt = base64ToBytes(saltText);
  const expected = base64ToBytes(hashText);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    KEY_LENGTH,
  );
  return { valid: constantTimeEqual(new Uint8Array(bits), expected), legacy: false };
}
