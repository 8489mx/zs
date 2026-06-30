"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    async up(db) {
        await db.schema
            .createTable('purchase_attachments')
            .ifNotExists()
            .addColumn('id', 'serial', (col) => col.primaryKey())
            .addColumn('purchase_id', 'integer', (col) => col.notNull().references('purchases.id').onDelete('cascade'))
            .addColumn('file_name', 'text', (col) => col.notNull())
            .addColumn('file_url', 'text', (col) => col.notNull())
            .addColumn('file_size', 'integer', (col) => col.notNull())
            .addColumn('file_type', 'text', (col) => col.notNull())
            .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo((0, kysely_1.sql) `now()`))
            .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo((0, kysely_1.sql) `now()`))
            .execute();
        await db.schema
            .createIndex('purchase_attachments_purchase_id_idx')
            .ifNotExists()
            .on('purchase_attachments')
            .column('purchase_id')
            .execute();
    },
    async down(db) {
        await db.schema.dropIndex('purchase_attachments_purchase_id_idx').ifExists().execute();
        await db.schema.dropTable('purchase_attachments').ifExists().execute();
    },
};
//# sourceMappingURL=20260602000200_purchase_attachments.js.map