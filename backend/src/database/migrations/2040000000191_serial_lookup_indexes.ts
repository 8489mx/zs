import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<unknown>): Promise<void> => {
    await sql`CREATE INDEX IF NOT EXISTS idx_product_serials_tenant_serial_fold
      ON product_serials (tenant_id, lower(serial_number))`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_product_serials_tenant_imei2_fold
      ON product_serials (tenant_id, lower(imei_2)) WHERE imei_2 IS NOT NULL`.execute(db);
  },

  down: async (db: Kysely<unknown>): Promise<void> => {
    await sql`DROP INDEX IF EXISTS idx_product_serials_tenant_imei2_fold`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_product_serials_tenant_serial_fold`.execute(db);
  },
};
