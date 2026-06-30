"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    up: async (db) => {
        await db.schema
            .createTable('_phase1_bootstrap')
            .ifNotExists()
            .addColumn('id', 'integer', (col) => col.primaryKey())
            .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo((0, kysely_1.sql) `now()`))
            .execute();
        await db
            .insertInto('_phase1_bootstrap')
            .values({ id: 1 })
            .onConflict((oc) => oc.column('id').doNothing())
            .execute();
    },
    down: async (db) => {
        await db.schema.dropTable('_phase1_bootstrap').ifExists().execute();
    },
};
//# sourceMappingURL=1710000000000-init-bootstrap.js.map