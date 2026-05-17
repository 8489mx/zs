import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

export const migration = {
  up: async (db: Kysely<Database>): Promise<void> => {
    await sql`
      ALTER TABLE hr_employee_assets
      ADD COLUMN IF NOT EXISTS custody_kind VARCHAR(16) NOT NULL DEFAULT 'physical'
    `.execute(db);

    await sql`
      ALTER TABLE hr_employee_assets
      ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0
    `.execute(db);

    await sql`
      ALTER TABLE hr_employee_assets
      ADD COLUMN IF NOT EXISTS spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0
    `.execute(db);

    await sql`
      ALTER TABLE hr_employee_assets
      ADD COLUMN IF NOT EXISTS returned_amount NUMERIC(12,2) NOT NULL DEFAULT 0
    `.execute(db);

    await sql`
      ALTER TABLE hr_employee_assets
      ADD COLUMN IF NOT EXISTS settled_at DATE NULL
    `.execute(db);

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_hr_employee_assets_custody_kind'
        ) THEN
          ALTER TABLE hr_employee_assets
          ADD CONSTRAINT chk_hr_employee_assets_custody_kind
          CHECK (custody_kind IN ('physical', 'cash'));
        END IF;
      END $$
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_hr_employee_assets_custody_kind
      ON hr_employee_assets(custody_kind)
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_hr_employee_assets_status
      ON hr_employee_assets(status)
    `.execute(db);
  },
};
