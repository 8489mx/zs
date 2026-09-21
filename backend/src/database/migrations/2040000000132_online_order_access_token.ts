import { sql, type Kysely } from 'kysely';

// SF-1. Every public "my order" route (list / cancel / edit / payment session / payment status /
// sandbox pay) used to identify the order by `order_number` alone. That number is per-tenant
// sequential (ON-YYMMDD-0001), so anyone could walk the sequence and read customers' names,
// phones and addresses, cancel or rewrite their orders, or mark them paid.
//
// Each order now carries the SHA-256 hash of a random token handed to the customer once, at
// checkout. Existing rows stay NULL on purpose: nobody holds a token for them, and the engine
// fails closed on NULL, so they are simply no longer reachable from the public side (the merchant
// still manages them from the dashboard).
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      ALTER TABLE online_orders
      ADD COLUMN IF NOT EXISTS access_token_hash VARCHAR(64) NULL
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`ALTER TABLE online_orders DROP COLUMN IF EXISTS access_token_hash`.execute(db);
  },
};
