import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Create pos_kitchen_printers table for network KOT routing
  await db.schema
    .createTable('pos_kitchen_printers')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('branch_id', 'integer')
    .addColumn('name', 'text', (col) => col.notNull()) // e.g. 'طابعة المطبخ الرئيسي', 'طابعة البار والمشروبات'
    .addColumn('station_code', 'text', (col) => col.notNull().defaultTo('kitchen')) // 'kitchen' | 'bar' | 'grill' | 'fryer' | 'cold' | 'dessert' | 'expo'
    .addColumn('ip_address', 'text') // e.g. '192.168.1.200'
    .addColumn('port', 'integer', (col) => col.notNull().defaultTo(9100))
    .addColumn('paper_width', 'text', (col) => col.notNull().defaultTo('80mm')) // '80mm' | '58mm'
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('category_ids', 'jsonb', (col) => col.notNull().defaultTo('[]'))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // 2. Indexes for fast tenant and branch printer lookups
  await db.schema
    .createIndex('idx_pos_kitchen_printers_tenant_branch')
    .ifNotExists()
    .on('pos_kitchen_printers')
    .columns(['tenant_id', 'branch_id'])
    .execute();

  // 3. Add kitchen_station column to categories and products if not present
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'kitchen_station'
      ) THEN
        ALTER TABLE categories ADD COLUMN kitchen_station varchar(50) DEFAULT 'kitchen';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'kitchen_station'
      ) THEN
        ALTER TABLE products ADD COLUMN kitchen_station varchar(50);
      END IF;
    END $$;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('pos_kitchen_printers').ifExists().execute();
  await sql`
    ALTER TABLE categories DROP COLUMN IF EXISTS kitchen_station;
    ALTER TABLE products DROP COLUMN IF EXISTS kitchen_station;
  `.execute(db);
}
