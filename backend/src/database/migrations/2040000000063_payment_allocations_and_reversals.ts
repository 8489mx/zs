import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Create payment_allocations table
    await db.schema
      .createTable('payment_allocations')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('partner_type', 'varchar(50)', (col) => col.notNull()) // 'customer' | 'supplier'
      .addColumn('partner_id', 'integer', (col) => col.notNull())
      .addColumn('payment_type', 'varchar(50)', (col) => col.notNull()) // 'customer_payment' | 'supplier_payment' | 'direct'
      .addColumn('payment_id', 'integer')
      .addColumn('invoice_type', 'varchar(50)', (col) => col.notNull()) // 'sale' | 'purchase'
      .addColumn('invoice_id', 'integer', (col) => col.notNull())
      .addColumn('allocated_amount', 'numeric(14, 2)', (col) => col.notNull())
      .addColumn('allocation_date', 'date', (col) => col.defaultTo(sql`CURRENT_DATE`).notNull())
      .addColumn('notes', 'text', (col) => col.defaultTo(''))
      .addColumn('created_by', 'integer')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 2. Add columns to journal_entries for tracking reversals
    await db.schema
      .alterTable('journal_entries')
      .addColumn('reversed_by_entry_id', 'integer')
      .execute()
      .catch(() => {});

    await db.schema
      .alterTable('journal_entries')
      .addColumn('reversal_of_entry_id', 'integer')
      .execute()
      .catch(() => {});

    // 3. Ensure purchases table has paid_amount column
    await db.schema
      .alterTable('purchases')
      .addColumn('paid_amount', 'numeric(14, 2)', (col) => col.defaultTo('0').notNull())
      .execute()
      .catch(() => {});

    // 4. Create Indexes for payment_allocations
    await db.schema
      .createIndex('idx_payment_allocations_partner')
      .ifNotExists()
      .on('payment_allocations')
      .columns(['tenant_id', 'partner_type', 'partner_id'])
      .execute();

    await db.schema
      .createIndex('idx_payment_allocations_invoice')
      .ifNotExists()
      .on('payment_allocations')
      .columns(['tenant_id', 'invoice_type', 'invoice_id'])
      .execute();

    await db.schema
      .createIndex('idx_payment_allocations_payment')
      .ifNotExists()
      .on('payment_allocations')
      .columns(['tenant_id', 'payment_type', 'payment_id'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('payment_allocations').ifExists().execute();
  },
};
