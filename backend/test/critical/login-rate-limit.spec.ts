import { strict as assert } from 'node:assert';
import { HttpException, HttpStatus } from '@nestjs/common';
import { LoginRateLimitMiddleware } from '../../src/common/middleware/login-rate-limit.middleware';
import { AuthBurstRateLimitMiddleware } from '../../src/common/middleware/auth-burst-rate-limit.middleware';
import { InMemoryRateLimitService } from '../../src/common/security/in-memory-rate-limit.service';
import { validateEnv } from '../../src/config/env.schema';

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

async function expectTooManyRequests(fn: () => Promise<void>): Promise<void> {
  let thrown: unknown;
  try {
    await fn();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof HttpException, 'Expected HttpException');
  assert.equal((thrown as HttpException).getStatus(), HttpStatus.TOO_MANY_REQUESTS);
}

async function runLoginLimit(): Promise<void> {
  const service = new InMemoryRateLimitService();
  const middleware = new LoginRateLimitMiddleware(
    new FakeConfigService({ LOGIN_RATE_LIMIT_MAX: 2, LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60 }) as any,
    service,
  );

  const next = () => undefined;
  await middleware.use({ ip: '127.0.0.1', body: { username: 'admin' } } as any, createResponse(), next);
  await middleware.use({ ip: '127.0.0.1', body: { username: 'admin' } } as any, createResponse(), next);
  await expectTooManyRequests(async () => {
    await middleware.use({ ip: '127.0.0.1', body: { username: 'admin' } } as any, createResponse(), next);
  });
}

async function runBurstLimit(): Promise<void> {
  const service = new InMemoryRateLimitService();
  const middleware = new AuthBurstRateLimitMiddleware(
    new FakeConfigService({ AUTH_BURST_RATE_LIMIT_MAX: 1, AUTH_BURST_RATE_LIMIT_WINDOW_SECONDS: 60 }) as any,
    service,
  );

  const next = () => undefined;
  await middleware.use({ ip: '127.0.0.1', path: '/api/auth/change-password' } as any, createResponse(), next);
  await expectTooManyRequests(async () => {
    await middleware.use({ ip: '127.0.0.1', path: '/api/auth/change-password' } as any, createResponse(), next);
  });
}

async function runProductionRateLimitStoreGuard(): Promise<void> {
  const service = new InMemoryRateLimitService(
    undefined,
    new FakeConfigService({ NODE_ENV: 'production' }) as any,
  );

  await assert.rejects(
    async () => service.hit('auth:login:ip:127.0.0.1', 5, 60),
    /Persistent rate limit store is required in production/,
  );
}

function runEnvGuards(): void {
  const base = {
    NODE_ENV: 'production',
    APP_MODE: 'online',
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
    DATABASE_NAME: 'app',
    DATABASE_USER: 'user',
    DATABASE_PASSWORD: 'password',
  };

  assert.throws(() => validateEnv(base), /SESSION_CSRF_SECRET must be explicitly configured in production/);
  assert.throws(
    () => validateEnv({ ...base, SESSION_CSRF_SECRET: '1234567890123456', ALLOW_SESSION_ID_HEADER: 'true' }),
    /ALLOW_SESSION_ID_HEADER must remain disabled in production/,
  );
  assert.throws(
    () => validateEnv({
      ...base,
      SESSION_CSRF_SECRET: '1234567890123456',
      SESSION_COOKIE_SECURE: 'false',
      SESSION_COOKIE_SAME_SITE: 'none',
    }),
    /SESSION_COOKIE_SECURE must be true when SESSION_COOKIE_SAME_SITE is none/,
  );

  assert.throws(
    () => validateEnv({
      ...base,
      APP_MODE: 'offline',
      DATABASE_HOST: 'db.example.com',
      SESSION_CSRF_SECRET: '1234567890123456',
    }),
    /DATABASE_HOST must be "postgres" when APP_MODE=offline/,
  );

  assert.doesNotThrow(() => validateEnv({
    ...base,
    APP_MODE: 'online',
    DATABASE_HOST: 'db.example.com',
    SESSION_CSRF_SECRET: '1234567890123456',
  }));
}

async function main(): Promise<void> {
  await runLoginLimit();
  await runBurstLimit();
  await runProductionRateLimitStoreGuard();
  runEnvGuards();
  console.log('login-rate-limit.spec: ok');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
