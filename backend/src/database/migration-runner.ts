import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Kysely, Migrator, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from './database.types';
import { FileMigrationProvider } from './migration-provider';
import { validateEnv } from '../config/env.schema';
import { resolvePgSslConfig } from './ssl.util';

export type MigrationCommand = 'up' | 'down' | 'list';

function getMigrationsPath(): string {
  const builtPath = join(__dirname, 'migrations');
  if (existsSync(builtPath)) return builtPath;
  return join(__dirname, '..', '..', 'src', 'database', 'migrations');
}

type ResolvedDbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
  schema: string;
  ssl: boolean;
  sslRejectUnauthorized: boolean;
  sslCaCert: string;
  sslMode: 'existing' | 'disable' | 'require' | 'no-verify';
};

function readSslCaCertFromEnv(): string {
  const base64Cert = process.env.DATABASE_SSL_CA_CERT_B64?.trim();
  if (base64Cert) {
    return Buffer.from(base64Cert, 'base64').toString('utf8');
  }
  return process.env.DATABASE_SSL_CA_CERT ?? '';
}

function normalizeSslMode(value: unknown): 'disable' | 'require' | 'no-verify' | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'disable' || normalized === 'require' || normalized === 'no-verify') return normalized;
  throw new Error(`Unsupported database SSL mode: ${String(value)}`);
}

function hasExplicitEnv(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(process.env, key);
}

export function resolveMigrationSslModeFromEnv(): 'existing' | 'disable' | 'require' | 'no-verify' {
  const explicitMode = normalizeSslMode(process.env.DATABASE_SSL_MODE ?? process.env.PGSSLMODE);
  if (explicitMode) return explicitMode;

  const explicitRejectUnauthorizedFalse =
    hasExplicitEnv('DATABASE_SSL_REJECT_UNAUTHORIZED')
    && String(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || '').trim().toLowerCase() === 'false';
  const explicitSslTrue =
    String(process.env.DATABASE_SSL ?? process.env.DB_SSL ?? '').trim().toLowerCase() === 'true';
  const explicitSslFalse =
    hasExplicitEnv('DATABASE_SSL')
    && String(process.env.DATABASE_SSL || '').trim().toLowerCase() === 'false';

  if (explicitSslTrue && explicitRejectUnauthorizedFalse) return 'no-verify';
  if (explicitSslTrue) return 'require';
  if (explicitSslFalse) return 'disable';
  return 'existing';
}

export function resolveDatabaseConfigFromEnv(): ResolvedDbConfig {
  const sslMode = resolveMigrationSslModeFromEnv();
  const validationEnv = { ...process.env } as Record<string, unknown>;
  if (sslMode === 'require' || sslMode === 'no-verify') {
    validationEnv.DATABASE_SSL = 'true';
  }
  if (sslMode === 'disable') {
    validationEnv.DATABASE_SSL = 'false';
  }
  // The migration runner may intentionally use no-verify for hosted poolers with
  // self-signed chains; keep app-runtime validation strict while overriding only
  // the migration pg connection config below.
  if (sslMode === 'no-verify') {
    validationEnv.DATABASE_SSL_REJECT_UNAUTHORIZED = 'true';
  }

  const parsed = validateEnv(validationEnv);
  const ssl =
    sslMode === 'require' || sslMode === 'no-verify'
      ? true
      : sslMode === 'disable'
        ? false
        : parsed.DATABASE_SSL;
  const sslRejectUnauthorized = sslMode === 'no-verify'
    ? false
    : sslMode === 'require'
      ? true
      : parsed.DATABASE_SSL_REJECT_UNAUTHORIZED;

  return {
    host: parsed.DATABASE_HOST,
    port: parsed.DATABASE_PORT,
    user: parsed.DATABASE_USER,
    password: parsed.DATABASE_PASSWORD,
    name: parsed.DATABASE_NAME,
    schema: parsed.DATABASE_SCHEMA,
    ssl,
    sslRejectUnauthorized,
    sslCaCert: readSslCaCertFromEnv(),
    sslMode,
  };
}

export function getSanitizedDatabaseTargetFromResolved(config: Pick<ResolvedDbConfig, 'host' | 'port' | 'user' | 'name'>): string {
  return `postgres://${config.user}@${config.host}:${String(config.port)}/${config.name}`;
}

export function formatErrorDetails(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const details: string[] = [];
  details.push(`message: ${error.message}`);
  if (error.stack) details.push(`stack: ${error.stack}`);
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause !== undefined) details.push(`cause: ${formatErrorDetails(cause)}`);
  return details.join('\n');
}

export function getSanitizedDatabaseTarget(): string {
  const config = resolveDatabaseConfigFromEnv();
  return getSanitizedDatabaseTargetFromResolved(config);
}

function createDb(): Kysely<Database> {
  const config = resolveDatabaseConfigFromEnv();
  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.name,
    ssl: resolvePgSslConfig({
      enabled: config.ssl,
      rejectUnauthorized: config.sslRejectUnauthorized,
      caCert: config.sslCaCert,
    }),
    application_name: 'backend-migrations',
  });

  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
}

export async function runMigrationCommand(command: MigrationCommand): Promise<void> {
  const db = createDb();
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider(getMigrationsPath()),
    migrationTableSchema: process.env.DATABASE_SCHEMA ?? 'public',
  });

  if (command === 'list') {
    const migrations = await migrator.getMigrations();
    migrations.forEach((migration) => {
      process.stdout.write(`${migration.name}: ${migration.executedAt ? 'applied' : 'pending'}\n`);
    });
    await db.destroy();
    return;
  }

  const result = command === 'down' ? await migrator.migrateDown() : await migrator.migrateToLatest();

  for (const migration of result.results ?? []) {
    process.stdout.write(`${migration.status}: ${migration.migrationName}\n`);
  }

  if (result.error) {
    await db.destroy();
    throw result.error;
  }

  await db.destroy();
}
