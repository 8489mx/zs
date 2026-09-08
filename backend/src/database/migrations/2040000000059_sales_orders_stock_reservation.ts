import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Add reserved_qty column to products if not exists
    await sql`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS reserved_qty NUMERIC(15, 4) NOT NULL DEFAULT 0;
    `.execute(db);

    // 2. Create sales_orders table
    await db.schema
      .createTable('sales_orders')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('order_number', 'varchar(60)', (col) => col.notNull())
      .addColumn('customer_id', 'integer')
      .addColumn('customer_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('customer_phone', 'varchar(50)')
      .addColumn('customer_address', 'text')
      .addColumn('branch_id', 'integer')
      .addColumn('subtotal', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('discount_amount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('tax_amount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('total_amount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('status', 'varchar(50)', (col) => col.defaultTo('draft').notNull())
      .addColumn('reservation_expires_at', 'timestamptz')
      .addColumn('delivery_date', 'date')
      .addColumn('sale_id', 'integer')
      .addColumn('quotation_id', 'integer')
      .addColumn('notes', 'text')
      .addColumn('terms_conditions', 'text')
      .addColumn('created_by', 'integer')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 3. Create sales_order_items table
    await db.schema
      .createTable('sales_order_items')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('sales_order_id', 'integer', (col) => col.notNull())
      .addColumn('product_id', 'integer', (col) => col.notNull())
      .addColumn('product_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('unit_name', 'varchar(50)')
      .addColumn('quantity', 'numeric(14, 3)', (col) => col.defaultTo('1').notNull())
      .addColumn('reserved_quantity', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('delivered_quantity', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('unit_price', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('discount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('total', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('notes', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 4. Indexes
    await db.schema
      .createIndex('idx_sales_orders_tenant_number')
      .ifNotExists()
      .on('sales_orders')
      .columns(['tenant_id', 'order_number'])
      .execute();

    await db.schema
      .createIndex('idx_sales_orders_tenant_status')
      .ifNotExists()
      .on('sales_orders')
      .columns(['tenant_id', 'status'])
      .execute();

    await db.schema
      .createIndex('idx_sales_orders_tenant_customer')
      .ifNotExists()
      .on('sales_orders')
      .columns(['tenant_id', 'customer_id'])
      .execute();

    await db.schema
      .createIndex('idx_sales_order_items_order')
      .ifNotExists()
      .on('sales_order_items')
      .columns(['sales_order_id'])
      .execute();

    await db.schema
      .createIndex('idx_sales_order_items_product')
      .ifNotExists()
      .on('sales_order_items')
      .columns(['product_id'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('sales_order_items').ifExists().execute();
    await db.schema.dropTable('sales_orders').ifExists().execute();
    await sql`ALTER TABLE products DROP COLUMN IF EXISTS reserved_qty;`.execute(db);
  },
};
