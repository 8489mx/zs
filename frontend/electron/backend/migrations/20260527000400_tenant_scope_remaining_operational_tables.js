"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
const TABLES = [
    'branches',
    'stock_locations',
    'user_branches',
    'settings',
    'audit_logs',
    'cashier_shifts',
    'sale_payments',
    'held_sales',
    'held_sale_items',
    'customer_payments',
    'supplier_payments',
    'product_pricing_profiles',
    'pricing_rules',
    'price_change_runs',
    'price_change_items',
    'stock_transfers',
    'stock_transfer_items',
    'stock_count_sessions',
    'stock_count_items',
    'damaged_stock_records',
    'hr_departments',
    'hr_job_titles',
    'hr_positions',
    'hr_employees',
    'hr_employee_contacts',
    'hr_employee_documents',
    'hr_employment_contracts',
    'hr_compensation_packages',
    'hr_employee_loans',
    'hr_employee_loan_installments',
    'hr_employee_ledger',
    'hr_attendance_records',
    'hr_attendance_exceptions',
    'hr_leave_types',
    'hr_leave_requests',
    'hr_employee_assets',
    'hr_payroll_runs',
    'hr_payroll_run_items',
    'hr_payroll_item_adjustments',
];
function demoTenantId() {
    return String(process.env.TENANT_ID || 'karimzakaria-demo').trim() || 'karimzakaria-demo';
}
function demoAccountId() {
    return String(process.env.ACCOUNT_ID || demoTenantId()).trim() || demoTenantId();
}
async function tableExists(db, table) {
    const result = await (0, kysely_1.sql) `
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = ${table}
    ) as exists
  `.execute(db);
    return Boolean(result.rows[0]?.exists);
}
exports.migration = {
    async up(db) {
        const tenantId = demoTenantId();
        const accountId = demoAccountId();
        for (const table of TABLES) {
            if (!(await tableExists(db, table)))
                continue;
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT ''`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} ADD COLUMN IF NOT EXISTS account_id TEXT NOT NULL DEFAULT ''`.execute(db);
            await (0, kysely_1.sql) `UPDATE ${kysely_1.sql.table(table)} SET tenant_id = ${tenantId} WHERE tenant_id = ''`.execute(db);
            await (0, kysely_1.sql) `UPDATE ${kysely_1.sql.table(table)} SET account_id = ${accountId} WHERE account_id = ''`.execute(db);
        }
    },
    async down(db) {
        for (const table of [...TABLES].reverse()) {
            if (!(await tableExists(db, table)))
                continue;
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} DROP COLUMN IF EXISTS account_id`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} DROP COLUMN IF EXISTS tenant_id`.execute(db);
        }
    },
};
//# sourceMappingURL=20260527000400_tenant_scope_remaining_operational_tables.js.map