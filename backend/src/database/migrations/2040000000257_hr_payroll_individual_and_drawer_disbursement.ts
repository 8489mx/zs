import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

/**
 * Migration 2040000000257:
 * 1. Allow 'partially_paid' status and 'drawer' payment channel in hr_payroll_runs.
 * 2. Allow 'paid' status in hr_payroll_run_items so individual employees can be disbursed.
 * 3. Add payment audit columns (paid_at, paid_by, payment_channel, payment_reference, shift_id, journal_entry_id) to hr_payroll_run_items.
 */
export async function up(db: Kysely<Database>): Promise<void> {
  // 1. Update hr_payroll_runs status check to support 'partially_paid'
  await sql`
    ALTER TABLE hr_payroll_runs DROP CONSTRAINT IF EXISTS hr_payroll_runs_status_check;
    ALTER TABLE hr_payroll_runs DROP CONSTRAINT IF EXISTS hr_payroll_runs_status_valid;
    ALTER TABLE hr_payroll_runs ADD CONSTRAINT hr_payroll_runs_status_check
      CHECK (status IN ('draft', 'reviewed', 'approved', 'partially_paid', 'paid', 'cancelled'));
  `.execute(db);

  // 2. Update hr_payroll_runs payment channel check to support 'drawer'
  await sql`
    ALTER TABLE hr_payroll_runs DROP CONSTRAINT IF EXISTS hr_payroll_runs_payment_channel_check;
    ALTER TABLE hr_payroll_runs ADD CONSTRAINT hr_payroll_runs_payment_channel_check
      CHECK (payment_channel IS NULL OR payment_channel IN ('cash', 'bank', 'drawer'));
  `.execute(db);

  // 3. Update hr_payroll_run_items status check to support 'paid'
  await sql`
    ALTER TABLE hr_payroll_run_items DROP CONSTRAINT IF EXISTS hr_payroll_run_items_status_valid;
    ALTER TABLE hr_payroll_run_items ADD CONSTRAINT hr_payroll_run_items_status_valid
      CHECK (status IN ('draft', 'reviewed', 'approved', 'paid', 'excluded'));
  `.execute(db);

  // 4. Add individual payment tracking columns to hr_payroll_run_items
  await sql`
    ALTER TABLE hr_payroll_run_items
      ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS paid_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS payment_channel TEXT NULL,
      ADD COLUMN IF NOT EXISTS payment_reference TEXT NULL,
      ADD COLUMN IF NOT EXISTS shift_id BIGINT NULL REFERENCES cashier_shifts(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS journal_entry_id BIGINT NULL REFERENCES journal_entries(id) ON DELETE SET NULL;
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_hr_payroll_run_items_paid_status
      ON hr_payroll_run_items (tenant_id, run_id, status);
  `.execute(db);
}

export async function down(db: Kysely<Database>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS idx_hr_payroll_run_items_paid_status;
    ALTER TABLE hr_payroll_run_items DROP COLUMN IF EXISTS journal_entry_id;
    ALTER TABLE hr_payroll_run_items DROP COLUMN IF EXISTS shift_id;
    ALTER TABLE hr_payroll_run_items DROP COLUMN IF EXISTS payment_reference;
    ALTER TABLE hr_payroll_run_items DROP COLUMN IF EXISTS payment_channel;
    ALTER TABLE hr_payroll_run_items DROP COLUMN IF EXISTS paid_by;
    ALTER TABLE hr_payroll_run_items DROP COLUMN IF EXISTS paid_at;
  `.execute(db);
}
