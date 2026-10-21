import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Link purchases to import_projects architecturally
  // Preserves purchases.project_id BIGINT for legacy/contracting projects without type conflicts
  await sql`
    ALTER TABLE purchases
      ADD COLUMN IF NOT EXISTS import_project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_purchases_tenant_import_project
      ON purchases(tenant_id, import_project_id);
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS idx_purchases_tenant_import_project;
    ALTER TABLE purchases DROP COLUMN IF EXISTS import_project_id;
  `.execute(db);
}
