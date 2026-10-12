import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Create restaurant_manager_comps table (VIP on-the-house & management comp tracking)
  await db.schema
    .createTable('restaurant_manager_comps')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('branch_id', 'integer')
    .addColumn('sale_id', 'bigint')
    .addColumn('table_number', 'text')
    .addColumn('comp_type', 'text', (col) => col.notNull().defaultTo('vip_guest')) // 'vip_guest', 'customer_complaint', 'staff_meal', 'promotional_tasting'
    .addColumn('manager_name', 'text', (col) => col.notNull())
    .addColumn('amount', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('items_summary', 'text')
    .addColumn('notes', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_rest_comps_tenant_date')
    .ifNotExists()
    .on('restaurant_manager_comps')
    .columns(['tenant_id', 'created_at'])
    .execute();

  // 2. Create restaurant_table_ratings table (Table QR Post-Payment Rating & Rescue Alert)
  await db.schema
    .createTable('restaurant_table_ratings')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('branch_id', 'integer')
    .addColumn('table_number', 'text', (col) => col.notNull())
    .addColumn('sale_id', 'bigint')
    .addColumn('rating', 'integer', (col) => col.notNull()) // 1 to 5 stars
    .addColumn('feedback_category', 'text', (col) => col.defaultTo('food_quality')) // 'food_quality', 'service_speed', 'cleanliness', 'ambience'
    .addColumn('notes', 'text')
    .addColumn('is_rescued', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('rescued_by', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_rest_ratings_tenant_table')
    .ifNotExists()
    .on('restaurant_table_ratings')
    .columns(['tenant_id', 'table_number', 'created_at'])
    .execute();

  // 3. Add prep_time_minutes to products table for Kitchen Pacing & Staggered Cooking
  await sql`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS prep_time_minutes integer DEFAULT 10;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE products DROP COLUMN IF EXISTS prep_time_minutes;
  `.execute(db);
  await db.schema.dropTable('restaurant_table_ratings').ifExists().execute();
  await db.schema.dropTable('restaurant_manager_comps').ifExists().execute();
}
