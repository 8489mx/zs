"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await (0, kysely_1.sql) `
      CREATE INDEX IF NOT EXISTS idx_product_offers_checkout_active_window
      ON product_offers(product_id, start_date, end_date)
      WHERE is_active = true
    `.execute(db);
    },
    down: async (db) => {
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_product_offers_checkout_active_window`.execute(db);
    },
};
//# sourceMappingURL=1710000013500-product-offers-checkout-index.js.map