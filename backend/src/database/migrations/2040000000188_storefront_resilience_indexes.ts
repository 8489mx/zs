import { Kysely, sql } from 'kysely';

/**
 * Migration 188: Storefront resilience indexes.
 *
 * 1. Composite index on `storefront_abandoned_carts(tenant_id, customer_phone, recovered)`
 *    to eliminate full-table scans when recovering abandoned carts on checkout.
 * 2. Composite partial index on `online_orders(tenant_id, stock_reserved, stock_reserved_at)`
 *    WHERE stock_reserved = TRUE to accelerate the automated reservation reaper.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await db.schema
      .createIndex('idx_abandoned_carts_tenant_phone_rec')
      .ifNotExists()
      .on('storefront_abandoned_carts')
      .columns(['tenant_id', 'customer_phone', 'recovered'])
      .execute();

    await sql`
      CREATE INDEX IF NOT EXISTS idx_online_orders_reaper
      ON online_orders(tenant_id, stock_reserved_at)
      WHERE stock_reserved = TRUE AND status = 'pending';
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`DROP INDEX IF EXISTS idx_online_orders_reaper;`.execute(db);
    await db.schema.dropIndex('idx_abandoned_carts_tenant_phone_rec').ifExists().execute();
  },
};
