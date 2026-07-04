import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

export const migration = {
  up: async (db: Kysely<Database>): Promise<void> => {
    await sql`
      ALTER TABLE purchase_items ADD COLUMN category_id BIGINT NULL REFERENCES product_categories(id) ON DELETE SET NULL;
      ALTER TABLE purchase_items ADD COLUMN location_id BIGINT NULL REFERENCES stock_locations(id) ON DELETE SET NULL;
    `.execute(db);
  },
  down: async (db: Kysely<Database>): Promise<void> => {
    await sql`
      ALTER TABLE purchase_items DROP COLUMN location_id;
      ALTER TABLE purchase_items DROP COLUMN category_id;
    `.execute(db);
  }
};
