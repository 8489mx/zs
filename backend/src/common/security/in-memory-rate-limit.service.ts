import { Injectable } from '@nestjs/common';

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
  resetAt: number;
};

@Injectable()
export class InMemoryRateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  hit(key: string, limit: number, windowSeconds: number): RateLimitResult {
    const safeLimit = Math.max(1, Number(limit) || 1);
    const safeWindowMs = Math.max(1, Number(windowSeconds) || 1) * 1000;
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + safeWindowMs;
      const bucket: Bucket = { count: 1, resetAt };
      this.buckets.set(key, bucket);
      this.prune(now);
      return {
        allowed: true,
        remaining: Math.max(0, safeLimit - 1),
        retryAfterSeconds: 0,
        limit: safeLimit,
        resetAt,
      };
    }

    existing.count += 1;
    const allowed = existing.count <= safeLimit;
    return {
      allowed,
      remaining: Math.max(0, safeLimit - existing.count),
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      limit: safeLimit,
      resetAt: existing.resetAt,
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  private prune(now: number): void {
    if (this.buckets.size < 2000) return;
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
