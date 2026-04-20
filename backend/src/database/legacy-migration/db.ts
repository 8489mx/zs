import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../database.types';
import { resolvePgSslConfig, toBoolean } from '../ssl.util';

export function openLegacyDb(): DatabaseSync {
  const configured = process.env.OLD_DB_FILE?.trim();
  const fallback = join(process.cwd(), '..', 'data', 'zstore.db');
  const filePath = configured ? resolve(process.cwd(), configured) : fallback;
  if (!existsSync(filePath)) {
    throw new Error(`Legacy database file not found: ${filePath}`);
  }
  return new DatabaseSync(filePath, { readOnly: true });
}

export function openNewDb(): Kysely<Database> {
  const sslEnabled = toBoolean(process.env.DATABASE_SSL, false);
  const sslRejectUnauthorized = toBoolean(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED, true);
  const sslCaCert = process.env.DATABASE_SSL_CA_CERT ?? '';

  return new Kysely<Database>({
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
}

export async function syncIdSequence(db: Kysely<Database>, tableName: string): Promise<void> {
  await sql`
    SELECT setval(
      pg_get_serial_sequence(${tableName}, 'id'),
      COALESCE((SELECT MAX(id) FROM ${sql.id(tableName)}), 0),
      true
    )
  `.execute(db);
}
