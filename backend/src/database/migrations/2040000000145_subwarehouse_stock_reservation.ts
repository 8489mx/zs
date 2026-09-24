import { Kysely, sql } from 'kysely';

/**
 * Migration 2040000000145: Sub-warehouse stock reservation for Online Orders and Multi-Branch Sales (O7).
 *
 * 1. Adds `reserved_qty` to `product_location_stock` with non-negative check constraint.
 * 2. Adds `stock_reserved`, `reserved_branch_id`, `reserved_location_id`, and `stock_reserved_at` to `online_orders`.
 * 3. Creates partial indexes to optimize available stock lookups and reserved order queries.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Add reserved_qty to product_location_stock
    await sql`
      ALTER TABLE product_location_stock
      ADD COLUMN IF NOT EXISTS reserved_qty NUMERIC(15, 4) NOT NULL DEFAULT 0;
    `.execute(db);

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_location_stock_reserved_non_negative'
        ) THEN
          ALTER TABLE product_location_stock
          ADD CONSTRAINT chk_product_location_stock_reserved_non_negative
          CHECK (reserved_qty >= 0);
        END IF;
      END $$;
    `.execute(db);

    // 2. Add reservation columns to online_orders
    await sql`
      ALTER TABLE online_orders
      ADD COLUMN IF NOT EXISTS stock_reserved BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS reserved_branch_id INTEGER,
      ADD COLUMN IF NOT EXISTS reserved_location_id INTEGER,
      ADD COLUMN IF NOT EXISTS stock_reserved_at TIMESTAMPTZ;
    `.execute(db);

    // 3. Performance & lookup indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_pls_tenant_prod_loc_reserved
      ON product_location_stock(tenant_id, product_id, location_id, reserved_qty);
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_online_orders_stock_reserved
      ON online_orders(tenant_id, stock_reserved)
      WHERE stock_reserved = TRUE;
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`DROP INDEX IF EXISTS idx_online_orders_stock_reserved;`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_pls_tenant_prod_loc_reserved;`.execute(db);

    await sql`
      ALTER TABLE online_orders
      DROP COLUMN IF EXISTS stock_reserved_at,
      DROP COLUMN IF EXISTS reserved_location_id,
      DROP COLUMN IF EXISTS reserved_branch_id,
      DROP COLUMN IF EXISTS stock_reserved;
    `.execute(db);

    await sql`
      ALTER TABLE product_location_stock
      DROP CONSTRAINT IF EXISTS chk_product_location_stock_reserved_non_negative,
      DROP COLUMN IF EXISTS reserved_qty;
    `.execute(db);
  },
};
