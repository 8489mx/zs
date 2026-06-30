"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_products_stock_qty ON products(stock_qty)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_product_offers_product_id ON product_offers(product_id)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_product_customer_prices_product_id ON product_customer_prices(product_id)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_price_change_runs_status_id ON price_change_runs(status, id DESC)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_product_pricing_profiles_group_mode ON product_pricing_profiles(pricing_group_key, pricing_mode)`.execute(db).catch(() => undefined);
    },
    down: async (db) => {
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_product_pricing_profiles_group_mode`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_price_change_runs_status_id`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_product_customer_prices_product_id`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_product_offers_product_id`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_products_stock_qty`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_products_is_active`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_products_category_id`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_products_supplier_id`.execute(db).catch(() => undefined);
    },
};
//# sourceMappingURL=1710000012000-pricing-performance-indexes.js.map