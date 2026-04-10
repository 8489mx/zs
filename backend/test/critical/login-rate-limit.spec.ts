import { strict as assert } from 'node:assert';
import { HttpException, HttpStatus } from '@nestjs/common';
import { LoginRateLimitMiddleware } from '../../src/common/middleware/login-rate-limit.middleware';
import { AuthBurstRateLimitMiddleware } from '../../src/common/middleware/auth-burst-rate-limit.middleware';
import { InMemoryRateLimitService } from '../../src/common/security/in-memory-rate-limit.service';

class FakeConfigService {
  constructor(private readonly values: Record<string, unknown>) {}
  get<T>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

function createResponse() {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader(name: string, value: string) {
      headers[name] = String(value);
    },
  } as any;
}

function expectTooManyRequests(fn: () => void): void {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof HttpException, 'Expected HttpException');
  assert.equal((thrown as HttpException).getStatus(), HttpStatus.TOO_MANY_REQUESTS);
}

function runLoginLimit(): void {
  const service = new InMemoryRateLimitService();
  const middleware = new LoginRateLimitMiddleware(
    new FakeConfigService({ LOGIN_RATE_LIMIT_MAX: 2, LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60 }) as any,
    service,
  );

  const next = () => undefined;
  middleware.use({ ip: '127.0.0.1', body: { username: 'admin' } } as any, createResponse(), next);
  middleware.use({ ip: '127.0.0.1', body: { username: 'admin' } } as any, createResponse(), next);
  expectTooManyRequests(() => {
    middleware.use({ ip: '127.0.0.1', body: { username: 'admin' } } as any, createResponse(), next);
  });
}

function runBurstLimit(): void {
  const service = new InMemoryRateLimitService();
  const middleware = new AuthBurstRateLimitMiddleware(
    new FakeConfigService({ AUTH_BURST_RATE_LIMIT_MAX: 1, AUTH_BURST_RATE_LIMIT_WINDOW_SECONDS: 60 }) as any,
    service,
  );

  const next = () => undefined;
  middleware.use({ ip: '127.0.0.1', path: '/api/auth/change-password' } as any, createResponse(), next);
  expectTooManyRequests(() => {
    middleware.use({ ip: '127.0.0.1', path: '/api/auth/change-password' } as any, createResponse(), next);
  });
}

runLoginLimit();
runBurstLimit();
console.log('login-rate-limit.spec: ok');
