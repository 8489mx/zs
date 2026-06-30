"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await (0, kysely_1.sql) `
      CREATE TABLE IF NOT EXISTS product_pricing_profiles (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
        pricing_group_key TEXT NULL,
        pricing_mode TEXT NOT NULL DEFAULT 'standard',
        created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT product_pricing_profiles_mode_valid CHECK (pricing_mode IN ('standard','inherit','manual'))
      )
    `.execute(db);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_product_pricing_profiles_group_key ON product_pricing_profiles(pricing_group_key)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_product_pricing_profiles_mode ON product_pricing_profiles(pricing_mode)`.execute(db).catch(() => undefined);
    },
    down: async (db) => {
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_product_pricing_profiles_mode`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_product_pricing_profiles_group_key`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP TABLE IF EXISTS product_pricing_profiles`.execute(db).catch(() => undefined);
    },
};
//# sourceMappingURL=1710000010000-pricing-profiles.js.map