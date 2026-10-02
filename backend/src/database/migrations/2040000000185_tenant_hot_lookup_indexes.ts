import { sql, type Kysely } from 'kysely';

// Existing tenant-prefixed indexes cover sales chronology and stock/journal lists. These
// additional keys match the actual representative, ledger and cashier-radar WHERE/ORDER BY paths.
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`CREATE INDEX IF NOT EXISTS idx_sales_tenant_rep_created_desc
      ON sales (tenant_id, delivery_rep_id, created_at DESC, id DESC)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_sales_tenant_rep_status_settled_desc
      ON sales (tenant_id, delivery_rep_id, delivery_status, settled_at DESC, id DESC)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant_costcenter_entry
      ON journal_entry_lines (tenant_id, cost_center_id, journal_entry_id)
      WHERE cost_center_id IS NOT NULL`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_actor_created_desc
      ON audit_logs (tenant_id, created_by, created_at DESC)`.execute(db);
  },
  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_audit_logs_tenant_actor_created_desc`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_journal_lines_tenant_costcenter_entry`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_sales_tenant_rep_status_settled_desc`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_sales_tenant_rep_created_desc`.execute(db);
  },
};
