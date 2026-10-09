import { Kysely, sql } from 'kysely';

/**
 * Migration 2040000000206: Manufacturing Unbuild Orders Updated At
 *
 * Adds updated_at timestamp column to manufacturing_unbuild_orders table.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE manufacturing_unbuild_orders
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE manufacturing_unbuild_orders
    DROP COLUMN IF EXISTS updated_at;
  `.execute(db);
}
