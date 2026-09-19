import { AppError } from '../errors/app-error';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

/**
 * Lightweight in-memory brute-force guard for mobile PIN-based logins
 * (employee portal, driver portal, mobile attendance punch) that do not
 * go through the main `SessionService` lockout path.
 *
 * In-memory only: resets on process restart and is not shared across
 * horizontally-scaled instances. Sufficient to defeat naive PIN brute-forcing
 * (4-digit space) without requiring a schema migration; a durable,
 * cross-instance lockout should live on the relevant table if this ever
 * needs to survive restarts/scale-out.
 */
export class LoginAttemptLimiter {
  private readonly store = new Map<string, AttemptRecord>();

  constructor(
    private readonly maxAttempts = 5,
    private readonly windowMs = 15 * 60 * 1000,
    private readonly lockoutMs = 15 * 60 * 1000,
  ) {}

  private sweep(key: string, now: number): AttemptRecord {
    const existing = this.store.get(key);
    if (!existing) {
      const fresh: AttemptRecord = { count: 0, firstAttemptAt: now, lockedUntil: null };
      this.store.set(key, fresh);
      return fresh;
    }
    if (existing.lockedUntil && existing.lockedUntil <= now) {
      const fresh: AttemptRecord = { count: 0, firstAttemptAt: now, lockedUntil: null };
      this.store.set(key, fresh);
      return fresh;
    }
    if (!existing.lockedUntil && now - existing.firstAttemptAt > this.windowMs) {
      const fresh: AttemptRecord = { count: 0, firstAttemptAt: now, lockedUntil: null };
      this.store.set(key, fresh);
      return fresh;
    }
    return existing;
  }

  assertNotLocked(key: string): void {
    const now = Date.now();
    const record = this.sweep(key, now);
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      throw new AppError(
        `تم إيقاف محاولات الدخول مؤقتاً لتجاوز الحد المسموح. أعد المحاولة خلال ${remainingMinutes} دقيقة.`,
        'LOGIN_RATE_LIMITED',
        429,
      );
    }
  }

  recordFailure(key: string): void {
    const now = Date.now();
    const record = this.sweep(key, now);
    record.count += 1;
    if (record.count >= this.maxAttempts) {
      record.lockedUntil = now + this.lockoutMs;
    }
    this.store.set(key, record);
  }

  recordSuccess(key: string): void {
    this.store.delete(key);
  }
}
