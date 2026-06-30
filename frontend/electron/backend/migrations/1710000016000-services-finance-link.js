"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await (0, kysely_1.sql) `ALTER TABLE services ADD COLUMN IF NOT EXISTS payment_channel TEXT NOT NULL DEFAULT 'cash'`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE services ADD COLUMN IF NOT EXISTS branch_id BIGINT NULL REFERENCES branches(id) ON DELETE SET NULL`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE services ADD COLUMN IF NOT EXISTS location_id BIGINT NULL REFERENCES stock_locations(id) ON DELETE SET NULL`.execute(db);
        await (0, kysely_1.sql) `UPDATE services SET payment_channel = 'cash' WHERE payment_channel IS NULL OR payment_channel NOT IN ('cash', 'card')`.execute(db);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_services_payment_channel ON services(payment_channel)`.execute(db);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_services_branch_location ON services(branch_id, location_id)`.execute(db);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_treasury_service_reference ON treasury_transactions(reference_type, reference_id)`.execute(db);
    },
    down: async (db) => {
        await (0, kysely_1.sql) `DELETE FROM treasury_transactions WHERE reference_type = 'service'`.execute(db);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_treasury_service_reference`.execute(db);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_services_branch_location`.execute(db);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_services_payment_channel`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE services DROP COLUMN IF EXISTS location_id`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE services DROP COLUMN IF EXISTS branch_id`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE services DROP COLUMN IF EXISTS payment_channel`.execute(db);
    },
};
//# sourceMappingURL=1710000016000-services-finance-link.js.map