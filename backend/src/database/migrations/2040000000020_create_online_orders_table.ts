import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Create online_orders table if not exists
    await db.schema
      .createTable('online_orders')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('order_number', 'varchar(64)', (col) => col.notNull())
      .addColumn('customer_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('customer_phone', 'varchar(64)', (col) => col.notNull())
      .addColumn('customer_address', 'text')
      .addColumn('customer_notes', 'text')
      .addColumn('items_json', 'text', (col) => col.defaultTo('[]').notNull())
      .addColumn('subtotal', 'numeric(15, 2)', (col) => col.defaultTo('0').notNull())
      .addColumn('delivery_fee', 'numeric(15, 2)', (col) => col.defaultTo('0').notNull())
      .addColumn('total_amount', 'numeric(15, 2)', (col) => col.defaultTo('0').notNull())
      .addColumn('status', 'varchar(32)', (col) => col.defaultTo('pending').notNull())
      .addColumn('payment_method', 'varchar(64)', (col) => col.defaultTo('cod').notNull())
      .addColumn('branch_id', 'integer')
      .addColumn('sale_id', 'integer')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 2. Composite performance indexes
    await db.schema
      .createIndex('idx_online_orders_tenant_status')
      .ifNotExists()
      .on('online_orders')
      .columns(['tenant_id', 'status'])
      .execute();

    await db.schema
      .createIndex('idx_online_orders_tenant_created')
      .ifNotExists()
      .on('online_orders')
      .columns(['tenant_id', 'created_at'])
      .execute();

    await db.schema
      .createIndex('idx_online_orders_tenant_order_no')
      .ifNotExists()
      .on('online_orders')
      .columns(['tenant_id', 'order_number'])
      .execute();

    await db.schema
      .createIndex('idx_online_orders_customer_phone')
      .ifNotExists()
      .on('online_orders')
      .columns(['tenant_id', 'customer_phone'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('online_orders').ifExists().execute();
  },
};
