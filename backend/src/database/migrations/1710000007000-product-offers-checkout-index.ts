import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

export const migration = {
  up: async (db: Kysely<Database>): Promise<void> => {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_product_offers_checkout_active_window
      ON product_offers(product_id, start_date, end_date)
      WHERE is_active = true
    `.execute(db);
  },
  down: async (db: Kysely<Database>): Promise<void> => {
    await sql`DROP INDEX IF EXISTS idx_product_offers_checkout_active_window`.execute(db);
  },
};
