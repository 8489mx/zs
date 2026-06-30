"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await (0, kysely_1.sql) `
      ALTER TABLE hr_positions
      ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT ''
    `.execute(db);
        await (0, kysely_1.sql) `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_positions_code_unique
      ON hr_positions(code)
      WHERE code <> ''
    `.execute(db);
    },
};
//# sourceMappingURL=1710000026000-hr-positions-code-column.js.map