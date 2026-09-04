import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Create product_reviews table
    await db.schema
      .createTable('product_reviews')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('product_id', 'integer', (col) => col.notNull())
      .addColumn('rating', 'smallint', (col) => col.notNull())
      .addColumn('customer_name', 'varchar(255)')
      .addColumn('customer_phone', 'varchar(64)')
      .addColumn('comment', 'text')
      .addColumn('is_approved', 'boolean', (col) => col.defaultTo(true).notNull())
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 2. Performance indexes
    await db.schema
      .createIndex('idx_product_reviews_tenant_product')
      .ifNotExists()
      .on('product_reviews')
      .columns(['tenant_id', 'product_id'])
      .execute();

    await db.schema
      .createIndex('idx_product_reviews_tenant_created')
      .ifNotExists()
      .on('product_reviews')
      .columns(['tenant_id', 'created_at'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('product_reviews').ifExists().execute();
  },
};
