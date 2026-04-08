import { createHmac, timingSafeEqual } from 'node:crypto';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

function normalizeSecret(secret: string): string {
  return secret.trim() || 'local-dev-csrf-secret';
}

export function createCsrfToken(sessionId: string, secret: string): string {
  return createHmac('sha256', normalizeSecret(secret)).update(sessionId).digest('hex');
}

export function verifyCsrfToken(sessionId: string, secret: string, token: string): boolean {
  const expected = createCsrfToken(sessionId, secret);
  const left = Buffer.from(expected, 'utf8');
  const right = Buffer.from(String(token || ''), 'utf8');

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
