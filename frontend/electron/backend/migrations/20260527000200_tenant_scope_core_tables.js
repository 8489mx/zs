"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
const TABLES = [
    'product_categories',
    'suppliers',
    'customers',
    'products',
    'product_units',
    'product_offers',
    'product_customer_prices',
    'sales',
    'sale_items',
    'purchases',
    'purchase_items',
    'customer_ledger',
    'supplier_ledger',
    'stock_movements',
    'product_location_stock',
];
function demoTenantId() {
    return String(process.env.TENANT_ID || 'karimzakaria-demo').trim() || 'karimzakaria-demo';
}
function demoAccountId() {
    return String(process.env.ACCOUNT_ID || demoTenantId()).trim() || demoTenantId();
}
exports.migration = {
    async up(db) {
        const tenantId = demoTenantId();
        const accountId = demoAccountId();
        for (const table of TABLES) {
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT ''`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} ADD COLUMN IF NOT EXISTS account_id TEXT NOT NULL DEFAULT ''`.execute(db);
            await (0, kysely_1.sql) `UPDATE ${kysely_1.sql.table(table)} SET tenant_id = ${tenantId} WHERE tenant_id = ''`.execute(db);
            await (0, kysely_1.sql) `UPDATE ${kysely_1.sql.table(table)} SET account_id = ${accountId} WHERE account_id = ''`.execute(db);
        }
    },
    async down(db) {
        for (const table of [...TABLES].reverse()) {
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} DROP COLUMN IF EXISTS account_id`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} DROP COLUMN IF EXISTS tenant_id`.execute(db);
        }
    },
};
//# sourceMappingURL=20260527000200_tenant_scope_core_tables.js.map