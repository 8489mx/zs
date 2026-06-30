"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    async up(db) {
        await db.schema
            .createTable('auth_rate_limits')
            .ifNotExists()
            .addColumn('key', 'text', (col) => col.primaryKey())
            .addColumn('count', 'integer', (col) => col.notNull())
            .addColumn('reset_at', 'timestamptz', (col) => col.notNull())
            .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo((0, kysely_1.sql) `now()`))
            .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo((0, kysely_1.sql) `now()`))
            .execute();
        await db.schema
            .createIndex('auth_rate_limits_reset_at_idx')
            .ifNotExists()
            .on('auth_rate_limits')
            .column('reset_at')
            .execute();
    },
    async down(db) {
        await db.schema.dropIndex('auth_rate_limits_reset_at_idx').ifExists().execute();
        await db.schema.dropTable('auth_rate_limits').ifExists().execute();
    },
};
//# sourceMappingURL=20260601000300_auth_rate_limits_table.js.map