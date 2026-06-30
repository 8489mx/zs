"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await (0, kysely_1.sql) `
      CREATE TABLE IF NOT EXISTS pricing_rules (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        supplier_id INTEGER NULL REFERENCES suppliers(id) ON DELETE SET NULL,
        category_id INTEGER NULL REFERENCES product_categories(id) ON DELETE SET NULL,
        item_kind TEXT NULL,
        style_code TEXT NULL,
        operation_type TEXT NOT NULL,
        operation_value NUMERIC(12,2) NOT NULL DEFAULT 0,
        targets_json TEXT NOT NULL,
        rounding_mode TEXT NOT NULL DEFAULT 'none',
        rounding_nearest_step NUMERIC(12,2) NULL,
        rounding_ending INTEGER NULL,
        options_json TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT pricing_rules_item_kind_valid CHECK (item_kind IS NULL OR item_kind IN ('standard','fashion')),
        CONSTRAINT pricing_rules_operation_valid CHECK (operation_type IN ('percent_increase','percent_decrease','fixed_increase','fixed_decrease','set_price','margin_from_cost')),
        CONSTRAINT pricing_rules_rounding_valid CHECK (rounding_mode IN ('none','nearest','ending'))
      )
    `.execute(db);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_pricing_rules_supplier_id ON pricing_rules(supplier_id)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_pricing_rules_category_id ON pricing_rules(category_id)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_pricing_rules_item_kind ON pricing_rules(item_kind)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_pricing_rules_style_code ON pricing_rules(style_code)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_pricing_rules_is_active ON pricing_rules(is_active)`.execute(db).catch(() => undefined);
    },
    down: async (db) => {
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_pricing_rules_is_active`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_pricing_rules_style_code`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_pricing_rules_item_kind`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_pricing_rules_category_id`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_pricing_rules_supplier_id`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP TABLE IF EXISTS pricing_rules`.execute(db).catch(() => undefined);
    },
};
//# sourceMappingURL=1710000011000-pricing-rules.js.map