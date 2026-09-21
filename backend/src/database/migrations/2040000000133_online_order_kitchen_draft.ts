import { sql, type Kysely } from 'kysely';

// O53. A dine-in QR order used to insert a `sales` row with status 'posted' directly from the public
// storefront route: no stock movement (applyStockDelta), no journal, no payment, no transaction, and
// errors swallowed. It counted as revenue in every report filtering status = 'posted' while the books
// and the stock never heard of it.
//
// It now inserts a DRAFT sale — enough for the kitchen display to show the ticket, but no financial
// document. The cashier posts the real sale through SalesService; at that point the draft is retired
// and its kitchen-ticket state handed to the posted sale. This column links the order to its draft so
// the retirement can find it (online_orders.sale_id stays reserved for the real, posted invoice).
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      ALTER TABLE online_orders
      ADD COLUMN IF NOT EXISTS kitchen_draft_sale_id BIGINT NULL
    `.execute(db);

    // Legacy QR orders: their "posted" sale is exactly the broken document described above. It is
    // left untouched on purpose — rewriting historical posted sales is an accounting decision (see
    // ARCHITECTURE_INVARIANTS.md O61), not something a schema migration should do silently.
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`ALTER TABLE online_orders DROP COLUMN IF EXISTS kitchen_draft_sale_id`.execute(db);
  },
};
