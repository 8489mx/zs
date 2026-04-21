import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { LoggerService } from '../../core/logging/logger.service';
import { RequestPerformanceContextService } from '../observability/request-performance-context.service';

@Injectable()
export class CriticalRequestTimingMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: LoggerService,
    private readonly requestPerf: RequestPerformanceContextService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    this.requestPerf.run(() => {
      const startedAt = process.hrtime.bigint();
      res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const metrics = this.requestPerf.snapshot();

        this.logger.log('critical_request_timing', {
          method: req.method,
          route: req.originalUrl ?? req.url,
          statusCode: res.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
          dbDurationMs: Number(metrics.dbDurationMs.toFixed(2)),
          dbQueryCount: metrics.dbQueryCount,
        });
      });

      next();
    });
  }
}
