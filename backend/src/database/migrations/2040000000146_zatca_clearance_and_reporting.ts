import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Add clearance, response, and audit tracking columns to sales table
  await sql`
    ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS zatca_cleared_xml TEXT,
      ADD COLUMN IF NOT EXISTS zatca_submitted_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS zatca_response_json JSONB,
      ADD COLUMN IF NOT EXISTS zatca_egs_id BIGINT,
      ADD COLUMN IF NOT EXISTS zatca_invoice_type VARCHAR(20) DEFAULT 'simplified';
  `.execute(db);

  // 2. Ensure indexes for querying pending and submitted ZATCA invoices
  await sql`
    CREATE INDEX IF NOT EXISTS idx_sales_zatca_submitted_at
      ON sales(tenant_id, zatca_submitted_at);
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_sales_zatca_status_tenant
      ON sales(tenant_id, zatca_status);
  `.execute(db);

  // 3. Create zatca_transmission_logs table for immutable audit trail required by tax authorities
  await sql`
    CREATE TABLE IF NOT EXISTS zatca_transmission_logs (
      id BIGSERIAL PRIMARY KEY,
      tenant_id VARCHAR(100) NOT NULL,
      sale_id BIGINT NOT NULL,
      egs_id BIGINT,
      action_type VARCHAR(30) NOT NULL, -- 'reporting' | 'clearance' | 'compliance_check'
      environment VARCHAR(30) NOT NULL, -- 'sandbox' | 'simulation' | 'production'
      request_uuid VARCHAR(100) NOT NULL,
      invoice_hash VARCHAR(64) NOT NULL,
      http_status INTEGER,
      response_status VARCHAR(50), -- 'REPORTED' | 'CLEARED' | 'NOT_REPORTED' | 'NOT_CLEARED' | 'ERROR' | 'FAILED'
      validation_results JSONB,
      raw_response TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_zatca_logs_tenant_sale
      ON zatca_transmission_logs(tenant_id, sale_id);
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_zatca_logs_created_at
      ON zatca_transmission_logs(tenant_id, created_at);
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS zatca_transmission_logs;`.execute(db);

  await sql`
    ALTER TABLE sales
      DROP COLUMN IF EXISTS zatca_cleared_xml,
      DROP COLUMN IF EXISTS zatca_submitted_at,
      DROP COLUMN IF EXISTS zatca_response_json,
      DROP COLUMN IF EXISTS zatca_egs_id,
      DROP COLUMN IF EXISTS zatca_invoice_type;
  `.execute(db);
}
