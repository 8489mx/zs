import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      ALTER TABLE contracting_projects
      ADD COLUMN IF NOT EXISTS loss_reason TEXT NULL,
      ADD COLUMN IF NOT EXISTS loss_notes TEXT NULL,
      ADD COLUMN IF NOT EXISTS competitor_price NUMERIC(15, 3) NULL,
      ADD COLUMN IF NOT EXISTS revision_number INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS original_tender_id BIGINT NULL REFERENCES contracting_projects(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS consultant_name TEXT NULL,
      ADD COLUMN IF NOT EXISTS contract_ref TEXT NULL,
      ADD COLUMN IF NOT EXISTS contract_date DATE NULL;
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_contracting_projects_tender_pipeline
      ON contracting_projects (tenant_id, status, revision_number);
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`
      ALTER TABLE contracting_projects
      DROP COLUMN IF EXISTS loss_reason,
      DROP COLUMN IF EXISTS loss_notes,
      DROP COLUMN IF EXISTS competitor_price,
      DROP COLUMN IF EXISTS revision_number,
      DROP COLUMN IF EXISTS original_tender_id,
      DROP COLUMN IF EXISTS submitted_at,
      DROP COLUMN IF EXISTS awarded_at,
      DROP COLUMN IF EXISTS consultant_name,
      DROP COLUMN IF EXISTS contract_ref,
      DROP COLUMN IF EXISTS contract_date;
    `.execute(db);
  },
};
