"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await (0, kysely_1.sql) `ALTER TABLE hr_employee_loans ADD COLUMN IF NOT EXISTS repayment_mode TEXT NOT NULL DEFAULT 'manual_cash'`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE hr_employee_loans ADD COLUMN IF NOT EXISTS monthly_installment_amount NUMERIC(12,2) NULL`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE hr_employee_loans ADD COLUMN IF NOT EXISTS salary_due_date DATE NULL`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE hr_employee_ledger ADD COLUMN IF NOT EXISTS repayment_method TEXT NULL`.execute(db);
        await (0, kysely_1.sql) `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'hr_employee_loans_repayment_mode_valid'
        ) THEN
          ALTER TABLE hr_employee_loans
          ADD CONSTRAINT hr_employee_loans_repayment_mode_valid
          CHECK (repayment_mode IN ('deduct_next_salary','monthly_salary_installment','manual_cash'));
        END IF;
      END $$;
    `.execute(db);
        await (0, kysely_1.sql) `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'hr_employee_ledger_repayment_method_valid'
        ) THEN
          ALTER TABLE hr_employee_ledger
          ADD CONSTRAINT hr_employee_ledger_repayment_method_valid
          CHECK (repayment_method IS NULL OR repayment_method IN ('manual_cash','salary_deduction'));
        END IF;
      END $$;
    `.execute(db);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_hr_loans_repayment_mode ON hr_employee_loans(repayment_mode)`.execute(db);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_hr_ledger_repayment_method ON hr_employee_ledger(repayment_method)`.execute(db);
    },
    down: async (db) => {
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_hr_ledger_repayment_method`.execute(db);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_hr_loans_repayment_mode`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE hr_employee_ledger DROP CONSTRAINT IF EXISTS hr_employee_ledger_repayment_method_valid`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE hr_employee_loans DROP CONSTRAINT IF EXISTS hr_employee_loans_repayment_mode_valid`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE hr_employee_ledger DROP COLUMN IF EXISTS repayment_method`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE hr_employee_loans DROP COLUMN IF EXISTS salary_due_date`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE hr_employee_loans DROP COLUMN IF EXISTS monthly_installment_amount`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE hr_employee_loans DROP COLUMN IF EXISTS repayment_mode`.execute(db);
    },
};
//# sourceMappingURL=1710000017100-hr-withdrawal-repayment-mode.js.map