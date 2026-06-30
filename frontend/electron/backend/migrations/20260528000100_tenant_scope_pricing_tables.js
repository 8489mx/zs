"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
const DEFAULT_TENANT = process.env.TENANT_ID || 'karimzakaria-demo';
const DEFAULT_ACCOUNT = process.env.ACCOUNT_ID || process.env.TENANT_ID || 'karimzakaria-demo';
exports.migration = {
    up: async (db) => {
        for (const table of ['product_pricing_profiles', 'price_change_runs', 'price_change_items', 'pricing_rules']) {
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} ADD COLUMN IF NOT EXISTS tenant_id TEXT`.execute(db).catch(() => undefined);
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} ADD COLUMN IF NOT EXISTS account_id TEXT`.execute(db).catch(() => undefined);
            await (0, kysely_1.sql) `UPDATE ${kysely_1.sql.table(table)} SET tenant_id = ${DEFAULT_TENANT} WHERE tenant_id IS NULL OR tenant_id = ''`.execute(db).catch(() => undefined);
            await (0, kysely_1.sql) `UPDATE ${kysely_1.sql.table(table)} SET account_id = ${DEFAULT_ACCOUNT} WHERE account_id IS NULL OR account_id = ''`.execute(db).catch(() => undefined);
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} ALTER COLUMN tenant_id SET NOT NULL`.execute(db).catch(() => undefined);
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} ALTER COLUMN account_id SET NOT NULL`.execute(db).catch(() => undefined);
        }
        await (0, kysely_1.sql) `
      DO $$
      DECLARE constraint_name text;
      BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute attr ON attr.attrelid = rel.oid AND attr.attnum = ANY(con.conkey)
        WHERE rel.relname = 'product_pricing_profiles'
          AND con.contype = 'u'
          AND attr.attname = 'product_id'
        LIMIT 1;
        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE product_pricing_profiles DROP CONSTRAINT IF EXISTS %I', constraint_name);
        END IF;
      END $$;
    `.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE UNIQUE INDEX IF NOT EXISTS idx_product_pricing_profiles_tenant_product ON product_pricing_profiles(tenant_id, product_id)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_product_pricing_profiles_tenant_group ON product_pricing_profiles(tenant_id, pricing_group_key)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_price_change_runs_tenant_status ON price_change_runs(tenant_id, status, id DESC)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_price_change_items_tenant_run ON price_change_items(tenant_id, run_id)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant_active ON pricing_rules(tenant_id, is_active, id DESC)`.execute(db).catch(() => undefined);
    },
    down: async (db) => {
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_pricing_rules_tenant_active`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_price_change_items_tenant_run`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_price_change_runs_tenant_status`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_product_pricing_profiles_tenant_group`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_product_pricing_profiles_tenant_product`.execute(db).catch(() => undefined);
        for (const table of ['product_pricing_profiles', 'price_change_runs', 'price_change_items', 'pricing_rules']) {
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} DROP COLUMN IF EXISTS account_id`.execute(db).catch(() => undefined);
            await (0, kysely_1.sql) `ALTER TABLE ${kysely_1.sql.table(table)} DROP COLUMN IF EXISTS tenant_id`.execute(db).catch(() => undefined);
        }
    },
};
//# sourceMappingURL=20260528000100_tenant_scope_pricing_tables.js.map