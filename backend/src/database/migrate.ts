import 'dotenv/config';
import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Kysely, Migrator, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from './database.types';
import { FileMigrationProvider } from './migration-provider';

function getMigrationsPath(): string {
  const distPath = join(process.cwd(), 'dist', 'database', 'migrations');
  if (existsSync(distPath)) {
    return distPath;
  }

  return join(process.cwd(), 'src', 'database', 'migrations');
}

function getEnvValue(keys: string[], defaultValue?: string): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== '') {
      return value;
    }
  }

  return defaultValue;
}

function getRequiredEnvValue(keys: string[]): string {
  const value = getEnvValue(keys);
  if (value === undefined) {
    throw new Error(`Missing required database environment variable. Checked keys: ${keys.join(', ')}`);
  }

  return value;
}

function getRequiredPort(): number {
  const raw = getRequiredEnvValue(['DATABASE_PORT', 'DB_PORT', 'PGPORT']);
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid database port value: ${raw}`);
  }

  return port;
}

function formatErrorDetails(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const details: string[] = [];
  details.push(`message: ${error.message}`);

  if (error.stack) {
    details.push(`stack: ${error.stack}`);
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause !== undefined) {
    details.push(`cause: ${formatErrorDetails(cause)}`);
  }

  return details.join('\n');
}

async function run(): Promise<void> {
  const command = process.argv[2] ?? 'up';
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: getRequiredEnvValue(['DATABASE_HOST', 'DB_HOST']),
        port: getRequiredPort(),
        user: getRequiredEnvValue(['DATABASE_USER', 'DB_USER']),
        password: getRequiredEnvValue(['DATABASE_PASSWORD', 'DB_PASSWORD']),
        database: getRequiredEnvValue(['DATABASE_NAME', 'DB_NAME']),
        ssl: getEnvValue(['DATABASE_SSL', 'DB_SSL'], 'false') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
  });

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

  const result = command === 'down'
    ? await migrator.migrateDown()
    : await migrator.migrateToLatest();

  for (const migration of result.results ?? []) {
    process.stdout.write(`${migration.status}: ${migration.migrationName}\n`);
  }

  if (result.error) {
    process.stderr.write(`Migration failed:\n${formatErrorDetails(result.error)}\n`);
    await db.destroy();
    process.exit(1);
  }

  await db.destroy();
}

run().catch((error: unknown) => {
  process.stderr.write(`Migration command failed:\n${formatErrorDetails(error)}\n`);
  process.exit(1);
});
