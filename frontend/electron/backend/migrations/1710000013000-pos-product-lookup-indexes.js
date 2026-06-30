"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_products_active_barcode ON products(barcode) WHERE is_active = true AND barcode IS NOT NULL AND barcode <> ''`.execute(db);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_product_units_barcode ON product_units(barcode) WHERE barcode IS NOT NULL AND barcode <> ''`.execute(db);
    },
    down: async (db) => {
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_product_units_barcode`.execute(db);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_products_active_barcode`.execute(db);
    },
};
//# sourceMappingURL=1710000013000-pos-product-lookup-indexes.js.map