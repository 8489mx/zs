import { sql, type Kysely } from 'kysely';

// Fixes a bug in migration 122's unique index, caught by a smoke test the same
// day: `COALESCE(shipping_line_id, 0)` collapsed every *unlinked* carrier
// (shipping_line_id IS NULL — the common case for manually-entered rates) into
// the same bucket, so two different carriers quoting the same lane on the same
// day were rejected as "duplicates" — defeating the entire point of rate
// management, which is comparing multiple carriers on one lane.
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS uq_maritime_rate_cards_lane_validity;`.execute(db);

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_maritime_rate_cards_lane_carrier_validity
      ON maritime_rate_cards (tenant_id, pol_code, pod_code, container_type, valid_from, carrier_name);
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS uq_maritime_rate_cards_lane_carrier_validity;`.execute(db);
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_maritime_rate_cards_lane_validity
      ON maritime_rate_cards (tenant_id, COALESCE(shipping_line_id, 0), pol_code, pod_code, container_type, valid_from);
    `.execute(db);
  },
};
