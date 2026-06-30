"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await (0, kysely_1.sql) `
      CREATE TABLE IF NOT EXISTS price_change_runs (
        id SERIAL PRIMARY KEY,
        filters_json TEXT NOT NULL DEFAULT '{}',
        operation_json TEXT NOT NULL DEFAULT '{}',
        options_json TEXT NOT NULL DEFAULT '{}',
        summary_json TEXT NOT NULL DEFAULT '{}',
        affected_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'applied',
        created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        undone_at TIMESTAMP NULL,
        undone_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL
      )
    `.execute(db);
        await (0, kysely_1.sql) `
      CREATE TABLE IF NOT EXISTS price_change_items (
        id SERIAL PRIMARY KEY,
        run_id INTEGER NOT NULL REFERENCES price_change_runs(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        old_retail_price NUMERIC(14,2) NOT NULL,
        new_retail_price NUMERIC(14,2) NOT NULL,
        old_wholesale_price NUMERIC(14,2) NOT NULL,
        new_wholesale_price NUMERIC(14,2) NOT NULL,
        has_active_offer BOOLEAN NOT NULL DEFAULT FALSE,
        has_customer_price BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `.execute(db);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_price_change_runs_created_at ON price_change_runs(created_at DESC)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_price_change_items_run_id ON price_change_items(run_id)`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `CREATE INDEX IF NOT EXISTS idx_price_change_items_product_id ON price_change_items(product_id)`.execute(db).catch(() => undefined);
    },
    down: async (db) => {
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_price_change_items_product_id`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_price_change_items_run_id`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP INDEX IF EXISTS idx_price_change_runs_created_at`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP TABLE IF EXISTS price_change_items`.execute(db).catch(() => undefined);
        await (0, kysely_1.sql) `DROP TABLE IF EXISTS price_change_runs`.execute(db).catch(() => undefined);
    },
};
//# sourceMappingURL=1710000009000-pricing-center.js.map