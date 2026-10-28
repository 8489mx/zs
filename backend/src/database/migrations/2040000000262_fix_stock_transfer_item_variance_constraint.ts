import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // Drop old constraint variant if present and recreate with full support for in-transit items
    // and instant final-issue transfers.
    await sql`ALTER TABLE stock_transfer_items DROP CONSTRAINT IF EXISTS chk_transfer_item_variance;`.execute(db);

    await sql`
      ALTER TABLE stock_transfer_items
        ADD CONSTRAINT chk_transfer_item_variance
        CHECK (
          dispatched_qty >= 0
          AND received_qty >= 0
          AND received_qty <= dispatched_qty
          AND (
            (received_qty = 0 AND variance_qty = 0)
            OR variance_qty = dispatched_qty - received_qty
          )
        );
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    // Non-destructive down: keep constraint
  },
};
