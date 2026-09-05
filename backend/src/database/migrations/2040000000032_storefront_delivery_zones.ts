import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Create storefront_delivery_zones table
    await db.schema
      .createTable('storefront_delivery_zones')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('name', 'varchar(255)', (col) => col.notNull())
      .addColumn('delivery_fee', 'numeric(15, 2)', (col) => col.defaultTo('0').notNull())
      .addColumn('estimated_time', 'varchar(128)')
      .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
      .addColumn('sort_order', 'integer', (col) => col.defaultTo(0).notNull())
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // Index
    await db.schema
      .createIndex('idx_delivery_zones_tenant_active')
      .ifNotExists()
      .on('storefront_delivery_zones')
      .columns(['tenant_id', 'is_active'])
      .execute();

    // 2. Add delivery zone columns to online_orders
    await sql`ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_zone_id INTEGER`.execute(db);
    await sql`ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_zone_name VARCHAR(255)`.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`ALTER TABLE online_orders DROP COLUMN IF EXISTS delivery_zone_name`.execute(db);
    await sql`ALTER TABLE online_orders DROP COLUMN IF EXISTS delivery_zone_id`.execute(db);
    await db.schema.dropTable('storefront_delivery_zones').ifExists().execute();
  },
};
