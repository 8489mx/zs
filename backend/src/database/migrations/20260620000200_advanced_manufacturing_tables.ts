import { Kysely, sql } from 'kysely';

const ddlStatements = [
  `ALTER TABLE manufacturing_boms ADD COLUMN IF NOT EXISTS overhead_cost NUMERIC(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE manufacturing_bom_lines ADD COLUMN IF NOT EXISTS waste_percentage NUMERIC(5,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS modifiers JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE held_sale_items ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE held_sale_items ADD COLUMN IF NOT EXISTS modifiers JSONB NOT NULL DEFAULT '[]'::jsonb`,
];

const dropStatements = [
  `ALTER TABLE manufacturing_boms DROP COLUMN IF EXISTS overhead_cost`,
  `ALTER TABLE manufacturing_bom_lines DROP COLUMN IF EXISTS waste_percentage`,
  `ALTER TABLE sale_items DROP COLUMN IF EXISTS notes`,
  `ALTER TABLE sale_items DROP COLUMN IF EXISTS modifiers`,
  `ALTER TABLE held_sale_items DROP COLUMN IF EXISTS notes`,
  `ALTER TABLE held_sale_items DROP COLUMN IF EXISTS modifiers`,
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
