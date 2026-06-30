"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
exports.migration = {
    up: async (db) => {
        await db.schema
            .alterTable('products')
            .addColumn('item_type', 'varchar', (col) => col.notNull().defaultTo('product'))
            .execute();
        await db.schema
            .createIndex('idx_products_item_type')
            .on('products')
            .column('item_type')
            .execute();
    },
    down: async (db) => {
        await db.schema.dropIndex('idx_products_item_type').execute();
        await db.schema
            .alterTable('products')
            .dropColumn('item_type')
            .execute();
    }
};
//# sourceMappingURL=20260620000100_add_item_type_to_products.js.map