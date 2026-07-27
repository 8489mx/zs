import { Kysely } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // dummy migration to fix kysely complaining about missing file
  },
  down: async (db: Kysely<any>): Promise<void> => {
  }
};
