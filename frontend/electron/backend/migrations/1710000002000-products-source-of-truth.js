"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await (0, kysely_1.sql) `
      UPDATE products
      SET
        cost_price = COALESCE(NULLIF(cost_price, 0), cost, 0),
        retail_price = COALESCE(NULLIF(retail_price, 0), price, 0),
        stock_qty = COALESCE(stock_qty, stock, 0),
        min_stock_qty = COALESCE(min_stock_qty, 0)
    `.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE products DROP COLUMN IF EXISTS price`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE products DROP COLUMN IF EXISTS cost`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE products DROP COLUMN IF EXISTS stock`.execute(db);
    },
    down: async (db) => {
        await (0, kysely_1.sql) `ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC(14,2) NOT NULL DEFAULT 0`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE products ADD COLUMN IF NOT EXISTS cost NUMERIC(14,2) NOT NULL DEFAULT 0`.execute(db);
        await (0, kysely_1.sql) `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock NUMERIC(14,3) NOT NULL DEFAULT 0`.execute(db);
        await (0, kysely_1.sql) `UPDATE products SET price = retail_price, cost = cost_price, stock = stock_qty`.execute(db);
    },
};
//# sourceMappingURL=1710000002000-products-source-of-truth.js.map