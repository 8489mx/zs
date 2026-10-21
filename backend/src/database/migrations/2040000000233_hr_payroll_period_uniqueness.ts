import { sql, type Kysely } from 'kysely';

/**
 * The previous index allowed only ONE non-cancelled payroll per tenant/month,
 * even for daily/weekly/biweekly payroll. Index by real pay period instead.
 * The service also rejects intersecting periods under an advisory txn lock.
 */
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_hr_payroll_runs_tenant_period_month_unique`.execute(db);
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_payroll_runs_tenant_frequency_dates_unique
      ON hr_payroll_runs(tenant_id, pay_frequency, start_date, end_date)
      WHERE status <> 'cancelled'
    `.execute(db);
    await sql`
      CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_tenant_frequency_range
      ON hr_payroll_runs(tenant_id, pay_frequency, start_date, end_date)
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    // If multiple runs per month are already in use, the old single-month
    // index cannot be restored without data loss. Let the DB reject rollback.
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_payroll_runs_tenant_period_month_unique
      ON hr_payroll_runs(tenant_id, period_month)
      WHERE status <> 'cancelled'
    `.execute(db);
    await sql`DROP INDEX IF EXISTS idx_hr_payroll_runs_tenant_frequency_dates_unique`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_hr_payroll_runs_tenant_frequency_range`.execute(db);
  },
};
