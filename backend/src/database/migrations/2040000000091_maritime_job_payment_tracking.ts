import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // 1. Add payment tracking columns to maritime_jobs
    await sql`
      ALTER TABLE maritime_jobs
      ADD COLUMN IF NOT EXISTS client_paid_total NUMERIC(15, 4) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
      ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL;
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_maritime_jobs_payment_status
      ON maritime_jobs (tenant_id, payment_status);
    `.execute(db);

    // 2. Add job_id linking column to customer_payments
    await sql`
      ALTER TABLE customer_payments
      ADD COLUMN IF NOT EXISTS job_id BIGINT NULL;
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_payments_job_id
      ON customer_payments (job_id)
      WHERE job_id IS NOT NULL;
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_customer_payments_job_id;`.execute(db);
    await sql`ALTER TABLE customer_payments DROP COLUMN IF EXISTS job_id;`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_maritime_jobs_payment_status;`.execute(db);
    await sql`ALTER TABLE maritime_jobs DROP COLUMN IF EXISTS paid_at;`.execute(db);
    await sql`ALTER TABLE maritime_jobs DROP COLUMN IF EXISTS payment_status;`.execute(db);
    await sql`ALTER TABLE maritime_jobs DROP COLUMN IF EXISTS client_paid_total;`.execute(db);
  },
};
