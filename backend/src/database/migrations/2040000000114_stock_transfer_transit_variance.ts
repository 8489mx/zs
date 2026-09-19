import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // =========================================================================
    // Transit loss / shrinkage on stock transfers.
    // stock_transfer_items carried a single `qty`, so the destination could only ever receive
    // exactly what was dispatched. Sending 100 and receiving 98 had nowhere to be recorded — the
    // two missing units silently stayed in the in-transit location forever.
    // =========================================================================
    await sql`
      ALTER TABLE stock_transfer_items
        ADD COLUMN IF NOT EXISTS dispatched_qty NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS received_qty NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS variance_qty NUMERIC(15, 3) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS variance_reason TEXT NULL;
    `.execute(db);

    // Existing rows were fully dispatched and fully received by definition of the old model.
    await sql`
      UPDATE stock_transfer_items
      SET dispatched_qty = qty,
          received_qty = CASE
            WHEN EXISTS (
              SELECT 1 FROM stock_transfers t
              WHERE t.id = stock_transfer_items.transfer_id AND t.status = 'received'
            ) THEN qty ELSE 0 END
      WHERE dispatched_qty = 0;
    `.execute(db);

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transfer_item_variance') THEN
          ALTER TABLE stock_transfer_items
            ADD CONSTRAINT chk_transfer_item_variance
            CHECK (
              dispatched_qty >= 0
              AND received_qty >= 0
              AND received_qty <= dispatched_qty
              AND variance_qty = dispatched_qty - received_qty
            );
        END IF;
      END $$;
    `.execute(db);

    await sql`
      ALTER TABLE stock_transfers
        ADD COLUMN IF NOT EXISTS has_transit_variance BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS transit_variance_journal_entry_id BIGINT NULL;
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`ALTER TABLE stock_transfer_items DROP CONSTRAINT IF EXISTS chk_transfer_item_variance;`.execute(db);
    await sql`
      ALTER TABLE stock_transfer_items
        DROP COLUMN IF EXISTS dispatched_qty,
        DROP COLUMN IF EXISTS received_qty,
        DROP COLUMN IF EXISTS variance_qty,
        DROP COLUMN IF EXISTS variance_reason;
    `.execute(db);
    await sql`
      ALTER TABLE stock_transfers
        DROP COLUMN IF EXISTS has_transit_variance,
        DROP COLUMN IF EXISTS transit_variance_journal_entry_id;
    `.execute(db);
  },
};
