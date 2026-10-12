import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Create restaurant_table_layouts table for visual floor plan canvas & table geometry designer
  await db.schema
    .createTable('restaurant_table_layouts')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('branch_id', 'integer')
    .addColumn('table_number', 'text', (col) => col.notNull())
    .addColumn('zone_code', 'text', (col) => col.defaultTo('main'))
    .addColumn('shape', 'text', (col) => col.notNull().defaultTo('square')) // 'square', 'round', 'rectangle', 'booth'
    .addColumn('x_pos', 'numeric(6, 2)', (col) => col.notNull().defaultTo(10))
    .addColumn('y_pos', 'numeric(6, 2)', (col) => col.notNull().defaultTo(10))
    .addColumn('width', 'numeric(6, 2)', (col) => col.defaultTo(80))
    .addColumn('height', 'numeric(6, 2)', (col) => col.defaultTo(80))
    .addColumn('seats', 'integer', (col) => col.notNull().defaultTo(4))
    .addColumn('rotation', 'integer', (col) => col.defaultTo(0))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_table_layouts_tenant_branch')
    .ifNotExists()
    .on('restaurant_table_layouts')
    .columns(['tenant_id', 'branch_id', 'table_number'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('restaurant_table_layouts').ifExists().execute();
}
