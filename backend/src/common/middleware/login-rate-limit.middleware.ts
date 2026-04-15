import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import type { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { InMemoryRateLimitService } from '../security/in-memory-rate-limit.service';

function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeIp(request: RequestWithAuth): string {
  return String(request.ip || request.socket?.remoteAddress || 'unknown').trim() || 'unknown';
}

@Injectable()
export class LoginRateLimitMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimitService: InMemoryRateLimitService,
  ) {}

  async use(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> {
    const limit = this.configService.get<number>('LOGIN_RATE_LIMIT_MAX') ?? 10;
    const windowSeconds = this.configService.get<number>('LOGIN_RATE_LIMIT_WINDOW_SECONDS') ?? 600;
    const username = normalizeUsername((req.body as Record<string, unknown> | undefined)?.username);
    const ip = normalizeIp(req);

    const keys = [`auth:login:ip:${ip}`];
    if (username) {
      keys.push(`auth:login:user:${username}`);
      keys.push(`auth:login:pair:${ip}:${username}`);
    }

    let strictest = await this.rateLimitService.hit(keys[0], limit, windowSeconds);
    for (const key of keys.slice(1)) {
      const result = await this.rateLimitService.hit(key, limit, windowSeconds);
      if (!result.allowed || result.remaining < strictest.remaining) {
        strictest = result;
      }
    }

    res.setHeader('X-RateLimit-Limit', String(strictest.limit));
    res.setHeader('X-RateLimit-Remaining', String(strictest.remaining));
    if (strictest.resetAt) {
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(strictest.resetAt / 1000)));
    }

    if (!strictest.allowed) {
      res.setHeader('Retry-After', String(strictest.retryAfterSeconds));
      throw new HttpException('Too many login attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    next();
  }
}
