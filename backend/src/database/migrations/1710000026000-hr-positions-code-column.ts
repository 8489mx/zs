import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

export const migration = {
  up: async (db: Kysely<Database>): Promise<void> => {
    await sql`
      ALTER TABLE hr_positions
      ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT ''
    `.execute(db);

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_positions_code_unique
      ON hr_positions(code)
      WHERE code <> ''
    `.execute(db);
  },
};
