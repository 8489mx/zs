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
    APP_MODE: 'CLOUD_SAAS',
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
    DATABASE_NAME: 'app',
    DATABASE_USER: 'user',
    DATABASE_PASSWORD: 'password',
    DATABASE_SSL: 'true',
    DATABASE_SSL_REJECT_UNAUTHORIZED: 'true',
    CORS_ORIGINS: 'https://app.example.com',
  };

  assert.throws(() => validateEnv(base), /SESSION_CSRF_SECRET must be explicitly configured in production/);
  assert.throws(
    () => validateEnv({ ...base, SESSION_CSRF_SECRET: 'local-dev-csrf-secret-replace-before-production' }),
    /SESSION_CSRF_SECRET must not use the local development fallback in production/,
  );
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
      APP_MODE: 'SELF_CONTAINED',
      DATABASE_HOST: 'db.example.com',
      SESSION_CSRF_SECRET: '1234567890123456',
    }),
    /DATABASE_HOST must be "postgres" when APP_MODE is LOCAL_PILOT or SELF_CONTAINED/,
  );

  assert.throws(
    () => validateEnv({
      ...base,
      DATABASE_SSL: 'false',
      TENANT_ID: 'tenant-a',
      ACCOUNT_ID: 'account-a',
      SESSION_CSRF_SECRET: '1234567890123456',
    }),
    /DATABASE_SSL and DATABASE_SSL_REJECT_UNAUTHORIZED must be true for CLOUD_SAAS production mode/,
  );

  assert.throws(
    () => validateEnv({
      ...base,
      CORS_ORIGINS: 'http://localhost:5173,https://app.example.com',
      TENANT_ID: 'tenant-a',
      ACCOUNT_ID: 'account-a',
      SESSION_CSRF_SECRET: '1234567890123456',
    }),
    /CORS_ORIGINS cannot include localhost, 127.0.0.1, or "\*" in CLOUD_SAAS production mode/,
  );

  assert.doesNotThrow(() => validateEnv({
    ...base,
    APP_MODE: 'CLOUD_SAAS',
    DATABASE_HOST: 'db.example.com',
    TENANT_ID: 'tenant-a',
    ACCOUNT_ID: 'account-a',
    SESSION_CSRF_SECRET: '1234567890123456',
  }));

  assert.throws(
    () => validateEnv({
      ...base,
      APP_MODE: 'CLOUD_SAAS',
      DATABASE_HOST: 'db.example.com',
      TENANT_ID: 'default',
      ACCOUNT_ID: 'account-a',
      SESSION_CSRF_SECRET: '1234567890123456',
    }),
    /TENANT_ID must be explicitly configured for CLOUD_SAAS production mode/,
  );

  assert.throws(
    () => validateEnv({
      ...base,
      APP_MODE: 'CLOUD_SAAS',
      DATABASE_HOST: 'db.example.com',
      TENANT_ID: 'tenant-a',
      ACCOUNT_ID: 'replace-me-account-id',
      SESSION_CSRF_SECRET: '1234567890123456',
    }),
    /ACCOUNT_ID must be explicitly configured for CLOUD_SAAS production mode/,
  );

  const devParsed = validateEnv({
    ...base,
    NODE_ENV: 'development',
    APP_MODE: 'online',
    DATABASE_HOST: 'db.example.com',
  });
  assert.equal(devParsed.SESSION_CSRF_SECRET, 'local-dev-csrf-secret-replace-before-production');
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
