import { Kysely, sql } from 'kysely';

/**
 * Preserve original foreign units without mixing currencies in the common
 * supplier subledger (whose amount and balance fields are denominated in EGP).
 * Legacy foreign transfers are deliberately left NULL for manual reconciliation.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE supplier_payments
      ADD COLUMN IF NOT EXISTS amount_foreign NUMERIC(15, 4);
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE supplier_payments DROP COLUMN IF EXISTS amount_foreign;
  `.execute(db);
}
