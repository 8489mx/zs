"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
const upStatements = [
    'ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS national_id TEXT NULL',
];
const downStatements = [
    'ALTER TABLE hr_employees DROP COLUMN IF EXISTS national_id',
];
exports.migration = {
    up: async (db) => {
        for (const statement of upStatements) {
            await kysely_1.sql.raw(statement).execute(db);
        }
    },
    down: async (db) => {
        for (const statement of downStatements) {
            await kysely_1.sql.raw(statement).execute(db);
        }
    },
};
//# sourceMappingURL=1710000017300-hr-employee-national-id.js.map