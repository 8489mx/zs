import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Create pos_modifier_groups table
    await db.schema
      .createTable('pos_modifier_groups')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('name', 'varchar(255)', (col) => col.notNull()) // e.g. 'درجة الطهي' or 'إضافات مدفوعة'
      .addColumn('name_en', 'varchar(255)')
      .addColumn('selection_type', 'varchar(50)', (col) => col.defaultTo('multiple').notNull()) // 'single' | 'multiple'
      .addColumn('is_mandatory', 'boolean', (col) => col.defaultTo(false).notNull())
      .addColumn('min_selections', 'integer', (col) => col.defaultTo(0).notNull())
      .addColumn('max_selections', 'integer', (col) => col.defaultTo(10).notNull())
      .addColumn('display_order', 'integer', (col) => col.defaultTo(0).notNull())
      .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 2. Create pos_modifier_options table
    await db.schema
      .createTable('pos_modifier_options')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('group_id', 'integer', (col) => col.notNull())
      .addColumn('name', 'varchar(255)', (col) => col.notNull()) // e.g. 'جبنة إضافية' or 'ويل دن'
      .addColumn('name_en', 'varchar(255)')
      .addColumn('price', 'numeric(14, 2)', (col) => col.defaultTo(0).notNull())
      .addColumn('cost_price', 'numeric(14, 2)', (col) => col.defaultTo(0).notNull())
      .addColumn('is_default', 'boolean', (col) => col.defaultTo(false).notNull())
      .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
      .addColumn('display_order', 'integer', (col) => col.defaultTo(0).notNull())
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 3. Create product_pos_modifiers table (junction table)
    await db.schema
      .createTable('product_pos_modifiers')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('product_id', 'integer', (col) => col.notNull())
      .addColumn('modifier_group_id', 'integer', (col) => col.notNull())
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 4. Create Indexes
    await db.schema
      .createIndex('idx_pos_mod_groups_tenant')
      .ifNotExists()
      .on('pos_modifier_groups')
      .columns(['tenant_id', 'is_active'])
      .execute();

    await db.schema
      .createIndex('idx_pos_mod_options_group')
      .ifNotExists()
      .on('pos_modifier_options')
      .columns(['tenant_id', 'group_id'])
      .execute();

    await db.schema
      .createIndex('idx_product_pos_mod_prod')
      .ifNotExists()
      .on('product_pos_modifiers')
      .columns(['tenant_id', 'product_id'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('product_pos_modifiers').ifExists().execute();
    await db.schema.dropTable('pos_modifier_options').ifExists().execute();
    await db.schema.dropTable('pos_modifier_groups').ifExists().execute();
  },
};
