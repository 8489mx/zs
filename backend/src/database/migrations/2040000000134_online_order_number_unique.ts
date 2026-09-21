import { sql, type Kysely } from 'kysely';

// O57. `online_orders.order_number` (ON-YYMMDD-NNNN) was generated as MAX+1 with no lock and no
// constraint, so concurrent checkouts could share a number. The generator now takes a per-tenant
// advisory lock; this unique index is the backstop that turns any future regression into a loud
// failure instead of a silent duplicate.
//
// Existing duplicates (possible on databases that ran the old code) would make CREATE UNIQUE INDEX
// fail and block startup, so the index is only created when the data allows it; otherwise a NOTICE is
// raised and the lock alone protects new orders.
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM online_orders GROUP BY tenant_id, order_number HAVING COUNT(*) > 1
        ) THEN
          CREATE UNIQUE INDEX IF NOT EXISTS uq_online_orders_tenant_order_number
            ON online_orders (tenant_id, order_number);
        ELSE
          RAISE NOTICE 'online_orders has duplicate (tenant_id, order_number); unique index skipped';
        END IF;
      END $$;
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS uq_online_orders_tenant_order_number`.execute(db);
  },
};
