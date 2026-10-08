import { Kysely, Migration, sql } from 'kysely';

/**
 * Migration 2040000000204: Users Supervisor PIN Authorization
 *
 * Adds PIN and PIN hash support to system users for field approvals,
 * supervisor overrides (e.g. credit limit exceptions in van sales),
 * and manager authorisations.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS pin VARCHAR(10) NULL,
    ADD COLUMN IF NOT EXISTS pin_hash TEXT NULL;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE users
    DROP COLUMN IF EXISTS pin_hash,
    DROP COLUMN IF EXISTS pin;
  `.execute(db);
}

export const migration: Migration = {
  up,
  down,
};

export default migration;
