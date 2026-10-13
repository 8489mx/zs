import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Add InstaPay, Vodafone Cash & Recipient Signature fields to sales table
  await sql`
    ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS transfer_reference VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS transfer_receipt_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS recipient_signature TEXT NULL;
  `.execute(db);

  // 2. Add transfer reference & receipt to customer_payments table
  await sql`
    ALTER TABLE customer_payments
    ADD COLUMN IF NOT EXISTS transfer_reference VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS transfer_receipt_url TEXT NULL;
  `.execute(db);

  // 3. Add InstaPay totals to van_sales_trips table
  await sql`
    ALTER TABLE van_sales_trips
    ADD COLUMN IF NOT EXISTS total_instapay_sales NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS total_instapay_collections NUMERIC(14, 2) NOT NULL DEFAULT 0.00;
  `.execute(db);

  // 4. Create van_damaged_swaps table for instant damaged/broken goods exchange in field
  await sql`
    CREATE TABLE IF NOT EXISTS van_damaged_swaps (
      id BIGSERIAL PRIMARY KEY,
      tenant_id VARCHAR(64) NOT NULL,
      account_id VARCHAR(64) NOT NULL,
      trip_id BIGINT NOT NULL REFERENCES van_sales_trips(id) ON DELETE CASCADE,
      customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      damaged_product_id BIGINT NOT NULL REFERENCES products(id),
      damaged_qty NUMERIC(14, 4) NOT NULL,
      damage_reason VARCHAR(100) NOT NULL,
      replacement_product_id BIGINT NOT NULL REFERENCES products(id),
      replacement_qty NUMERIC(14, 4) NOT NULL,
      price_difference NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
      notes TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_van_damaged_swaps_tenant_trip ON van_damaged_swaps(tenant_id, trip_id);
    CREATE INDEX IF NOT EXISTS idx_van_damaged_swaps_tenant_customer ON van_damaged_swaps(tenant_id, customer_id);
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS van_damaged_swaps;`.execute(db);

  await sql`
    ALTER TABLE van_sales_trips
    DROP COLUMN IF EXISTS total_instapay_sales,
    DROP COLUMN IF EXISTS total_instapay_collections;
  `.execute(db);

  await sql`
    ALTER TABLE customer_payments
    DROP COLUMN IF EXISTS transfer_reference,
    DROP COLUMN IF EXISTS transfer_receipt_url;
  `.execute(db);

  await sql`
    ALTER TABLE sales
    DROP COLUMN IF EXISTS transfer_reference,
    DROP COLUMN IF EXISTS transfer_receipt_url,
    DROP COLUMN IF EXISTS recipient_name,
    DROP COLUMN IF EXISTS recipient_phone,
    DROP COLUMN IF EXISTS recipient_role,
    DROP COLUMN IF EXISTS recipient_signature;
  `.execute(db);
}
