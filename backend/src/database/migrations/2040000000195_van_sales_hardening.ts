import { Kysely, sql } from 'kysely';

/**
 * Migration 2040000000195: Van Sales Hardening & Governance
 *
 * 1. Extends `van_sales_trips` with Maker-Checker and supervisor approval columns:
 *    - `settlement_status`: ('open', 'submitted_by_rep', 'settled')
 *    - `submitted_at`: timestamp when driver submitted end-of-trip report
 *    - `supervisor_id`: supervisor assigned to or reviewing the trip
 *    - `settled_by`: user who conducted the final audit and authorized closing
 *    - `stock_variance_amount`: financial cost of missing van stock
 *    - `stock_variance_details`: itemized JSON breakdown of physical count variances
 *    - `night_stock_approved`: flag indicating whether overnight stock retention was authorized
 *    - `night_stock_approved_by`: supervisor who approved keeping goods in the van overnight
 *    - `night_stock_notes`: explanation/rationale for overnight van stock
 *    - `distance_km`: calculated trip travel distance (end_odometer - start_odometer)
 *
 * 2. Synchronizes legacy trip status values and creates high-performance composite indexes.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE van_sales_trips
    ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(30) NOT NULL DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS supervisor_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS settled_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS stock_variance_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS stock_variance_details JSONB NULL,
    ADD COLUMN IF NOT EXISTS night_stock_approved BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS night_stock_approved_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS night_stock_notes TEXT NULL,
    ADD COLUMN IF NOT EXISTS distance_km NUMERIC(12, 2) NULL;
  `.execute(db);

  // Sync existing status
  await sql`
    UPDATE van_sales_trips
    SET settlement_status = status
    WHERE status IN ('open', 'settled') AND settlement_status = 'open';
  `.execute(db);

  // Composite indexes for audit and filtering
  await sql`
    CREATE INDEX IF NOT EXISTS idx_van_trips_tenant_settlement_status
    ON van_sales_trips (tenant_id, settlement_status);

    CREATE INDEX IF NOT EXISTS idx_van_trips_tenant_opened
    ON van_sales_trips (tenant_id, opened_at DESC);
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_van_trips_tenant_opened;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_van_trips_tenant_settlement_status;`.execute(db);

  await sql`
    ALTER TABLE van_sales_trips
    DROP COLUMN IF EXISTS distance_km,
    DROP COLUMN IF EXISTS night_stock_notes,
    DROP COLUMN IF EXISTS night_stock_approved_by,
    DROP COLUMN IF EXISTS night_stock_approved,
    DROP COLUMN IF EXISTS stock_variance_details,
    DROP COLUMN IF EXISTS stock_variance_amount,
    DROP COLUMN IF EXISTS settled_by,
    DROP COLUMN IF EXISTS supervisor_id,
    DROP COLUMN IF EXISTS submitted_at,
    DROP COLUMN IF EXISTS settlement_status;
  `.execute(db);
}

export const migration = {
  up,
  down,
};

export default migration;
