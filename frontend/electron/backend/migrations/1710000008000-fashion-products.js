"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await (0, kysely_1.sql) `ALTER TABLE products ADD COLUMN IF NOT EXISTS item_kind TEXT NOT NULL DEFAULT 'standard'`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE products ADD COLUMN IF NOT EXISTS style_code TEXT`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE products ADD COLUMN IF NOT EXISTS color TEXT`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE products ADD COLUMN IF NOT EXISTS size TEXT`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE products DROP CONSTRAINT IF EXISTS products_item_kind_valid`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `ALTER TABLE products ADD CONSTRAINT products_item_kind_valid CHECK (item_kind IN ('standard','fashion'))`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_products_item_kind ON products(item_kind)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_products_style_code ON products(style_code)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_products_color_size ON products(color, size)`.execute(db).catch(() => undefined);
    },
    down: async (db) => {
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_products_color_size`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_products_style_code`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_products_item_kind`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `ALTER TABLE products DROP CONSTRAINT IF EXISTS products_item_kind_valid`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `ALTER TABLE products DROP COLUMN IF EXISTS size`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `ALTER TABLE products DROP COLUMN IF EXISTS color`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `ALTER TABLE products DROP COLUMN IF EXISTS style_code`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `ALTER TABLE products DROP COLUMN IF EXISTS item_kind`.execute(db).catch(() => undefined);
    },
};
//# sourceMappingURL=1710000008000-fashion-products.js.map