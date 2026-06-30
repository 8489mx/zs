"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    async up(db) {
        await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedules ALTER COLUMN purchase_id DROP NOT NULL`.execute(db);
    },
    async down(db) {
        await (0, kysely_1.sql) `DELETE FROM supplier_payment_schedules WHERE purchase_id IS NULL`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE supplier_payment_schedules ALTER COLUMN purchase_id SET NOT NULL`.execute(db);
    },
};
//# sourceMappingURL=20260517000110_supplier_balance_schedules.js.map