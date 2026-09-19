import { Kysely, sql } from 'kysely';

export const migration = {
  async up(db: Kysely<any>): Promise<void> {
    // 1. Idempotent unique partial index on journal_entries for HR End of Service settlements
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_hr_eos_uniq
      ON journal_entries(tenant_id, source_id)
      WHERE source_type = 'hr_end_of_service_settlement';
    `.execute(db);

    // 2. Unique index on settlement_no per tenant to prevent duplicate settlement documents
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_eos_tenant_settlement_no_uniq
      ON hr_end_of_service_settlements(tenant_id, settlement_no);
    `.execute(db);

    // 3. Composite index on employee and settlement date for fast lookups and audits
    await sql`
      CREATE INDEX IF NOT EXISTS idx_hr_eos_tenant_emp_date
      ON hr_end_of_service_settlements(tenant_id, employee_id, settlement_date);
    `.execute(db);
  },

  async down(db: Kysely<any>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_hr_eos_tenant_emp_date;`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_hr_eos_tenant_settlement_no_uniq;`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_journal_entries_hr_eos_uniq;`.execute(db);
  },
};
