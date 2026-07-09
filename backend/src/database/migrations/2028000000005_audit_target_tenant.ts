import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_tenant_id TEXT NULL`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_target_tenant_id ON audit_logs(target_tenant_id)`.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`ALTER TABLE audit_logs DROP COLUMN IF EXISTS target_tenant_id`.execute(db);
  },
};
