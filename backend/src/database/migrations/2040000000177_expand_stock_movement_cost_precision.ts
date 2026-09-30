import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000177: Expand Stock Movements and Damaged Stock Cost Precision
 *
 * Expands numeric precision for financial cost columns to prevent numeric field overflow (code 22003)
 * when handling large quantities of high-value items (e.g., iPhones, wholesale electronics, contracting materials):
 * - stock_movements.unit_cost: DECIMAL(12, 3) -> NUMERIC(16, 3)
 * - stock_movements.total_cost: DECIMAL(12, 3) -> NUMERIC(18, 3)
 * - damaged_stock_records.unit_cost: DECIMAL(12, 3) -> NUMERIC(16, 3)
 * - damaged_stock_records.total_cost: DECIMAL(12, 3) -> NUMERIC(18, 3)
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`
      ALTER TABLE stock_movements 
        ALTER COLUMN unit_cost TYPE NUMERIC(16, 3),
        ALTER COLUMN total_cost TYPE NUMERIC(18, 3);

      ALTER TABLE damaged_stock_records 
        ALTER COLUMN unit_cost TYPE NUMERIC(16, 3),
        ALTER COLUMN total_cost TYPE NUMERIC(18, 3);
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`
      ALTER TABLE stock_movements 
        ALTER COLUMN unit_cost TYPE NUMERIC(12, 3),
        ALTER COLUMN total_cost TYPE NUMERIC(12, 3);

      ALTER TABLE damaged_stock_records 
        ALTER COLUMN unit_cost TYPE NUMERIC(12, 3),
        ALTER COLUMN total_cost TYPE NUMERIC(12, 3);
    `.execute(db);
  },
};
