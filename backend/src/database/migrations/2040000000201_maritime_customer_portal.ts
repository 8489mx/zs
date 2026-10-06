import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000201: B2B Customer Self-Service Freight Portal.
 *
 * Implements:
 * 1. Customer Portal Authentication Credentials (portal_access_pin, portal_token) on customers table
 * 2. Quotation Customer Approval & E-Acceptance Audit Trail on maritime_quotations
 * 3. Customer Portal Booking/Inquiry Origin tracking on maritime_inquiries
 */
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // 1. Add portal credentials to customers table
    await sql`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS portal_access_pin TEXT NULL,
      ADD COLUMN IF NOT EXISTS portal_token TEXT NULL;
    `.execute(db);

    // Backfill portal_token for existing customers who don't have one
    await sql`
      UPDATE customers
      SET portal_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
      WHERE portal_token IS NULL;
    `.execute(db);

    // Set default portal_access_pin = '1234' for existing active customers who don't have one
    await sql`
      UPDATE customers
      SET portal_access_pin = '1234'
      WHERE portal_access_pin IS NULL;
    `.execute(db);

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_portal_token_uniq
      ON customers (portal_token)
      WHERE portal_token IS NOT NULL;
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone_pin
      ON customers (tenant_id, phone, portal_access_pin);
    `.execute(db);

    // 2. Expand maritime_quotations for Customer Online Approval & Booking E-Signature
    await sql`
      ALTER TABLE maritime_quotations
      ADD COLUMN IF NOT EXISTS customer_approved_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS customer_approval_notes TEXT NULL,
      ADD COLUMN IF NOT EXISTS customer_approval_reference TEXT NULL,
      ADD COLUMN IF NOT EXISTS customer_approval_ip TEXT NULL;
    `.execute(db);

    // 3. Expand maritime_inquiries for Customer Portal Online Submissions
    await sql`
      ALTER TABLE maritime_inquiries
      ADD COLUMN IF NOT EXISTS portal_submitted BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS portal_customer_notes TEXT NULL;
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_customers_portal_token_uniq;`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_customers_tenant_phone_pin;`.execute(db);

    await sql`
      ALTER TABLE customers
      DROP COLUMN IF EXISTS portal_access_pin,
      DROP COLUMN IF EXISTS portal_token;
    `.execute(db);

    await sql`
      ALTER TABLE maritime_quotations
      DROP COLUMN IF EXISTS customer_approved_at,
      DROP COLUMN IF EXISTS customer_approval_notes,
      DROP COLUMN IF EXISTS customer_approval_reference,
      DROP COLUMN IF EXISTS customer_approval_ip;
    `.execute(db);

    await sql`
      ALTER TABLE maritime_inquiries
      DROP COLUMN IF EXISTS portal_submitted,
      DROP COLUMN IF EXISTS portal_customer_notes;
    `.execute(db);
  },
};
