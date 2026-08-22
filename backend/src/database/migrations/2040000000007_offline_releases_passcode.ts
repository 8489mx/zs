import { Kysely, sql } from 'kysely';

const ddlStatements = [
  'ALTER TABLE offline_releases ADD COLUMN IF NOT EXISTS passcode VARCHAR(100) DEFAULT NULL',
  'ALTER TABLE offline_releases ADD COLUMN IF NOT EXISTS requires_passcode BOOLEAN NOT NULL DEFAULT TRUE',
];

const dropStatements = [
  'ALTER TABLE offline_releases DROP COLUMN IF EXISTS passcode',
  'ALTER TABLE offline_releases DROP COLUMN IF EXISTS requires_passcode',
];

export const migration = {
  up: async (db: Kysely<unknown>): Promise<void> => {
    for (let i = 0; i < ddlStatements.length; i += 1) {
      const statement = ddlStatements[i];
      try {
        await sql.raw(statement).execute(db);
      } catch (error) {
        console.error('FAILED DDL INDEX:', i);
        console.error('FAILED DDL STATEMENT:\n', statement);
        throw error;
      }
    }
  },
  down: async (db: Kysely<unknown>): Promise<void> => {
    for (let i = 0; i < dropStatements.length; i += 1) {
      const statement = dropStatements[i];
      try {
        await sql.raw(statement).execute(db);
      } catch (error) {
        console.error('FAILED DROP INDEX:', i);
        console.error('FAILED DROP STATEMENT:\n', statement);
        throw error;
      }
    }
  },
};
