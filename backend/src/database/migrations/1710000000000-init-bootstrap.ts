import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

export const migration = {
  up: async (db: Kysely<Database>): Promise<void> => {
    await db.schema
      .createTable('_phase1_bootstrap')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey())
      .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      .execute();

    await db
      .insertInto('_phase1_bootstrap')
      .values({ id: 1 })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();
  },
  down: async (db: Kysely<Database>): Promise<void> => {
    await db.schema.dropTable('_phase1_bootstrap').ifExists().execute();
  },
};
