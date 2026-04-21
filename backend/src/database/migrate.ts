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

function getEnvValue(primaryKey: string, fallbackKey: string, defaultValue?: string): string | undefined {
  const primary = process.env[primaryKey];
  if (primary !== undefined && primary !== '') {
    return primary;
  }

  const fallback = process.env[fallbackKey];
  if (fallback !== undefined && fallback !== '') {
    return fallback;
  }

  return defaultValue;
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
        host: getEnvValue('DATABASE_HOST', 'DB_HOST'),
        port: Number(getEnvValue('DATABASE_PORT', 'DB_PORT', '5432')),
        user: getEnvValue('DATABASE_USER', 'DB_USER'),
        password: getEnvValue('DATABASE_PASSWORD', 'DB_PASSWORD'),
        database: getEnvValue('DATABASE_NAME', 'DB_NAME'),
        ssl: getEnvValue('DATABASE_SSL', 'DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
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
