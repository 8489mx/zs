import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`
      ALTER TABLE purchase_items 
      ADD COLUMN IF NOT EXISTS received_qty NUMERIC(15, 4) NOT NULL DEFAULT 0;
    `.execute(db);

    await sql`
      ALTER TABLE purchases 
      ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'posted';
    `.execute(db);

    await sql`
      ALTER TABLE purchases 
      ADD COLUMN IF NOT EXISTS matched_status TEXT NOT NULL DEFAULT 'matched';
    `.execute(db);

    await sql`
      UPDATE purchase_items 
      SET received_qty = qty 
      WHERE received_qty = 0 AND qty > 0;
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`ALTER TABLE purchases DROP COLUMN IF EXISTS matched_status;`.execute(db);
    await sql`ALTER TABLE purchases DROP COLUMN IF EXISTS lifecycle_status;`.execute(db);
    await sql`ALTER TABLE purchase_items DROP COLUMN IF EXISTS received_qty;`.execute(db);
  },
};
