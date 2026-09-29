import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000172: Dynamic Pivot & Custom BI Reports
 *
 * Implements saved custom pivot report templates allowing managers
 * to configure multi-dimensional cubes, grouping sets, and metric aggregations.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`
      CREATE TABLE IF NOT EXISTS custom_bi_pivot_reports (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT NULL,
        dataset VARCHAR(50) NOT NULL,
        row_dimension VARCHAR(50) NOT NULL,
        col_dimension VARCHAR(50) NULL,
        metric VARCHAR(50) NOT NULL,
        date_from DATE NULL,
        date_to DATE NULL,
        filters JSONB NULL,
        created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
        is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_custom_bi_pivot_tenant_dataset
      ON custom_bi_pivot_reports (tenant_id, dataset);

      CREATE INDEX IF NOT EXISTS idx_custom_bi_pivot_tenant_favorite
      ON custom_bi_pivot_reports (tenant_id, is_favorite)
      WHERE is_favorite = TRUE;
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`
      DROP TABLE IF EXISTS custom_bi_pivot_reports CASCADE;
    `.execute(db);
  },
};
