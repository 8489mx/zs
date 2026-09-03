import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Add loyalty_points column to customers table
    await db.schema
      .alterTable('customers')
      .addColumn('loyalty_points', 'numeric(14, 2)', (col) => col.defaultTo('0').notNull())
      .execute()
      .catch(() => {
        // column may already exist
      });

    // 2. Create customer_loyalty_logs table
    await db.schema
      .createTable('customer_loyalty_logs')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('account_id', 'varchar(160)', (col) => col.notNull())
      .addColumn('customer_id', 'integer', (col) => col.notNull())
      .addColumn('points_change', 'numeric(14, 2)', (col) => col.notNull())
      .addColumn('balance_after', 'numeric(14, 2)', (col) => col.notNull())
      .addColumn('action_type', 'varchar(32)', (col) => col.notNull()) // 'earn' | 'redeem' | 'manual_adjust'
      .addColumn('sale_id', 'integer')
      .addColumn('notes', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 3. Composite Index
    await db.schema
      .createIndex('idx_customer_loyalty_logs_customer')
      .ifNotExists()
      .on('customer_loyalty_logs')
      .columns(['tenant_id', 'customer_id'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('customer_loyalty_logs').ifExists().execute();
    await db.schema
      .alterTable('customers')
      .dropColumn('loyalty_points')
      .execute()
      .catch(() => undefined);
  },
};
