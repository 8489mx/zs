import 'dotenv/config';
import { Client } from 'pg';
import { resolvePgSslConfig, toBoolean } from './ssl.util';

async function main(): Promise<void> {
  const ssl = resolvePgSslConfig({
    enabled: toBoolean(process.env.DATABASE_SSL, true),
    rejectUnauthorized: toBoolean(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED, true),
    caCert: process.env.DATABASE_SSL_CA_CERT ?? '',
  });

  const connectTimeoutMs = Number(process.env.DATABASE_CONNECT_TIMEOUT_MS ?? '10000');
  const connectionString = process.env.DATABASE_URL?.trim() || undefined;

  const client = new Client({
    connectionString,
    host: connectionString ? undefined : process.env.DATABASE_HOST,
    port: connectionString ? undefined : Number(process.env.DATABASE_PORT ?? '5432'),
    user: connectionString ? undefined : process.env.DATABASE_USER,
    password: connectionString ? undefined : process.env.DATABASE_PASSWORD,
    database: connectionString ? undefined : process.env.DATABASE_NAME,
    ssl,
    connectionTimeoutMillis: connectTimeoutMs,
  });

  await client.connect();
  await client.query('select 1');
  await client.end();

  process.stdout.write(
    `[db-check] PASS: hosted DB connection established (connectTimeoutMs=${connectTimeoutMs}, via=${connectionString ? 'DATABASE_URL' : 'split-vars'}).\n`,
  );
}

main().catch(async (error: unknown) => {
  process.stderr.write(`[db-check] FAIL: ${String(error)}\n`);
  process.exit(1);
});
