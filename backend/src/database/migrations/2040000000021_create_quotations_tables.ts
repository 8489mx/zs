import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Create quotations table
    await db.schema
      .createTable('quotations')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('quotation_number', 'varchar(60)', (col) => col.notNull())
      .addColumn('customer_id', 'integer')
      .addColumn('customer_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('customer_phone', 'varchar(50)')
      .addColumn('customer_address', 'text')
      .addColumn('branch_id', 'integer')
      .addColumn('subtotal', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('discount_amount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('tax_amount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('total_amount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('valid_until', 'date')
      .addColumn('status', 'varchar(50)', (col) => col.defaultTo('draft').notNull())
      .addColumn('sale_id', 'integer')
      .addColumn('notes', 'text')
      .addColumn('terms_conditions', 'text')
      .addColumn('created_by', 'integer')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 2. Create quotation_items table
    await db.schema
      .createTable('quotation_items')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('quotation_id', 'integer', (col) => col.notNull())
      .addColumn('product_id', 'integer', (col) => col.notNull())
      .addColumn('product_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('unit_name', 'varchar(50)')
      .addColumn('quantity', 'numeric(14, 3)', (col) => col.defaultTo('1').notNull())
      .addColumn('unit_price', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('discount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('total', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('notes', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 3. Composite Indexes
    await db.schema
      .createIndex('idx_quotations_tenant_number')
      .ifNotExists()
      .on('quotations')
      .columns(['tenant_id', 'quotation_number'])
      .execute();

    await db.schema
      .createIndex('idx_quotations_tenant_status')
      .ifNotExists()
      .on('quotations')
      .columns(['tenant_id', 'status'])
      .execute();

    await db.schema
      .createIndex('idx_quotation_items_quotation')
      .ifNotExists()
      .on('quotation_items')
      .columns(['tenant_id', 'quotation_id'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('quotation_items').ifExists().execute();
    await db.schema.dropTable('quotations').ifExists().execute();
  },
};
