import { Kysely, sql } from 'kysely';

/** Physical stock counts must retain exact serial identities and batch amounts. */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE stock_count_items
      ADD COLUMN IF NOT EXISTS counted_serials JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS batch_counts JSONB NOT NULL DEFAULT '[]'::jsonb;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE stock_count_items
      DROP COLUMN IF EXISTS batch_counts,
      DROP COLUMN IF EXISTS counted_serials;
  `.execute(db);
}
