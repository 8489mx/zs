import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // =========================================================================
    // Cashier shift variance resolution trail.
    // A variance figure with no recorded resolution is un-auditable: it cannot be
    // shown who absorbed a shortage, on which account, or under whose approval.
    // =========================================================================
    await sql`
      ALTER TABLE cashier_shifts
        ADD COLUMN IF NOT EXISTS variance_resolution TEXT NULL,
        ADD COLUMN IF NOT EXISTS variance_journal_entry_id BIGINT NULL,
        ADD COLUMN IF NOT EXISTS variance_charged_to_user_id BIGINT NULL,
        ADD COLUMN IF NOT EXISTS variance_approved_by BIGINT NULL,
        ADD COLUMN IF NOT EXISTS variance_approved_at TIMESTAMPTZ NULL;
    `.execute(db);

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cashier_shift_variance_resolution') THEN
          ALTER TABLE cashier_shifts
            ADD CONSTRAINT chk_cashier_shift_variance_resolution
            CHECK (variance_resolution IS NULL OR variance_resolution IN (
              'balanced', 'within_tolerance', 'charged_to_cashier', 'surplus_recognized'
            ));
        END IF;
      END $$;
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_cashier_shifts_variance_resolution
        ON cashier_shifts (tenant_id, variance_resolution)
        WHERE variance_resolution IS NOT NULL;
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_cashier_shifts_variance_resolution;`.execute(db);
    await sql`ALTER TABLE cashier_shifts DROP CONSTRAINT IF EXISTS chk_cashier_shift_variance_resolution;`.execute(db);
    await sql`
      ALTER TABLE cashier_shifts
        DROP COLUMN IF EXISTS variance_resolution,
        DROP COLUMN IF EXISTS variance_journal_entry_id,
        DROP COLUMN IF EXISTS variance_charged_to_user_id,
        DROP COLUMN IF EXISTS variance_approved_by,
        DROP COLUMN IF EXISTS variance_approved_at;
    `.execute(db);
  },
};
