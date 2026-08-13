import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Add tracking dates and expense links to import_shipments
    await db.schema
      .alterTable('import_shipments')
      .addColumn('shipped_date', 'date')
      .addColumn('eta_date', 'date')
      .addColumn('clearance_date', 'date')
      .addColumn('shipping_expense_id', 'integer', (col) => col.references('expenses.id').onDelete('set null'))
      .addColumn('customs_expense_id', 'integer', (col) => col.references('expenses.id').onDelete('set null'))
      .addColumn('transport_expense_id', 'integer', (col) => col.references('expenses.id').onDelete('set null'))
      .execute();

    // 2. Add received quantity and target margin to import_shipment_items
    await db.schema
      .alterTable('import_shipment_items')
      .addColumn('received_quantity', 'decimal')
      .addColumn('target_margin_percent', 'decimal')
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema
      .alterTable('import_shipment_items')
      .dropColumn('target_margin_percent')
      .dropColumn('received_quantity')
      .execute();

    await db.schema
      .alterTable('import_shipments')
      .dropColumn('transport_expense_id')
      .dropColumn('customs_expense_id')
      .dropColumn('shipping_expense_id')
      .dropColumn('clearance_date')
      .dropColumn('eta_date')
      .dropColumn('shipped_date')
      .execute();
  },
};
