import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Create warehouse_bins table
    await db.schema
      .createTable('warehouse_bins')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('location_id', 'integer', (col) => col.notNull()) // References stock_locations(id)
      .addColumn('code', 'varchar(60)', (col) => col.notNull()) // e.g. 'A1-R02-S3-B05'
      .addColumn('barcode', 'varchar(100)', (col) => col.notNull())
      .addColumn('aisle', 'varchar(50)') // الممر
      .addColumn('rack', 'varchar(50)') // الرف / الحامل
      .addColumn('shelf', 'varchar(50)') // المستوى
      .addColumn('bin', 'varchar(50)') // الصندوق / العين
      .addColumn('capacity', 'numeric(12, 2)')
      .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
      .addColumn('notes', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 2. Create product_bin_allocations table
    await db.schema
      .createTable('product_bin_allocations')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('bin_id', 'integer', (col) => col.notNull())
      .addColumn('product_id', 'integer', (col) => col.notNull())
      .addColumn('quantity', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('is_primary', 'boolean', (col) => col.defaultTo(false).notNull())
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 3. Alter products table to link current primary bin_id
    await db.schema
      .alterTable('products')
      .addColumn('primary_bin_id', 'integer')
      .execute()
      .catch(() => {});

    // 4. Create Indexes
    await db.schema
      .createIndex('idx_warehouse_bins_tenant_loc_code')
      .ifNotExists()
      .on('warehouse_bins')
      .columns(['tenant_id', 'location_id', 'code'])
      .execute();

    await db.schema
      .createIndex('idx_warehouse_bins_tenant_barcode')
      .ifNotExists()
      .on('warehouse_bins')
      .columns(['tenant_id', 'barcode'])
      .execute();

    await db.schema
      .createIndex('idx_product_bin_alloc_bin')
      .ifNotExists()
      .on('product_bin_allocations')
      .columns(['tenant_id', 'bin_id'])
      .execute();

    await db.schema
      .createIndex('idx_product_bin_alloc_product')
      .ifNotExists()
      .on('product_bin_allocations')
      .columns(['tenant_id', 'product_id'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('product_bin_allocations').ifExists().execute();
    await db.schema.dropTable('warehouse_bins').ifExists().execute();
  },
};
