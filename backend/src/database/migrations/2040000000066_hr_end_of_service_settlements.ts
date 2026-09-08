import { Kysely, sql } from 'kysely';

export const migration = {
  async up(db: Kysely<any>): Promise<void> {
    await sql`
      CREATE TABLE IF NOT EXISTS hr_end_of_service_settlements (
        id BIGSERIAL PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        settlement_no VARCHAR(64) NOT NULL,
        employee_id BIGINT NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
        settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
        hire_date DATE NOT NULL,
        termination_date DATE NOT NULL,
        contract_type VARCHAR(32) NOT NULL DEFAULT 'unspecified',
        termination_reason VARCHAR(64) NOT NULL DEFAULT 'resignation',
        law_type VARCHAR(32) NOT NULL DEFAULT 'saudi',
        service_years NUMERIC(6, 2) NOT NULL DEFAULT 0,
        service_months INT NOT NULL DEFAULT 0,
        service_days INT NOT NULL DEFAULT 0,
        last_basic_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
        last_total_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
        gratuity_percentage NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
        gratuity_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        remaining_leave_days NUMERIC(6, 2) NOT NULL DEFAULT 0,
        leave_encashment_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        pending_salary_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        notice_period_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        other_entitlements_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        unpaid_loans_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0,
        assets_deduction NUMERIC(15, 2) NOT NULL DEFAULT 0,
        other_deductions NUMERIC(15, 2) NOT NULL DEFAULT 0,
        net_settlement_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        custody_cleared BOOLEAN NOT NULL DEFAULT FALSE,
        clearance_checklist JSONB NULL,
        clearance_notes TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        journal_entry_id BIGINT NULL REFERENCES journal_entries(id) ON DELETE SET NULL,
        payment_method VARCHAR(32) NULL,
        treasury_or_bank_account_id BIGINT NULL REFERENCES accounting_accounts(id) ON DELETE SET NULL,
        notes TEXT NULL,
        created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
        updated_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_hr_eos_tenant_emp ON hr_end_of_service_settlements(tenant_id, employee_id);
      CREATE INDEX IF NOT EXISTS idx_hr_eos_settlement_no ON hr_end_of_service_settlements(tenant_id, settlement_no);
      CREATE INDEX IF NOT EXISTS idx_hr_eos_status ON hr_end_of_service_settlements(tenant_id, status);
    `.execute(db);
  },

  async down(db: Kysely<any>): Promise<void> {
    await sql`
      DROP TABLE IF EXISTS hr_end_of_service_settlements CASCADE;
    `.execute(db);
  },
};
