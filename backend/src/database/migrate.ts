import 'dotenv/config';
import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Kysely, Migrator, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from './database.types';
import { FileMigrationProvider } from './migration-provider';
import { resolvePgSslConfig, toBoolean } from './ssl.util';

function getMigrationsPath(): string {
  const distPath = join(process.cwd(), 'dist', 'database', 'migrations');
  if (existsSync(distPath)) {
    return distPath;
  }

  return join(process.cwd(), 'src', 'database', 'migrations');
}

async function run(): Promise<void> {
  const command = process.argv[2] ?? 'up';
  const sslEnabled = toBoolean(process.env.DATABASE_SSL, false);
  const sslRejectUnauthorized = toBoolean(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED, true);
  const sslCaCert = process.env.DATABASE_SSL_CA_CERT ?? '';

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT ?? '5432'),
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        ssl: resolvePgSslConfig({
          enabled: sslEnabled,
          rejectUnauthorized: sslRejectUnauthorized,
          caCert: sslCaCert,
        }),
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
    const message =
      result.error instanceof Error ? result.error.message : String(result.error);
    process.stderr.write(`Migration failed: ${message}\n`);
    await db.destroy();
    process.exit(1);
  }

  await db.destroy();
}

run().catch((error: unknown) => {
  process.stderr.write(`Migration command failed: ${String(error)}\n`);
  process.exit(1);
});
