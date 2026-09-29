import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000170: Vendor Duplicate Bill Detection & Governance
 *
 * Adds vendor invoice reference tracking and fraud/duplicate protection columns to the purchases table:
 * - supplier_invoice_no: The supplier's physical/original invoice or bill number.
 * - duplicate_override_reason: Maker-checker documented justification when an admin overrides a duplicate warning.
 * - duplicate_overridden_by: Admin user ID who authorized the override.
 *
 * Indexes are added to guarantee fast sub-millisecond lookup for fraud/duplicate checks.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`
      ALTER TABLE purchases
      ADD COLUMN IF NOT EXISTS supplier_invoice_no VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS duplicate_override_reason TEXT NULL,
      ADD COLUMN IF NOT EXISTS duplicate_overridden_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_purchases_supplier_invoice_lookup
      ON purchases (tenant_id, supplier_id, supplier_invoice_no)
      WHERE supplier_invoice_no IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_purchases_supplier_amount_date_lookup
      ON purchases (tenant_id, supplier_id, total, created_at);
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`
      DROP INDEX IF EXISTS idx_purchases_supplier_amount_date_lookup;
      DROP INDEX IF EXISTS idx_purchases_supplier_invoice_lookup;

      ALTER TABLE purchases
      DROP COLUMN IF EXISTS duplicate_overridden_by,
      DROP COLUMN IF EXISTS duplicate_override_reason,
      DROP COLUMN IF EXISTS supplier_invoice_no;
    `.execute(db);
  },
};
