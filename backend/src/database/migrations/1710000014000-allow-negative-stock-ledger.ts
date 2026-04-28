import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

export const migration = {
  up: async (db: Kysely<Database>): Promise<void> => {
    await sql`ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_products_stock_qty_non_negative`.execute(db);
    await sql`ALTER TABLE product_location_stock DROP CONSTRAINT IF EXISTS chk_product_location_stock_qty_non_negative`.execute(db);
  },
  down: async (db: Kysely<Database>): Promise<void> => {
    await sql`ALTER TABLE products ADD CONSTRAINT chk_products_stock_qty_non_negative CHECK (stock_qty >= 0)`.execute(db);
    await sql`ALTER TABLE product_location_stock ADD CONSTRAINT chk_product_location_stock_qty_non_negative CHECK (qty >= 0)`.execute(db);
  },
};
