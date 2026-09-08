import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Create price_lists table
    await db.schema
      .createTable('price_lists')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('name', 'varchar(255)', (col) => col.notNull())
      .addColumn('code', 'varchar(60)', (col) => col.notNull())
      .addColumn('currency', 'varchar(10)', (col) => col.defaultTo('EGP').notNull())
      .addColumn('type', 'varchar(50)', (col) => col.defaultTo('percentage').notNull())
      .addColumn('default_discount_percent', 'numeric(8, 2)', (col) => col.defaultTo('0').notNull())
      .addColumn('is_default', 'boolean', (col) => col.defaultTo(false).notNull())
      .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
      .addColumn('notes', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 2. Create price_list_items table (Specific product / category rules + Volume Tiers)
    await db.schema
      .createTable('price_list_items')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('price_list_id', 'integer', (col) => col.notNull())
      .addColumn('product_id', 'integer')
      .addColumn('product_name', 'varchar(255)')
      .addColumn('category_id', 'integer')
      .addColumn('min_quantity', 'numeric(14, 3)', (col) => col.defaultTo('1').notNull())
      .addColumn('fixed_price', 'numeric(14, 3)')
      .addColumn('discount_percent', 'numeric(8, 2)')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 3. Alter customers table to associate with a price_list
    await db.schema
      .alterTable('customers')
      .addColumn('price_list_id', 'integer')
      .execute()
      .catch(() => {
        // Column may already exist
      });

    // 4. Create Indexes
    await db.schema
      .createIndex('idx_price_lists_tenant_code')
      .ifNotExists()
      .on('price_lists')
      .columns(['tenant_id', 'code'])
      .execute();

    await db.schema
      .createIndex('idx_price_list_items_list')
      .ifNotExists()
      .on('price_list_items')
      .columns(['tenant_id', 'price_list_id'])
      .execute();

    await db.schema
      .createIndex('idx_price_list_items_product')
      .ifNotExists()
      .on('price_list_items')
      .columns(['tenant_id', 'product_id'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('price_list_items').ifExists().execute();
    await db.schema.dropTable('price_lists').ifExists().execute();
    await db.schema
      .alterTable('customers')
      .dropColumn('price_list_id')
      .execute()
      .catch(() => {});
  },
};
