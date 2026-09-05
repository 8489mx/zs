import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Create storefront_coupons table
    await db.schema
      .createTable('storefront_coupons')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('code', 'varchar(64)', (col) => col.notNull())
      .addColumn('discount_type', 'varchar(32)', (col) => col.notNull()) // 'percentage' | 'fixed' | 'free_shipping'
      .addColumn('discount_value', 'numeric(12, 2)', (col) => col.defaultTo('0').notNull())
      .addColumn('min_order_amount', 'numeric(12, 2)', (col) => col.defaultTo('0').notNull())
      .addColumn('max_discount_amount', 'numeric(12, 2)')
      .addColumn('usage_limit', 'integer')
      .addColumn('times_used', 'integer', (col) => col.defaultTo(0).notNull())
      .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
      .addColumn('start_date', 'timestamptz')
      .addColumn('end_date', 'timestamptz')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 2. Indexes for fast lookup
    await db.schema
      .createIndex('idx_storefront_coupons_tenant_code')
      .ifNotExists()
      .on('storefront_coupons')
      .columns(['tenant_id', 'code'])
      .execute();

    await db.schema
      .createIndex('idx_storefront_coupons_tenant_active')
      .ifNotExists()
      .on('storefront_coupons')
      .columns(['tenant_id', 'is_active'])
      .execute();

    // 3. Add coupon_code and discount_amount to online_orders table
    await db.schema
      .alterTable('online_orders')
      .addColumn('coupon_code', 'varchar(64)')
      .execute()
      .catch(() => {
        // column may already exist
      });

    await db.schema
      .alterTable('online_orders')
      .addColumn('discount_amount', 'numeric(12, 2)', (col) => col.defaultTo('0').notNull())
      .execute()
      .catch(() => {
        // column may already exist
      });
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('storefront_coupons').ifExists().execute();
    await db.schema
      .alterTable('online_orders')
      .dropColumn('coupon_code')
      .execute()
      .catch(() => undefined);
    await db.schema
      .alterTable('online_orders')
      .dropColumn('discount_amount')
      .execute()
      .catch(() => undefined);
  },
};
