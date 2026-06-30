"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
const TABLES = [
    'expenses',
    'return_documents',
    'return_items',
    'treasury_transactions',
    'services',
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
//# sourceMappingURL=20260527000300_tenant_scope_reporting_tables.js.map