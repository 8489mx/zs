import { z } from 'zod';
import { mapLegacyAppMode, type AppMode } from './app-mode';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_MODE: z.enum(['LOCAL_PILOT', 'SELF_CONTAINED', 'CLOUD_SAAS']).default('CLOUD_SAAS'),
  APP_PORT: z.coerce.number().int().positive().default(3001),
  APP_HOST: z.string().min(1).default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive(),
  DATABASE_NAME: z.string().min(1),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_SCHEMA: z.string().min(1).default('public'),
  DATABASE_SSL: booleanString,
  DATABASE_SSL_REJECT_UNAUTHORIZED: booleanString,
  DATABASE_LOGGING: booleanString,
  ENABLE_BOOTSTRAP_ADMIN: booleanString,
  LICENSE_MODE: z.enum(['desktop', 'server']).default('desktop'),
  ACTIVATION_ENFORCED: booleanString,
  ACTIVATION_PUBLIC_KEY: z.string().default(''),
  ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION: booleanString,
  DEFAULT_ADMIN_USERNAME: z.string().trim().default(''),
  DEFAULT_ADMIN_PASSWORD: z.string().default(''),
  SESSION_COOKIE_SECURE: booleanString,
  SESSION_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  SESSION_CSRF_SECRET: z.string().min(16),
  ALLOW_SESSION_ID_HEADER: booleanString,
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(120).default(15),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(3).max(1000).default(10),
  LOGIN_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(30).max(86400).default(600),
  AUTH_BURST_RATE_LIMIT_MAX: z.coerce.number().int().min(10).max(5000).default(60),
  AUTH_BURST_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(10).max(3600).default(60),
  BUSINESS_TIMEZONE: z.string().default('UTC'),
  TENANT_ID: z.string().trim().default('default'),
  ACCOUNT_ID: z.string().trim().default('default'),
});

export type AppEnv = z.infer<typeof envSchema>;

function normalizeAppMode(value: unknown): AppMode {
  return mapLegacyAppMode(String(value || 'CLOUD_SAAS') as any);
}

function isLocalDatabaseHost(host: string): boolean {
  return ['postgres', 'localhost', '127.0.0.1', '::1'].includes(host.trim().toLowerCase());
}

function hasUnsafeCorsOrigin(corsOrigins: string): boolean {
  return corsOrigins
    .split(',')
    .map((origin) => origin.trim().toLowerCase())
    .filter(Boolean)
    .some((origin) => origin === '*' || origin.includes('localhost') || origin.includes('127.0.0.1'));
}

function isPlaceholderTenant(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !normalized || ['default', 'replace-me', 'replace-me-tenant-id'].includes(normalized);
}

function isPlaceholderAccount(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !normalized || ['default', 'replace-me', 'replace-me-account-id'].includes(normalized);
}

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const hasExplicitCsrfSecret = typeof config.SESSION_CSRF_SECRET === 'string' && config.SESSION_CSRF_SECRET.trim().length >= 16;
  const appMode = normalizeAppMode(config.APP_MODE);

  const raw = {
    ...config,
    APP_MODE: appMode,
    DATABASE_HOST: config.DATABASE_HOST ?? config.DB_HOST,
    DATABASE_PORT: config.DATABASE_PORT ?? config.DB_PORT ?? config.PGPORT,
    DATABASE_NAME: config.DATABASE_NAME ?? config.DB_NAME,
    DATABASE_USER: config.DATABASE_USER ?? config.DB_USER,
    DATABASE_PASSWORD: config.DATABASE_PASSWORD ?? config.DB_PASSWORD,
    DATABASE_SSL: config.DATABASE_SSL ?? config.DB_SSL ?? 'false',
    DATABASE_SSL_REJECT_UNAUTHORIZED: config.DATABASE_SSL_REJECT_UNAUTHORIZED ?? 'false',
    ENABLE_BOOTSTRAP_ADMIN: config.ENABLE_BOOTSTRAP_ADMIN ?? 'false',
    LICENSE_MODE: config.LICENSE_MODE ?? 'desktop',
    ACTIVATION_ENFORCED: config.ACTIVATION_ENFORCED ?? 'false',
    ACTIVATION_PUBLIC_KEY: config.ACTIVATION_PUBLIC_KEY ?? '',
    ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION: config.ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION ?? 'false',
    SESSION_COOKIE_SECURE:
      config.SESSION_COOKIE_SECURE
      ?? ((config.NODE_ENV as string | undefined) === 'production' ? 'true' : 'false'),
    SESSION_COOKIE_SAME_SITE:
      config.SESSION_COOKIE_SAME_SITE
      ?? ((config.NODE_ENV as string | undefined) === 'production' ? 'strict' : 'lax'),
    SESSION_CSRF_SECRET:
      config.SESSION_CSRF_SECRET
      ?? `${String(config.DATABASE_PASSWORD ?? config.DB_PASSWORD ?? 'local-dev-csrf-secret')}:csrf:v1`,
    ALLOW_SESSION_ID_HEADER: config.ALLOW_SESSION_ID_HEADER ?? 'false',
    BUSINESS_TIMEZONE: config.BUSINESS_TIMEZONE ?? 'UTC',
    TENANT_ID: config.TENANT_ID ?? 'default',
    ACCOUNT_ID: config.ACCOUNT_ID ?? 'default',
  };

  const parsed = envSchema.parse(raw);

  if (parsed.NODE_ENV === 'production' && !hasExplicitCsrfSecret) {
    throw new Error('SESSION_CSRF_SECRET must be explicitly configured in production');
  }

  if (parsed.NODE_ENV === 'production' && parsed.ALLOW_SESSION_ID_HEADER) {
    throw new Error('ALLOW_SESSION_ID_HEADER must remain disabled in production');
  }

  if (parsed.SESSION_COOKIE_SAME_SITE === 'none' && !parsed.SESSION_COOKIE_SECURE) {
    throw new Error('SESSION_COOKIE_SECURE must be true when SESSION_COOKIE_SAME_SITE is none');
  }

  if ((parsed.APP_MODE === 'LOCAL_PILOT' || parsed.APP_MODE === 'SELF_CONTAINED') && !isLocalDatabaseHost(parsed.DATABASE_HOST)) {
    throw new Error('DATABASE_HOST must be local-only when APP_MODE is LOCAL_PILOT or SELF_CONTAINED');
  }

  if (parsed.NODE_ENV === 'production' && parsed.APP_MODE === 'CLOUD_SAAS') {
    if (!parsed.DATABASE_SSL || !parsed.DATABASE_SSL_REJECT_UNAUTHORIZED) {
      throw new Error('DATABASE_SSL and DATABASE_SSL_REJECT_UNAUTHORIZED must be true for CLOUD_SAAS production mode');
    }

    if (hasUnsafeCorsOrigin(parsed.CORS_ORIGINS)) {
      throw new Error('CORS_ORIGINS cannot include localhost, 127.0.0.1, or "*" in CLOUD_SAAS production mode');
    }

    if (isPlaceholderTenant(parsed.TENANT_ID)) {
      throw new Error('TENANT_ID must be explicitly configured for CLOUD_SAAS production mode');
    }

    if (isPlaceholderAccount(parsed.ACCOUNT_ID)) {
      throw new Error('ACCOUNT_ID must be explicitly configured for CLOUD_SAAS production mode');
    }
  }

  return parsed;
}
