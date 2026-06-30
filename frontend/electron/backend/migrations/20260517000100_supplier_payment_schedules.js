"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const kysely_1 = require("kysely");
exports.migration = {
    async up(db) {
        await db.schema
            .createTable('supplier_payment_schedules')
            .ifNotExists()
            .addColumn('id', 'serial', (col) => col.primaryKey())
            .addColumn('purchase_id', 'integer', (col) => col.notNull().references('purchases.id').onDelete('cascade'))
            .addColumn('supplier_id', 'integer', (col) => col.notNull().references('suppliers.id'))
            .addColumn('installment_no', 'integer', (col) => col.notNull())
            .addColumn('due_date', 'date', (col) => col.notNull())
            .addColumn('amount', 'numeric', (col) => col.notNull())
            .addColumn('paid_amount', 'numeric', (col) => col.notNull().defaultTo(0))
            .addColumn('status', 'varchar(20)', (col) => col.notNull().defaultTo('pending'))
            .addColumn('note', 'text', (col) => col.notNull().defaultTo(''))
            .addColumn('paid_at', 'timestamptz')
            .addColumn('created_by', 'integer', (col) => col.references('users.id'))
            .addColumn('updated_by', 'integer', (col) => col.references('users.id'))
            .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo((0, kysely_1.sql) `now()`))
            .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo((0, kysely_1.sql) `now()`))
            .execute();
        await db.schema
            .createIndex('supplier_payment_schedules_purchase_idx')
            .ifNotExists()
            .on('supplier_payment_schedules')
            .column('purchase_id')
            .execute();
        await db.schema
            .createIndex('supplier_payment_schedules_supplier_due_idx')
            .ifNotExists()
            .on('supplier_payment_schedules')
            .columns(['supplier_id', 'due_date'])
            .execute();
    },
    async down(db) {
        await db.schema.dropTable('supplier_payment_schedules').ifExists().execute();
    },
};
//# sourceMappingURL=20260517000100_supplier_payment_schedules.js.map