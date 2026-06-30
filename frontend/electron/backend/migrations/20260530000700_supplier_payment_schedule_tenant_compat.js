"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
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
        if (await tableExists(db, 'supplier_payment_schedules')) {
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedules ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT ''`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedules ADD COLUMN IF NOT EXISTS account_id TEXT NOT NULL DEFAULT ''`.execute(db);
            await (0, kysely_1.sql) `
        UPDATE supplier_payment_schedules s
        SET tenant_id = COALESCE(NULLIF(sp.tenant_id, ''), ${tenantId})
        FROM suppliers sp
        WHERE sp.id = s.supplier_id
          AND COALESCE(s.tenant_id, '') = ''
      `.execute(db);
            await (0, kysely_1.sql) `UPDATE supplier_payment_schedules SET tenant_id = ${tenantId} WHERE COALESCE(tenant_id, '') = ''`.execute(db);
            await (0, kysely_1.sql) `
        UPDATE supplier_payment_schedules s
        SET account_id = COALESCE(NULLIF(sp.account_id, ''), ${accountId})
        FROM suppliers sp
        WHERE sp.id = s.supplier_id
          AND COALESCE(s.account_id, '') = ''
      `.execute(db);
            await (0, kysely_1.sql) `UPDATE supplier_payment_schedules SET account_id = ${accountId} WHERE COALESCE(account_id, '') = ''`.execute(db);
            await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS supplier_payment_schedules_tenant_idx ON supplier_payment_schedules (tenant_id)`.execute(db);
            await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS supplier_payment_schedules_tenant_supplier_idx ON supplier_payment_schedules (tenant_id, supplier_id)`.execute(db);
        }
        if (await tableExists(db, 'supplier_payment_schedule_logs')) {
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedule_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT ''`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedule_logs ADD COLUMN IF NOT EXISTS account_id TEXT NOT NULL DEFAULT ''`.execute(db);
            await (0, kysely_1.sql) `
        UPDATE supplier_payment_schedule_logs l
        SET tenant_id = COALESCE(
          NULLIF((SELECT s.tenant_id FROM supplier_payment_schedules s WHERE s.id = l.schedule_id LIMIT 1), ''),
          NULLIF((SELECT sp.tenant_id FROM suppliers sp WHERE sp.id = l.supplier_id LIMIT 1), ''),
          ${tenantId}
        )
        WHERE COALESCE(l.tenant_id, '') = ''
      `.execute(db);
            await (0, kysely_1.sql) `UPDATE supplier_payment_schedule_logs SET tenant_id = ${tenantId} WHERE COALESCE(tenant_id, '') = ''`.execute(db);
            await (0, kysely_1.sql) `
        UPDATE supplier_payment_schedule_logs l
        SET account_id = COALESCE(
          NULLIF((SELECT s.account_id FROM supplier_payment_schedules s WHERE s.id = l.schedule_id LIMIT 1), ''),
          NULLIF((SELECT sp.account_id FROM suppliers sp WHERE sp.id = l.supplier_id LIMIT 1), ''),
          ${accountId}
        )
        WHERE COALESCE(l.account_id, '') = ''
      `.execute(db);
            await (0, kysely_1.sql) `UPDATE supplier_payment_schedule_logs SET account_id = ${accountId} WHERE COALESCE(account_id, '') = ''`.execute(db);
            await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS supplier_payment_schedule_logs_tenant_idx ON supplier_payment_schedule_logs (tenant_id)`.execute(db);
            await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS supplier_payment_schedule_logs_tenant_schedule_idx ON supplier_payment_schedule_logs (tenant_id, schedule_id)`.execute(db);
        }
    },
    async down(db) {
        if (await tableExists(db, 'supplier_payment_schedule_logs')) {
            await (0, kysely_1.sql) `DROP INDEX IF EXISTS supplier_payment_schedule_logs_tenant_schedule_idx`.execute(db);
            await (0, kysely_1.sql) `DROP INDEX IF EXISTS supplier_payment_schedule_logs_tenant_idx`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedule_logs DROP COLUMN IF EXISTS account_id`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedule_logs DROP COLUMN IF EXISTS tenant_id`.execute(db);
        }
        if (await tableExists(db, 'supplier_payment_schedules')) {
            await (0, kysely_1.sql) `DROP INDEX IF EXISTS supplier_payment_schedules_tenant_supplier_idx`.execute(db);
            await (0, kysely_1.sql) `DROP INDEX IF EXISTS supplier_payment_schedules_tenant_idx`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedules DROP COLUMN IF EXISTS account_id`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedules DROP COLUMN IF EXISTS tenant_id`.execute(db);
        }
    },
};
//# sourceMappingURL=20260530000700_supplier_payment_schedule_tenant_compat.js.map