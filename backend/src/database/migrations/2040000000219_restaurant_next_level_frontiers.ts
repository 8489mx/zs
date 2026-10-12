import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Create restaurant_drive_thru_orders table for drive-thru lanes & speed of service timer
  await db.schema
    .createTable('restaurant_drive_thru_orders')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('branch_id', 'integer')
    .addColumn('vehicle_plate', 'text', (col) => col.notNull())
    .addColumn('vehicle_desc', 'text') // e.g. 'أبيض - كيا سيراتو'
    .addColumn('sale_id', 'bigint')
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('order_taken')) // 'order_taken', 'at_window', 'completed', 'cancelled'
    .addColumn('order_time', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('window_arrival_time', 'timestamptz')
    .addColumn('completed_time', 'timestamptz')
    .addColumn('sos_seconds', 'integer') // Speed of Service duration in seconds
    .addColumn('total_amount', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('notes', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_rest_drive_thru_tenant_status')
    .ifNotExists()
    .on('restaurant_drive_thru_orders')
    .columns(['tenant_id', 'status', 'created_at'])
    .execute();

  // 2. Add minimum_spend to restaurant_table_zones for VIP and minimum consumption enforcement
  await sql`
    ALTER TABLE restaurant_table_zones
      ADD COLUMN IF NOT EXISTS minimum_spend numeric(12, 2) DEFAULT 0;
  `.execute(db);

  // 3. Add shelf_life_hours and storage_temp to restaurant_prep_sheet_items for Day-Dot food safety
  await sql`
    ALTER TABLE restaurant_prep_sheet_items
      ADD COLUMN IF NOT EXISTS shelf_life_hours integer DEFAULT 48,
      ADD COLUMN IF NOT EXISTS storage_temp text DEFAULT '4°C';
  `.execute(db);

  // 4. Create restaurant_upsell_rules table for automated smart upselling and cross-selling
  await db.schema
    .createTable('restaurant_upsell_rules')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('trigger_product_id', 'bigint')
    .addColumn('trigger_category_name', 'text')
    .addColumn('suggested_product_id', 'bigint', (col) => col.notNull())
    .addColumn('suggested_product_name', 'text', (col) => col.notNull())
    .addColumn('title', 'text', (col) => col.notNull()) // e.g. 'إضافة بطاطس مقلية ومشروب غازي'
    .addColumn('discount_amount', 'numeric(10, 2)', (col) => col.notNull().defaultTo(0))
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_rest_upsell_tenant_trigger')
    .ifNotExists()
    .on('restaurant_upsell_rules')
    .columns(['tenant_id', 'trigger_product_id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('restaurant_upsell_rules').ifExists().execute();
  await sql`
    ALTER TABLE restaurant_prep_sheet_items
      DROP COLUMN IF EXISTS shelf_life_hours,
      DROP COLUMN IF EXISTS storage_temp;
    ALTER TABLE restaurant_table_zones
      DROP COLUMN IF EXISTS minimum_spend;
  `.execute(db);
  await db.schema.dropTable('restaurant_drive_thru_orders').ifExists().execute();
}
