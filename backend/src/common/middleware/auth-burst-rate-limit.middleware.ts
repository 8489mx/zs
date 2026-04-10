import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import type { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { InMemoryRateLimitService } from '../security/in-memory-rate-limit.service';

function normalizeIp(request: RequestWithAuth): string {
  return String(request.ip || request.socket?.remoteAddress || 'unknown').trim() || 'unknown';
}

@Injectable()
export class AuthBurstRateLimitMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimitService: InMemoryRateLimitService,
  ) {}

  use(req: RequestWithAuth, res: Response, next: NextFunction): void {
    const limit = this.configService.get<number>('AUTH_BURST_RATE_LIMIT_MAX') ?? 60;
    const windowSeconds = this.configService.get<number>('AUTH_BURST_RATE_LIMIT_WINDOW_SECONDS') ?? 60;
    const ip = normalizeIp(req);
    const path = String(req.path || req.originalUrl || 'auth').split('?')[0];
    const result = this.rateLimitService.hit(`auth:burst:${ip}:${path}`, limit, windowSeconds);

    res.setHeader('X-Auth-RateLimit-Limit', String(result.limit));
    res.setHeader('X-Auth-RateLimit-Remaining', String(result.remaining));
    if (result.resetAt) {
      res.setHeader('X-Auth-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
    }

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      throw new HttpException('Too many authentication requests. Please slow down.', HttpStatus.TOO_MANY_REQUESTS);
    }

    next();
  }
}
