import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000159: Van Representative Collection & Visits Targets
 *
 * Adds optional collection_target and visits_target columns to delivery_rep_targets table
 * to support holistic FMCG van sales targets (Revenue, Cash Collections, Field Customer Visits).
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`
      ALTER TABLE delivery_rep_targets
      ADD COLUMN IF NOT EXISTS collection_target NUMERIC(15, 2) NULL,
      ADD COLUMN IF NOT EXISTS visits_target INTEGER NULL;
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`
      ALTER TABLE delivery_rep_targets
      DROP COLUMN IF EXISTS collection_target,
      DROP COLUMN IF EXISTS visits_target;
    `.execute(db);
  },
};
