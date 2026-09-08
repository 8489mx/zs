import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Create purchase_orders table
    await db.schema
      .createTable('purchase_orders')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('order_number', 'varchar(60)', (col) => col.notNull())
      .addColumn('supplier_id', 'integer')
      .addColumn('supplier_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('supplier_phone', 'varchar(50)')
      .addColumn('warehouse_id', 'integer')
      .addColumn('warehouse_name', 'varchar(255)')
      .addColumn('subtotal', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('tax_amount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('discount_amount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('total_amount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('status', 'varchar(50)', (col) => col.defaultTo('draft').notNull())
      .addColumn('expected_delivery_date', 'date')
      .addColumn('converted_purchase_id', 'integer')
      .addColumn('notes', 'text')
      .addColumn('terms_conditions', 'text')
      .addColumn('created_by', 'integer')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 2. Create purchase_order_items table
    await db.schema
      .createTable('purchase_order_items')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('purchase_order_id', 'integer', (col) => col.notNull())
      .addColumn('product_id', 'integer', (col) => col.notNull())
      .addColumn('product_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('unit_name', 'varchar(50)')
      .addColumn('quantity', 'numeric(14, 3)', (col) => col.defaultTo('1').notNull())
      .addColumn('received_quantity', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('unit_cost', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('tax_rate', 'numeric(8, 2)', (col) => col.defaultTo('0').notNull())
      .addColumn('discount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('total', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('notes', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 3. Create manufacturing_unbuild_orders table
    await db.schema
      .createTable('manufacturing_unbuild_orders')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('unbuild_number', 'varchar(60)', (col) => col.notNull())
      .addColumn('product_id', 'integer', (col) => col.notNull())
      .addColumn('product_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('bom_id', 'integer', (col) => col.notNull())
      .addColumn('quantity', 'numeric(14, 3)', (col) => col.defaultTo('1').notNull())
      .addColumn('warehouse_id', 'integer', (col) => col.notNull())
      .addColumn('status', 'varchar(50)', (col) => col.defaultTo('completed').notNull())
      .addColumn('total_cost', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('notes', 'text')
      .addColumn('created_by', 'integer')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 4. Create Indexes
    await db.schema
      .createIndex('idx_purchase_orders_tenant_number')
      .ifNotExists()
      .on('purchase_orders')
      .columns(['tenant_id', 'order_number'])
      .execute();

    await db.schema
      .createIndex('idx_purchase_orders_tenant_status')
      .ifNotExists()
      .on('purchase_orders')
      .columns(['tenant_id', 'status'])
      .execute();

    await db.schema
      .createIndex('idx_purchase_orders_tenant_supplier')
      .ifNotExists()
      .on('purchase_orders')
      .columns(['tenant_id', 'supplier_id'])
      .execute();

    await db.schema
      .createIndex('idx_purchase_order_items_order')
      .ifNotExists()
      .on('purchase_order_items')
      .columns(['purchase_order_id'])
      .execute();

    await db.schema
      .createIndex('idx_unbuild_orders_tenant')
      .ifNotExists()
      .on('manufacturing_unbuild_orders')
      .columns(['tenant_id', 'product_id'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('manufacturing_unbuild_orders').ifExists().execute();
    await db.schema.dropTable('purchase_order_items').ifExists().execute();
    await db.schema.dropTable('purchase_orders').ifExists().execute();
  },
};
