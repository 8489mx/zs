import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // Add pipeline fields to maritime_rfqs
    await sql`
      ALTER TABLE maritime_rfqs
      ADD COLUMN IF NOT EXISTS urgency_level TEXT NOT NULL DEFAULT 'standard',
      ADD COLUMN IF NOT EXISTS cut_off_deadline TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS auto_awarded BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS target_rate_max NUMERIC(12, 2) NULL;
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_maritime_rfqs_cut_off
      ON maritime_rfqs (tenant_id, status, cut_off_deadline)
      WHERE status IN ('sent', 'bids_received');
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_maritime_rfqs_cut_off;`.execute(db);
    await sql`ALTER TABLE maritime_rfqs DROP COLUMN IF EXISTS target_rate_max;`.execute(db);
    await sql`ALTER TABLE maritime_rfqs DROP COLUMN IF EXISTS auto_awarded;`.execute(db);
    await sql`ALTER TABLE maritime_rfqs DROP COLUMN IF EXISTS cut_off_deadline;`.execute(db);
    await sql`ALTER TABLE maritime_rfqs DROP COLUMN IF EXISTS urgency_level;`.execute(db);
  },
};
