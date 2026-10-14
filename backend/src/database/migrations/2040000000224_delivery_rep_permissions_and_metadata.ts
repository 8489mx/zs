import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE delivery_representatives
    ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE delivery_representatives
    DROP COLUMN IF EXISTS permissions,
    DROP COLUMN IF EXISTS metadata;
  `.execute(db);
}
