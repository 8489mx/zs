import { sql, type Kysely } from 'kysely';

/**
 * PDC rate variance flag (INV-PDC-RATE-VARIANCE-FLAGGED): a cheque
 * booked with a supplied exchange rate more than 5% away from the
 * registered rate is accepted (contractual rates are legitimate)
 * but flagged for review, with the registered rate stored
 * alongside so the flag stays auditable after the live rate is
 * overwritten. Both columns are audit-only: pre-existing cheques
 * default to unflagged with no reference rate, and the partial
 * index serves review screens listing flagged cheques only.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE accounting_cheques
      ADD COLUMN IF NOT EXISTS flagged_rate_variance BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS registered_exchange_rate NUMERIC(15, 6)
  `.execute(db);
  await sql`
    CREATE INDEX IF NOT EXISTS idx_accounting_cheques_rate_variance
      ON accounting_cheques (tenant_id, flagged_rate_variance)
      WHERE flagged_rate_variance
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_accounting_cheques_rate_variance`.execute(db);
  await sql`
    ALTER TABLE accounting_cheques
      DROP COLUMN IF EXISTS registered_exchange_rate,
      DROP COLUMN IF EXISTS flagged_rate_variance
  `.execute(db);
}

export const migration = { up, down };
