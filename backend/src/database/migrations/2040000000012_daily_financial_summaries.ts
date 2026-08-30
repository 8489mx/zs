import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

export const migration = {
  up: async (db: Kysely<Database>): Promise<void> => {
    await sql`
      CREATE TABLE IF NOT EXISTS daily_financial_summaries (
        id BIGSERIAL PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        account_id VARCHAR(64) NOT NULL DEFAULT '',
        summary_date DATE NOT NULL,
        branch_id BIGINT NULL,
        location_id BIGINT NULL,
        sales_count INT NOT NULL DEFAULT 0,
        sales_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
        sales_discount NUMERIC(14, 2) NOT NULL DEFAULT 0,
        cogs_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
        returns_count INT NOT NULL DEFAULT 0,
        sales_returns_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
        purchases_count INT NOT NULL DEFAULT 0,
        purchases_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
        purchase_returns_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
        expenses_count INT NOT NULL DEFAULT 0,
        expenses_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
        services_count INT NOT NULL DEFAULT 0,
        services_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
        gross_profit NUMERIC(14, 2) NOT NULL DEFAULT 0,
        net_profit NUMERIC(14, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.execute(db);

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_dfs_tenant_date_branch_loc
      ON daily_financial_summaries (tenant_id, summary_date, COALESCE(branch_id, -1), COALESCE(location_id, -1))
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_dfs_tenant_date_range
      ON daily_financial_summaries (tenant_id, summary_date DESC)
    `.execute(db);
  },

  down: async (db: Kysely<Database>): Promise<void> => {
    await sql`DROP TABLE IF EXISTS daily_financial_summaries`.execute(db);
  },
};
