import { sql, type Kysely } from 'kysely';

// Closes an IDOR: `GET /api/public/carrier-quote/rfq/:id` and
// `POST /api/public/carrier-quote/rfq/:id/bid` previously trusted the raw
// sequential, tenant-shared `maritime_rfqs.id` with no secret, letting anyone
// enumerate ids to read any tenant's RFQ and inject fabricated carrier bids.
// A random per-RFQ token (mirroring `maritime_jobs.tracking_token`) is now
// required to view or bid on a quote link.
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      ALTER TABLE maritime_rfqs
      ADD COLUMN IF NOT EXISTS public_quote_token TEXT NULL;
    `.execute(db);

    // Backfill existing rows so previously-sent carrier links keep a valid (new) token
    // to rotate against; old links without ?token= will simply need to be re-sent.
    // Uses gen_random_uuid() (native since PG13, no pgcrypto dependency) rather than
    // gen_random_bytes(), matching the convention already used elsewhere in this schema.
    await sql`
      UPDATE maritime_rfqs
      SET public_quote_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
      WHERE public_quote_token IS NULL;
    `.execute(db);

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_maritime_rfqs_public_quote_token_uniq
      ON maritime_rfqs (public_quote_token)
      WHERE public_quote_token IS NOT NULL;
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_maritime_rfqs_public_quote_token_uniq;`.execute(db);
    await sql`ALTER TABLE maritime_rfqs DROP COLUMN IF EXISTS public_quote_token;`.execute(db);
  },
};
