import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Create purchase_rfqs table
    await db.schema
      .createTable('purchase_rfqs')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('rfq_number', 'varchar(60)', (col) => col.notNull())
      .addColumn('title', 'varchar(255)', (col) => col.notNull())
      .addColumn('status', 'varchar(50)', (col) => col.defaultTo('draft').notNull())
      .addColumn('deadline_date', 'date')
      .addColumn('expected_delivery_date', 'date')
      .addColumn('winning_supplier_id', 'integer')
      .addColumn('winning_supplier_name', 'varchar(255)')
      .addColumn('converted_po_id', 'integer')
      .addColumn('notes', 'text')
      .addColumn('created_by', 'integer')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 2. Create purchase_rfq_items table
    await db.schema
      .createTable('purchase_rfq_items')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('rfq_id', 'integer', (col) => col.notNull())
      .addColumn('product_id', 'integer', (col) => col.notNull())
      .addColumn('product_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('unit_name', 'varchar(50)')
      .addColumn('target_quantity', 'numeric(14, 3)', (col) => col.defaultTo('1').notNull())
      .addColumn('specifications', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 3. Create purchase_rfq_vendor_bids table (Offers from multiple suppliers)
    await db.schema
      .createTable('purchase_rfq_vendor_bids')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('rfq_id', 'integer', (col) => col.notNull())
      .addColumn('rfq_item_id', 'integer', (col) => col.notNull())
      .addColumn('supplier_id', 'integer', (col) => col.notNull())
      .addColumn('supplier_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('supplier_phone', 'varchar(50)')
      .addColumn('quoted_unit_cost', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('tax_rate', 'numeric(8, 2)', (col) => col.defaultTo('0').notNull())
      .addColumn('delivery_lead_days', 'integer', (col) => col.defaultTo(0).notNull())
      .addColumn('payment_terms', 'varchar(100)')
      .addColumn('is_winner', 'boolean', (col) => col.defaultTo(false).notNull())
      .addColumn('notes', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 4. Create Indexes
    await db.schema
      .createIndex('idx_purchase_rfqs_tenant_number')
      .ifNotExists()
      .on('purchase_rfqs')
      .columns(['tenant_id', 'rfq_number'])
      .execute();

    await db.schema
      .createIndex('idx_purchase_rfqs_tenant_status')
      .ifNotExists()
      .on('purchase_rfqs')
      .columns(['tenant_id', 'status'])
      .execute();

    await db.schema
      .createIndex('idx_purchase_rfq_items_rfq')
      .ifNotExists()
      .on('purchase_rfq_items')
      .columns(['tenant_id', 'rfq_id'])
      .execute();

    await db.schema
      .createIndex('idx_purchase_rfq_bids_rfq')
      .ifNotExists()
      .on('purchase_rfq_vendor_bids')
      .columns(['tenant_id', 'rfq_id'])
      .execute();

    await db.schema
      .createIndex('idx_purchase_rfq_bids_supplier')
      .ifNotExists()
      .on('purchase_rfq_vendor_bids')
      .columns(['tenant_id', 'supplier_id'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('purchase_rfq_vendor_bids').ifExists().execute();
    await db.schema.dropTable('purchase_rfq_items').ifExists().execute();
    await db.schema.dropTable('purchase_rfqs').ifExists().execute();
  },
};
