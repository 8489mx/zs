import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000164: Van Field Returns Refund Method and Cash Refunds
 *
 * Adds refund_method column to van_field_returns ('credit' vs 'cash')
 * and cash_refunds to van_sales_trips to accurately distinguish between
 * credit ledger deductions and immediate out-of-pocket cash refunds from the van.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`
      ALTER TABLE van_field_returns
      ADD COLUMN IF NOT EXISTS refund_method VARCHAR(20) NOT NULL DEFAULT 'credit';

      ALTER TABLE van_sales_trips
      ADD COLUMN IF NOT EXISTS cash_refunds NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`
      ALTER TABLE van_field_returns
      DROP COLUMN IF EXISTS refund_method;

      ALTER TABLE van_sales_trips
      DROP COLUMN IF EXISTS cash_refunds;
    `.execute(db);
  },
};
