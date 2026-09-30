import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000178: Automated Reordering Rules (قواعد إعادة الطلب التلقائي وتوليد أوامر الشراء)
 *
 * Implements Odoo 17/18-standard Automated Reordering Rules (Min-Max Inventory Control):
 * - reordering_rules table
 * - Links product, warehouse/location, preferred supplier, min_qty, max_qty, qty_multiple
 * - Auto-trigger modes: 'auto_draft_po' | 'manual_review'
 * - Tracks execution timestamps, trigger statuses, and generated PO IDs
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await db.schema
      .createTable('reordering_rules')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('product_id', 'integer', (col) => col.notNull())
      .addColumn('warehouse_id', 'integer')
      .addColumn('branch_id', 'integer')
      .addColumn('min_qty', 'numeric(14, 3)', (col) => col.notNull().defaultTo('0'))
      .addColumn('max_qty', 'numeric(14, 3)', (col) => col.notNull().defaultTo('0'))
      .addColumn('qty_multiple', 'numeric(14, 3)', (col) => col.notNull().defaultTo('1'))
      .addColumn('preferred_supplier_id', 'integer')
      .addColumn('action_mode', 'varchar(40)', (col) => col.notNull().defaultTo('auto_draft_po'))
      .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
      .addColumn('last_run_at', 'timestamptz')
      .addColumn('last_trigger_status', 'varchar(50)', (col) => col.defaultTo('normal'))
      .addColumn('last_generated_po_id', 'integer')
      .addColumn('notes', 'text')
      .addColumn('created_by', 'integer')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // Composite indexes for rapid evaluation and tenant isolation
    await db.schema
      .createIndex('idx_reordering_rules_tenant_product')
      .on('reordering_rules')
      .columns(['tenant_id', 'product_id'])
      .execute();

    await db.schema
      .createIndex('idx_reordering_rules_tenant_active')
      .on('reordering_rules')
      .columns(['tenant_id', 'is_active'])
      .execute();

    await db.schema
      .createIndex('idx_reordering_rules_tenant_warehouse')
      .on('reordering_rules')
      .columns(['tenant_id', 'warehouse_id'])
      .execute();

    await db.schema
      .createIndex('idx_reordering_rules_tenant_supplier')
      .on('reordering_rules')
      .columns(['tenant_id', 'preferred_supplier_id'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('reordering_rules').ifExists().execute();
  },
};
