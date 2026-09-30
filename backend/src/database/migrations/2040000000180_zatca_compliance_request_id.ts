import { type Kysely, sql } from 'kysely';

export const migration = {
  async up(db: Kysely<any>): Promise<void> {
    await sql`ALTER TABLE zatca_egs_units ADD COLUMN IF NOT EXISTS compliance_request_id TEXT`.execute(db);
  },
  async down(_db: Kysely<any>): Promise<void> {
    // Keep the request ID for audit and rollback-safe production credential renewal.
  },
};
