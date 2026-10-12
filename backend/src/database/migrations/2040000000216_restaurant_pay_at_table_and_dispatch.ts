import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Add bill payment columns to restaurant_table_service_calls
  await sql`
    ALTER TABLE restaurant_table_service_calls
      ADD COLUMN IF NOT EXISTS bill_amount numeric(15, 2),
      ADD COLUMN IF NOT EXISTS tip_amount numeric(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS payment_reference text,
      ADD COLUMN IF NOT EXISTS payment_status text;
  `.execute(db);

  // 2. Add online payment tracking to held_sales for table QR checkouts
  await sql`
    ALTER TABLE held_sales
      ADD COLUMN IF NOT EXISTS paid_online boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS paid_online_amount numeric(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS paid_online_ref text;
  `.execute(db);

  // 3. Add in-house delivery dispatching and driver settlement columns
  await sql`
    ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
      ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
      ADD COLUMN IF NOT EXISTS driver_cash_settled boolean DEFAULT false;

    ALTER TABLE online_orders
      ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
      ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
      ADD COLUMN IF NOT EXISTS driver_cash_settled boolean DEFAULT false;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE restaurant_table_service_calls
      DROP COLUMN IF EXISTS bill_amount,
      DROP COLUMN IF EXISTS tip_amount,
      DROP COLUMN IF EXISTS payment_reference,
      DROP COLUMN IF EXISTS payment_status;

    ALTER TABLE held_sales
      DROP COLUMN IF EXISTS paid_online,
      DROP COLUMN IF EXISTS paid_online_amount,
      DROP COLUMN IF EXISTS paid_online_ref;

    ALTER TABLE sales
      DROP COLUMN IF EXISTS dispatched_at,
      DROP COLUMN IF EXISTS delivered_at,
      DROP COLUMN IF EXISTS driver_cash_settled;

    ALTER TABLE online_orders
      DROP COLUMN IF EXISTS dispatched_at,
      DROP COLUMN IF EXISTS delivered_at,
      DROP COLUMN IF EXISTS driver_cash_settled;
  `.execute(db);
}
