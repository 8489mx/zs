import { Kysely, sql } from 'kysely';

export const migration = {
  async up(db: Kysely<any>): Promise<void> {
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_signature TEXT`.execute(db);
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT`.execute(db);
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_gps_lat DOUBLE PRECISION`.execute(db);
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_gps_lng DOUBLE PRECISION`.execute(db);
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_notes TEXT`.execute(db);

    await sql`ALTER TABLE delivery_representatives ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10)`.execute(db);
  },

  async down(db: Kysely<any>): Promise<void> {
    await sql`ALTER TABLE sales DROP COLUMN IF EXISTS delivery_signature`.execute(db);
    await sql`ALTER TABLE sales DROP COLUMN IF EXISTS delivery_photo_url`.execute(db);
    await sql`ALTER TABLE sales DROP COLUMN IF EXISTS delivery_gps_lat`.execute(db);
    await sql`ALTER TABLE sales DROP COLUMN IF EXISTS delivery_gps_lng`.execute(db);
    await sql`ALTER TABLE sales DROP COLUMN IF EXISTS delivery_notes`.execute(db);

    await sql`ALTER TABLE delivery_representatives DROP COLUMN IF EXISTS pin_code`.execute(db);
  },
};
