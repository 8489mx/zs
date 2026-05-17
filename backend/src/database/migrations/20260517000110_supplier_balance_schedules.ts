import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`ALTER TABLE supplier_payment_schedules ALTER COLUMN purchase_id DROP NOT NULL`.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DELETE FROM supplier_payment_schedules WHERE purchase_id IS NULL`.execute(db);
    await sql`ALTER TABLE supplier_payment_schedules ALTER COLUMN purchase_id SET NOT NULL`.execute(db);
  },
};
