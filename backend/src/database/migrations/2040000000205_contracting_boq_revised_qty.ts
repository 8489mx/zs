import { Kysely, Migration, sql } from 'kysely';

/**
 * Migration 2040000000205: Contracting BOQ Items Revised Quantity
 *
 * Ensures revised_qty column exists on contracting_boq_items
 * to track engineering variations, scope changes, and contract adjustments.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE contracting_boq_items
    ADD COLUMN IF NOT EXISTS revised_qty NUMERIC(15, 3) NOT NULL DEFAULT 0;
  `.execute(db);

  await sql`
    UPDATE contracting_boq_items
    SET revised_qty = contract_qty
    WHERE revised_qty = 0 AND contract_qty > 0;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE contracting_boq_items
    DROP COLUMN IF EXISTS revised_qty;
  `.execute(db);
}

export const migration: Migration = {
  up,
  down,
};

export default migration;
