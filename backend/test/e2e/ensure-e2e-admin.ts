import 'dotenv/config';
import assert from 'node:assert/strict';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { resolveDatabaseConfigFromEnv } from '../../src/database/migration-runner';
import { resolvePgSslConfig } from '../../src/database/ssl.util';
import type { Database } from '../../src/database/database.types';
import { createPasswordRecord } from '../../src/core/auth/utils/password-hasher';
import { assertStrongPassword } from '../../src/core/auth/utils/password-policy';
import { SUPER_ADMIN_PERMISSIONS } from '../../src/core/auth/constants/super-admin-permissions';

function toNonEmpty(value: string | undefined, fallback: string): string {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

async function main(): Promise<void> {
  const username = toNonEmpty(process.env.E2E_USERNAME, toNonEmpty(process.env.DEFAULT_ADMIN_USERNAME, 'owner'));
  const password = String(process.env.E2E_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || '');
  const tenantId = toNonEmpty(process.env.TENANT_ID, 'default');
  const accountId = toNonEmpty(process.env.ACCOUNT_ID, tenantId);

  assert.ok(username, 'E2E admin username is required');
  assert.ok(password, 'E2E admin password is required');
  assertStrongPassword(password);

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
    application_name: 'backend-e2e-seed',
  });

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  try {
    const passwordRecord = await createPasswordRecord(password);
    const existing = await db
      .selectFrom('users')
      .select(['id'])
      .where('username', '=', username)
      .limit(1)
      .executeTakeFirst();

    if (existing) {
      await db
        .updateTable('users')
        .set({
          password_hash: passwordRecord.hash,
          password_salt: passwordRecord.salt,
          role: 'super_admin',
          is_active: true,
          permissions_json: JSON.stringify(SUPER_ADMIN_PERMISSIONS),
          default_branch_id: null,
          display_name: 'E2E Administrator',
          failed_login_count: 0,
          locked_until: null,
          last_login_at: null,
          must_change_password: false,
          tenant_id: tenantId,
          account_id: accountId,
        })
        .where('id', '=', Number(existing.id))
        .execute();
    } else {
      await db
        .insertInto('users')
        .values({
          username,
          password_hash: passwordRecord.hash,
          password_salt: passwordRecord.salt,
          role: 'super_admin',
          is_active: true,
          permissions_json: JSON.stringify(SUPER_ADMIN_PERMISSIONS),
          default_branch_id: null,
          display_name: 'E2E Administrator',
          failed_login_count: 0,
          locked_until: null,
          last_login_at: null,
          must_change_password: false,
          tenant_id: tenantId,
          account_id: accountId,
        })
        .execute();
    }

    process.stdout.write(`E2E admin ensured: ${username}\n`);
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  const details = error instanceof Error ? error.stack || error.message : String(error);
  process.stderr.write(`E2E admin seed failed:\n${details}\n`);
  process.exit(1);
});
