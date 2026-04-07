import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_PORT: z.coerce.number().int().positive().default(3001),
  APP_HOST: z.string().min(1).default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive().default(5432),
  DATABASE_NAME: z.string().min(1),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_SCHEMA: z.string().min(1).default('public'),
  DATABASE_SSL: booleanString,
  DATABASE_LOGGING: booleanString,
  ENABLE_BOOTSTRAP_ADMIN: booleanString,
  DEFAULT_ADMIN_USERNAME: z.string().min(1).default('admin'),
  DEFAULT_ADMIN_PASSWORD: z.string().min(12).default('ChangeMe123!'),
  SESSION_COOKIE_SECURE: booleanString,
  SESSION_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(120).default(15),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const raw = {
    ...config,
    ENABLE_BOOTSTRAP_ADMIN:
      config.ENABLE_BOOTSTRAP_ADMIN
      ?? ((config.NODE_ENV as string | undefined) === 'production' ? 'false' : 'true'),
    SESSION_COOKIE_SECURE:
      config.SESSION_COOKIE_SECURE
      ?? ((config.NODE_ENV as string | undefined) === 'production' ? 'true' : 'false'),
    SESSION_COOKIE_SAME_SITE:
      config.SESSION_COOKIE_SAME_SITE
      ?? ((config.NODE_ENV as string | undefined) === 'production' ? 'strict' : 'lax'),
  };

  return envSchema.parse(raw);
}
