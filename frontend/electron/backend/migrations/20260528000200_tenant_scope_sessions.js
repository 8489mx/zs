"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
function demoTenantId() {
    return String(process.env.TENANT_ID || 'karimzakaria-demo').trim() || 'karimzakaria-demo';
}
function demoAccountId() {
    return String(process.env.ACCOUNT_ID || process.env.TENANT_ID || 'karimzakaria-demo').trim() || 'karimzakaria-demo';
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
        if (!(await tableExists(db, 'sessions')))
            return;
        const tenantId = demoTenantId();
        const accountId = demoAccountId();
        await (0, kysely_1.sql) `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT ''`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS account_id TEXT NOT NULL DEFAULT ''`.execute(db);
        await (0, kysely_1.sql) `UPDATE sessions SET tenant_id = ${tenantId} WHERE tenant_id = ''`.execute(db);
        await (0, kysely_1.sql) `UPDATE sessions SET account_id = ${accountId} WHERE account_id = ''`.execute(db);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_sessions_tenant_user_id ON sessions (tenant_id, user_id)`.execute(db);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_sessions_tenant_expires_at ON sessions (tenant_id, expires_at)`.execute(db);
    },
    async down(db) {
        if (!(await tableExists(db, 'sessions')))
            return;
        await (0, kysely_1.sql) `ALTER TABLE sessions DROP COLUMN IF EXISTS account_id`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE sessions DROP COLUMN IF EXISTS tenant_id`.execute(db);
    },
};
//# sourceMappingURL=20260528000200_tenant_scope_sessions.js.map