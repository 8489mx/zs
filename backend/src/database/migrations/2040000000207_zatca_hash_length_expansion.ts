import { Kysely, sql } from 'kysely';

/**
 * Migration 2040000000207: Expand ZATCA hash columns to accommodate Base64 representations
 *
 * Expands zatca_egs_units.last_invoice_hash, sales.zatca_hash, and sales.zatca_prev_hash
 * from VARCHAR(64) to VARCHAR(255) to support 88-character Base64 encoded SHA-256 strings.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE zatca_egs_units
    ALTER COLUMN last_invoice_hash TYPE VARCHAR(255);

    ALTER TABLE sales
    ALTER COLUMN zatca_hash TYPE VARCHAR(255),
    ALTER COLUMN zatca_prev_hash TYPE VARCHAR(255);
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE zatca_egs_units
    ALTER COLUMN last_invoice_hash TYPE VARCHAR(64);

    ALTER TABLE sales
    ALTER COLUMN zatca_hash TYPE VARCHAR(64),
    ALTER COLUMN zatca_prev_hash TYPE VARCHAR(64);
  `.execute(db);
}
