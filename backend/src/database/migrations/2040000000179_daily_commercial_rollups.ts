import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000179: Daily Commercial Rollups (جداول الملخصات اليومية للتحليلات التاريخية)
 *
 * Implements high-performance daily commercial aggregates for 10-year enterprise scalability:
 * - Pre-aggregates daily sales, cogs, gross profit, returns, and expenses per tenant & branch
 * - Enables multi-year historical comparison reports (e.g. 5-10 years) to query 365 rows/year
 *   instead of scanning millions of transaction rows.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await db.schema
      .createTable('daily_commercial_rollups')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'varchar(128)', (col) => col.notNull())
      .addColumn('rollup_date', 'date', (col) => col.notNull())
      .addColumn('branch_id', 'integer')
      .addColumn('branch_key', 'integer', (col) => col.notNull().defaultTo(-1))
      .addColumn('sales_count', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('sales_total', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
      .addColumn('cash_sales_total', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
      .addColumn('credit_sales_total', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
      .addColumn('cogs_total', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
      .addColumn('gross_profit', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
      .addColumn('returns_count', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('returns_total', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
      .addColumn('expenses_total', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
      .addColumn('net_profit', 'numeric(15, 2)', (col) => col.notNull().defaultTo(0))
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // Unique index for idempotent daily upserts
    await db.schema
      .createIndex('idx_daily_rollups_tenant_date_branch')
      .ifNotExists()
      .on('daily_commercial_rollups')
      .columns(['tenant_id', 'rollup_date', 'branch_key'])
      .unique()
      .execute();

    // Range index for multi-year timeline scans
    await db.schema
      .createIndex('idx_daily_rollups_tenant_date')
      .ifNotExists()
      .on('daily_commercial_rollups')
      .columns(['tenant_id', 'rollup_date'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('daily_commercial_rollups').ifExists().execute();
  },
};
