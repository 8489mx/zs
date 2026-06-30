"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
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
async function columnExists(db, table, column) {
    const result = await (0, kysely_1.sql) `
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = ${table}
        and column_name = ${column}
    ) as exists
  `.execute(db);
    return Boolean(result.rows[0]?.exists);
}
exports.migration = {
    async up(db) {
        if (await tableExists(db, 'supplier_payment_schedules')) {
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedules ADD COLUMN IF NOT EXISTS tenant_id TEXT`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedules ADD COLUMN IF NOT EXISTS account_id TEXT`.execute(db);
            if (await columnExists(db, 'suppliers', 'tenant_id')) {
                await (0, kysely_1.sql) `
          UPDATE supplier_payment_schedules s
          SET tenant_id = sp.tenant_id
          FROM suppliers sp
          WHERE sp.id = s.supplier_id
            AND sp.tenant_id IS NOT NULL
            AND sp.tenant_id <> ''
        `.execute(db);
            }
            if (await columnExists(db, 'purchases', 'tenant_id')) {
                await (0, kysely_1.sql) `
          UPDATE supplier_payment_schedules s
          SET tenant_id = p.tenant_id
          FROM purchases p
          WHERE p.id = s.purchase_id
            AND p.tenant_id IS NOT NULL
            AND p.tenant_id <> ''
            AND COALESCE(s.tenant_id, '') = ''
        `.execute(db);
            }
            if (await columnExists(db, 'suppliers', 'account_id')) {
                await (0, kysely_1.sql) `
          UPDATE supplier_payment_schedules s
          SET account_id = sp.account_id
          FROM suppliers sp
          WHERE sp.id = s.supplier_id
            AND sp.account_id IS NOT NULL
            AND sp.account_id <> ''
        `.execute(db);
            }
            if (await columnExists(db, 'purchases', 'account_id')) {
                await (0, kysely_1.sql) `
          UPDATE supplier_payment_schedules s
          SET account_id = p.account_id
          FROM purchases p
          WHERE p.id = s.purchase_id
            AND p.account_id IS NOT NULL
            AND p.account_id <> ''
            AND COALESCE(s.account_id, '') = ''
        `.execute(db);
            }
            await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS supplier_payment_schedules_tenant_idx ON supplier_payment_schedules (tenant_id)`.execute(db);
            await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS supplier_payment_schedules_tenant_supplier_idx ON supplier_payment_schedules (tenant_id, supplier_id)`.execute(db);
            await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS supplier_payment_schedules_tenant_purchase_idx ON supplier_payment_schedules (tenant_id, purchase_id)`.execute(db);
        }
        if (await tableExists(db, 'supplier_payment_schedule_logs')) {
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedule_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedule_logs ADD COLUMN IF NOT EXISTS account_id TEXT`.execute(db);
            if (await columnExists(db, 'supplier_payment_schedules', 'tenant_id')) {
                await (0, kysely_1.sql) `
          UPDATE supplier_payment_schedule_logs l
          SET tenant_id = s.tenant_id
          FROM supplier_payment_schedules s
          WHERE s.id = l.schedule_id
            AND s.tenant_id IS NOT NULL
            AND s.tenant_id <> ''
        `.execute(db);
            }
            if (await columnExists(db, 'suppliers', 'tenant_id')) {
                await (0, kysely_1.sql) `
          UPDATE supplier_payment_schedule_logs l
          SET tenant_id = sp.tenant_id
          FROM suppliers sp
          WHERE sp.id = l.supplier_id
            AND sp.tenant_id IS NOT NULL
            AND sp.tenant_id <> ''
            AND COALESCE(l.tenant_id, '') = ''
        `.execute(db);
            }
            if (await columnExists(db, 'supplier_payment_schedules', 'account_id')) {
                await (0, kysely_1.sql) `
          UPDATE supplier_payment_schedule_logs l
          SET account_id = s.account_id
          FROM supplier_payment_schedules s
          WHERE s.id = l.schedule_id
            AND s.account_id IS NOT NULL
            AND s.account_id <> ''
        `.execute(db);
            }
            if (await columnExists(db, 'suppliers', 'account_id')) {
                await (0, kysely_1.sql) `
          UPDATE supplier_payment_schedule_logs l
          SET account_id = sp.account_id
          FROM suppliers sp
          WHERE sp.id = l.supplier_id
            AND sp.account_id IS NOT NULL
            AND sp.account_id <> ''
            AND COALESCE(l.account_id, '') = ''
        `.execute(db);
            }
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
            await (0, kysely_1.sql) `DROP INDEX IF EXISTS supplier_payment_schedules_tenant_purchase_idx`.execute(db);
            await (0, kysely_1.sql) `DROP INDEX IF EXISTS supplier_payment_schedules_tenant_supplier_idx`.execute(db);
            await (0, kysely_1.sql) `DROP INDEX IF EXISTS supplier_payment_schedules_tenant_idx`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedules DROP COLUMN IF EXISTS account_id`.execute(db);
            await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedules DROP COLUMN IF EXISTS tenant_id`.execute(db);
        }
    },
};
//# sourceMappingURL=20260530000800_supplier_payment_schedule_tenant_backfill_strict.js.map