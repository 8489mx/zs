"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await (0, kysely_1.sql) `
      ALTER TABLE hr_employee_assets
      ADD COLUMN IF NOT EXISTS custody_kind VARCHAR(16) NOT NULL DEFAULT 'physical'
    `.execute(db);
        await (0, kysely_1.sql) `
      ALTER TABLE hr_employee_assets
      ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0
    `.execute(db);
        await (0, kysely_1.sql) `
      ALTER TABLE hr_employee_assets
      ADD COLUMN IF NOT EXISTS spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0
    `.execute(db);
        await (0, kysely_1.sql) `
      ALTER TABLE hr_employee_assets
      ADD COLUMN IF NOT EXISTS returned_amount NUMERIC(12,2) NOT NULL DEFAULT 0
    `.execute(db);
        await (0, kysely_1.sql) `
      ALTER TABLE hr_employee_assets
      ADD COLUMN IF NOT EXISTS settled_at DATE NULL
    `.execute(db);
        await (0, kysely_1.sql) `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_hr_employee_assets_custody_kind'
        ) THEN
          ALTER TABLE hr_employee_assets
          ADD CONSTRAINT chk_hr_employee_assets_custody_kind
          CHECK (custody_kind IN ('physical', 'cash'));
        END IF;
      END $$
    `.execute(db);
        await (0, kysely_1.sql) `
      CREATE INDEX IF NOT EXISTS idx_hr_employee_assets_custody_kind
      ON hr_employee_assets(custody_kind)
    `.execute(db);
        await (0, kysely_1.sql) `
      CREATE INDEX IF NOT EXISTS idx_hr_employee_assets_status
      ON hr_employee_assets(status)
    `.execute(db);
    },
};
//# sourceMappingURL=1710000027000-hr-cash-custody.js.map