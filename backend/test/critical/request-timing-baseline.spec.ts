import { strict as assert } from 'node:assert';
import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { CriticalRequestTimingMiddleware } from '../../src/common/middleware/critical-request-timing.middleware';
import { RequestPerformanceContextService } from '../../src/common/observability/request-performance-context.service';

type TimingLog = {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  dbDurationMs: number;
  dbQueryCount: number;
};

class CaptureLogger {
  public readonly rows: TimingLog[] = [];

  log(message: string, payload?: TimingLog): void {
    if (message === 'critical_request_timing' && payload) {
      this.rows.push(payload);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createResponse(): Response {
  const emitter = new EventEmitter() as Response;
  (emitter as any).statusCode = 200;
  (emitter as any).on = EventEmitter.prototype.on.bind(emitter);
  (emitter as any).emit = EventEmitter.prototype.emit.bind(emitter);
  return emitter;
}

async function runMeasuredRequest(
  middleware: CriticalRequestTimingMiddleware,
  perf: RequestPerformanceContextService,
  request: Pick<Request, 'method' | 'originalUrl' | 'url'>,
  dbQueryDurationsMs: number[],
  handlerDelayMs: number,
): Promise<void> {
  const res = createResponse();

  await new Promise<void>((resolve) => {
    const next: NextFunction = () => {
      const task = async () => {
        for (const ms of dbQueryDurationsMs) perf.addDbTiming(ms);
        await sleep(handlerDelayMs);
        (res as any).emit('finish');
        resolve();
      };
      void task();
    };

    middleware.use(request as Request, res, next);
  });
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function main(): Promise<void> {
  const logger = new CaptureLogger();
  const perf = new RequestPerformanceContextService();
  const middleware = new CriticalRequestTimingMiddleware(logger as any, perf);

  const scenarios = [
    {
      name: 'POST /api/auth/login',
      request: { method: 'POST', originalUrl: '/api/auth/login', url: '/api/auth/login' },
      samples: Array.from({ length: 8 }, (_, i) => ({
        db: [3 + (i % 2), 4 + (i % 3), 2],
        delay: 10 + (i % 3),
      })),
    },
    {
      name: 'GET /api/sales',
      request: { method: 'GET', originalUrl: '/api/sales?page=1', url: '/api/sales?page=1' },
      samples: Array.from({ length: 8 }, (_, i) => ({
        db: [8 + (i % 3), 11 + (i % 2), 7, 6 + (i % 2), 5],
        delay: 18 + (i % 4),
      })),
    },
    {
      name: 'GET /api/purchases',
      request: { method: 'GET', originalUrl: '/api/purchases?page=1', url: '/api/purchases?page=1' },
      samples: Array.from({ length: 8 }, (_, i) => ({
        db: [7 + (i % 2), 9 + (i % 3), 6, 5 + (i % 2)],
        delay: 15 + (i % 3),
      })),
    },
    {
      name: 'GET /api/reports/financial-summary',
      request: {
        method: 'GET',
        originalUrl: '/api/reports/financial-summary?from=2026-01-01&to=2026-01-31',
        url: '/api/reports/financial-summary?from=2026-01-01&to=2026-01-31',
      },
      samples: Array.from({ length: 8 }, (_, i) => ({
        db: [14 + (i % 3), 10 + (i % 2), 12 + (i % 2), 11, 9 + (i % 2), 8],
        delay: 23 + (i % 4),
      })),
    },
  ];

  for (const scenario of scenarios) {
    for (const sample of scenario.samples) {
      await runMeasuredRequest(middleware, perf, scenario.request as any, sample.db, sample.delay);
    }
  }

  assert.equal(logger.rows.length, scenarios.reduce((sum, item) => sum + item.samples.length, 0));

  const grouped = new Map<string, TimingLog[]>();
  for (const row of logger.rows) {
    const key = `${row.method} ${row.route.split('?')[0]}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  const summary = Array.from(grouped.entries())
    .map(([endpoint, rows]) => ({
      endpoint,
      avgLatencyMs: Number(average(rows.map((row) => row.durationMs)).toFixed(2)),
      avgDbDurationMs: Number(average(rows.map((row) => row.dbDurationMs)).toFixed(2)),
      avgDbQueryCount: Number(average(rows.map((row) => row.dbQueryCount)).toFixed(2)),
    }))
    .sort((a, b) => b.avgLatencyMs - a.avgLatencyMs);

  console.log('request-timing-baseline.spec: ok');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
