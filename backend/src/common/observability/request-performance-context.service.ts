import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

type RequestPerfStore = {
  dbDurationMs: number;
  dbQueryCount: number;
};

@Injectable()
export class RequestPerformanceContextService {
  private readonly storage = new AsyncLocalStorage<RequestPerfStore>();

  run<T>(fn: () => T): T {
    return this.storage.run({ dbDurationMs: 0, dbQueryCount: 0 }, fn);
  }

  addDbTiming(durationMs: number): void {
    const store = this.storage.getStore();
    if (!store) return;
    if (!Number.isFinite(durationMs) || durationMs < 0) return;
    store.dbDurationMs += durationMs;
    store.dbQueryCount += 1;
  }

  snapshot(): { dbDurationMs: number; dbQueryCount: number } {
    const store = this.storage.getStore();
    return {
      dbDurationMs: store?.dbDurationMs ?? 0,
      dbQueryCount: store?.dbQueryCount ?? 0,
    };
  }
}
