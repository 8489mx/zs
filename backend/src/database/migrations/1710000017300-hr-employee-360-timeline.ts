import { Kysely } from 'kysely';
import { Database } from '../database.types';

export const migration = {
  up: async (_db: Kysely<Database>): Promise<void> => {
    // Compatibility no-op migration.
    // Restores a previously executed migration filename that exists in some databases.
  },
  down: async (_db: Kysely<Database>): Promise<void> => {
    // No-op rollback for compatibility migration.
  },
};
