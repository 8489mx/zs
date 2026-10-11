import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Create restaurant_table_service_calls table for digital bell & bill calling from table QR
  await db.schema
    .createTable('restaurant_table_service_calls')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tenant_id', 'text', (col) => col.notNull())
    .addColumn('branch_id', 'integer')
    .addColumn('table_number', 'text', (col) => col.notNull())
    .addColumn('call_type', 'text', (col) => col.notNull().defaultTo('waiter')) // 'waiter' | 'bill' | 'water' | 'clean'
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending')) // 'pending' | 'resolved'
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('resolved_at', 'timestamptz')
    .execute();

  await db.schema
    .createIndex('idx_table_service_calls_tenant_status')
    .ifNotExists()
    .on('restaurant_table_service_calls')
    .columns(['tenant_id', 'status'])
    .execute();

  // 2. Add SFDA nutritional & allergen compliance columns to products
  await sql`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS calories integer,
      ADD COLUMN IF NOT EXISTS allergens jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS is_spicy boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_vegetarian boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_gluten_free boolean DEFAULT false;
  `.execute(db);

  // 3. Add tip_amount column to sales
  await sql`
    ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS tip_amount numeric(15, 2) DEFAULT 0;
  `.execute(db);

  // 4. Add reservation_type to restaurant_table_reservations for walk-in waitlist
  await sql`
    ALTER TABLE restaurant_table_reservations
      ADD COLUMN IF NOT EXISTS reservation_type text DEFAULT 'reservation';
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('restaurant_table_service_calls').ifExists().execute();
  await sql`
    ALTER TABLE products
      DROP COLUMN IF EXISTS calories,
      DROP COLUMN IF EXISTS allergens,
      DROP COLUMN IF EXISTS is_spicy,
      DROP COLUMN IF EXISTS is_vegetarian,
      DROP COLUMN IF EXISTS is_gluten_free;

    ALTER TABLE sales
      DROP COLUMN IF EXISTS tip_amount;

    ALTER TABLE restaurant_table_reservations
      DROP COLUMN IF EXISTS reservation_type;
  `.execute(db);
}
