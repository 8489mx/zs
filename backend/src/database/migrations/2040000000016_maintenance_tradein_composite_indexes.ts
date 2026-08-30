import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

const upStatements = [
  // Maintenance Tickets
  `CREATE INDEX IF NOT EXISTS idx_maint_tickets_tenant_status_id_desc ON maintenance_tickets(tenant_id, status, id DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_maint_tickets_tenant_customer ON maintenance_tickets(tenant_id, customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_maint_tickets_tenant_tech ON maintenance_tickets(tenant_id, technician_id)`,
  `CREATE INDEX IF NOT EXISTS idx_maint_tickets_tenant_branch_loc ON maintenance_tickets(tenant_id, branch_id, location_id)`,

  // Maintenance Ticket Parts
  `CREATE INDEX IF NOT EXISTS idx_maint_parts_tenant_ticket ON maintenance_ticket_parts(tenant_id, ticket_id)`,
  `CREATE INDEX IF NOT EXISTS idx_maint_parts_tenant_product ON maintenance_ticket_parts(tenant_id, product_id)`,

  // Trade-In Transactions
  `CREATE INDEX IF NOT EXISTS idx_tradein_tenant_created_desc ON trade_in_transactions(tenant_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_tradein_tenant_serial ON trade_in_transactions(tenant_id, serial_number)`,
  `CREATE INDEX IF NOT EXISTS idx_tradein_tenant_prod ON trade_in_transactions(tenant_id, created_product_id)`,
];

const downStatements = [
  `DROP INDEX IF EXISTS idx_maint_tickets_tenant_status_id_desc`,
  `DROP INDEX IF EXISTS idx_maint_tickets_tenant_customer`,
  `DROP INDEX IF EXISTS idx_maint_tickets_tenant_tech`,
  `DROP INDEX IF EXISTS idx_maint_tickets_tenant_branch_loc`,
  `DROP INDEX IF EXISTS idx_maint_parts_tenant_ticket`,
  `DROP INDEX IF EXISTS idx_maint_parts_tenant_product`,
  `DROP INDEX IF EXISTS idx_tradein_tenant_created_desc`,
  `DROP INDEX IF EXISTS idx_tradein_tenant_serial`,
  `DROP INDEX IF EXISTS idx_tradein_tenant_prod`,
];

export async function up(db: Kysely<Database>): Promise<void> {
  for (const stmt of upStatements) {
    await sql.raw(stmt).execute(db);
  }
}

export async function down(db: Kysely<Database>): Promise<void> {
  for (const stmt of downStatements) {
    await sql.raw(stmt).execute(db);
  }
}
