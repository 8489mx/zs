import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000152: allow `location_type = 'van_stock'` on stock_locations.
 *
 * Migration 2040000000045 (van sales) has `VanSalesService.getOrCreateVanLocation` insert every
 * delivery rep's van as a stock_locations row with `location_type: 'van_stock'` — but the CHECK
 * constraint added earlier, in 2028000000006, only allows
 * ('branch_stock','internal_warehouse','external_warehouse','damaged','in_transit'). Every rep's
 * very first action (opening a trip, which auto-creates their van location) has been rejected by
 * Postgres ever since: the feature could not get past its first insert. Caught only now by an
 * actual end-to-end test against a real constrained database (van-sales-field-flow.e2e.ts) —
 * the existing unit test for this module reimplements the arithmetic in isolation and never
 * touches a database at all.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`ALTER TABLE stock_locations DROP CONSTRAINT IF EXISTS stock_locations_type_valid`.execute(db);
    await sql`
      ALTER TABLE stock_locations
      ADD CONSTRAINT stock_locations_type_valid
      CHECK (location_type IN ('branch_stock', 'internal_warehouse', 'external_warehouse', 'damaged', 'in_transit', 'van_stock'))
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`ALTER TABLE stock_locations DROP CONSTRAINT IF EXISTS stock_locations_type_valid`.execute(db);
    await sql`
      ALTER TABLE stock_locations
      ADD CONSTRAINT stock_locations_type_valid
      CHECK (location_type IN ('branch_stock', 'internal_warehouse', 'external_warehouse', 'damaged', 'in_transit'))
    `.execute(db);
  },
};
