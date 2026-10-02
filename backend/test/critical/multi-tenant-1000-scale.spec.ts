import 'dotenv/config';
import { strict as assert } from 'node:assert';
import { performance } from 'node:perf_hooks';
import { Pool, type PoolClient } from 'pg';
import { resolveDatabaseConfigFromEnv } from '../../src/database/migration-runner';
import { resolvePgSslConfig } from '../../src/database/ssl.util';

/**
 * Explicit staging-only shared-database contention smoke:
 * SCALE_TEST_ALLOW_DB=1 npx ts-node test/critical/multi-tenant-1000-scale.spec.ts
 *
 * Requires a migrated PostgreSQL database with sales belonging to at least ten tenants. Runs
 * 1,000 bounded real-table reads through a 20-connection pool and overlapping advisory locks
 * acquired in canonical order. It never writes business rows. This detects cross-tenant result
 * contamination, deadlocks, connection starvation and unexpectedly slow indexed reads; it does
 * not replace checkout/transfer write-path load tests.
 */
const TABLES = ['sales', 'stock_movements', 'journal_entries', 'audit_logs'] as const;
const WORKERS = 20;
const ROUNDS_PER_WORKER = 50;
const MAX_OPERATION_MS = 10_000;

async function oneOperation(pool: Pool, tenantId: string, tenantSlot: number, table: typeof TABLES[number]): Promise<number> {
  const client: PoolClient = await pool.connect();
  const started = performance.now();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '5000ms'");
    await client.query("SET LOCAL lock_timeout = '5000ms'");
    // Two overlapping lock keys model multi-row contention without touching production data.
    // All workers acquire them in ascending order, regardless of tenant scheduling.
    const lockSlots = [tenantSlot, (tenantSlot + 1) % 10].sort((a, b) => a - b);
    for (const slot of lockSlots) {
      await client.query('SELECT pg_advisory_xact_lock(918271, $1)', [slot]);
    }
    const result = await client.query<{ tenant_id: string }>(
      `SELECT tenant_id FROM ${table} WHERE tenant_id = $1 ORDER BY id DESC LIMIT 10`,
      [tenantId],
    );
    assert.ok(result.rows.length <= 10, `${table} exceeded the response bound`);
    for (const row of result.rows) assert.equal(row.tenant_id, tenantId, `${table} returned another tenant's row`);
    await client.query('ROLLBACK');
    const elapsed = performance.now() - started;
    assert.ok(elapsed < MAX_OPERATION_MS, `${table} for ${tenantId} took ${Math.round(elapsed)} ms`);
    return elapsed;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  if (process.env.SCALE_TEST_ALLOW_DB !== '1') {
    throw new Error('Set SCALE_TEST_ALLOW_DB=1 and point DATABASE_* at a disposable, migrated staging database');
  }
  const config = resolveDatabaseConfigFromEnv();
  const pool = new Pool({
    host: config.host, port: config.port, user: config.user, password: config.password,
    database: config.name,
    ssl: resolvePgSslConfig({ enabled: config.ssl, rejectUnauthorized: config.sslRejectUnauthorized, caCert: config.sslCaCert }),
    max: WORKERS, connectionTimeoutMillis: 5000, statement_timeout: 5000,
    application_name: 'multi-tenant-1000-scale-spec',
  });
  try {
    const fixtures = await pool.query<{ id: string }>(`
      SELECT t.id FROM tenants AS t
      WHERE EXISTS (SELECT 1 FROM sales AS s WHERE s.tenant_id = t.id)
      ORDER BY t.id LIMIT 10
    `);
    assert.equal(fixtures.rows.length, 10, 'Staging database needs ten tenants with at least one sale each');
    const tenantIds = fixtures.rows.map((row) => String(row.id));
    const samples = await Promise.all(Array.from({ length: WORKERS }, async (_, worker) => {
      const times: number[] = [];
      for (let iteration = 0; iteration < ROUNDS_PER_WORKER; iteration += 1) {
        const round = worker * ROUNDS_PER_WORKER + iteration;
        const tenantSlot = round % tenantIds.length;
        const table = TABLES[Math.floor(round / tenantIds.length) % TABLES.length];
        times.push(await oneOperation(pool, tenantIds[tenantSlot], tenantSlot, table));
      }
      return times;
    }));
    const times = samples.flat();
    assert.equal(times.length, 1000);
    const sorted = [...times].sort((a, b) => a - b);
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
    assert.ok(p95 < MAX_OPERATION_MS, `P95 ${Math.round(p95)} ms exceeded the limit`);
    process.stdout.write(`1000 tenant-scoped operations, 10 tenants, 20 workers: p95=${Math.round(p95)}ms, max=${Math.round(sorted.at(-1) || 0)}ms; no deadlocks or cross-tenant rows\n`);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === '40P01') throw new Error('Deadlock detected (SQLSTATE 40P01)', { cause: error });
    throw error;
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
