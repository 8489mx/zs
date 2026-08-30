import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

const upStatements = [
  // Stock movements
  `CREATE INDEX IF NOT EXISTS idx_stock_mov_tenant_prod_created ON stock_movements(tenant_id, product_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_stock_mov_tenant_loc_created ON stock_movements(tenant_id, location_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_stock_mov_tenant_type_created ON stock_movements(tenant_id, movement_type, created_at DESC)`,

  // Sales
  `CREATE INDEX IF NOT EXISTS idx_sales_tenant_created_desc ON sales(tenant_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_tenant_doc_no ON sales(tenant_id, doc_no)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_tenant_customer_created ON sales(tenant_id, customer_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_tenant_branch_created ON sales(tenant_id, branch_id, created_at DESC)`,

  // Purchases
  `CREATE INDEX IF NOT EXISTS idx_purchases_tenant_created_desc ON purchases(tenant_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_purchases_tenant_doc_no ON purchases(tenant_id, doc_no)`,
  `CREATE INDEX IF NOT EXISTS idx_purchases_tenant_supplier_created ON purchases(tenant_id, supplier_id, created_at DESC)`,

  // Ledgers
  `CREATE INDEX IF NOT EXISTS idx_cust_ledger_tenant_cust_created ON customer_ledger(tenant_id, customer_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_supp_ledger_tenant_supp_created ON supplier_ledger(tenant_id, supplier_id, created_at DESC)`,

  // Accounting
  `CREATE INDEX IF NOT EXISTS idx_je_lines_tenant_account ON journal_entry_lines(tenant_id, account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_je_tenant_source ON journal_entries(tenant_id, source_type, source_id)`,
  `CREATE INDEX IF NOT EXISTS idx_je_tenant_entry_date ON journal_entries(tenant_id, entry_date DESC)`,

  // Product Location Stock
  `CREATE INDEX IF NOT EXISTS idx_prod_loc_stock_tenant_prod_loc ON product_location_stock(tenant_id, product_id, location_id)`,
];

const downStatements = [
  `DROP INDEX IF EXISTS idx_stock_mov_tenant_prod_created`,
  `DROP INDEX IF EXISTS idx_stock_mov_tenant_loc_created`,
  `DROP INDEX IF EXISTS idx_stock_mov_tenant_type_created`,
  `DROP INDEX IF EXISTS idx_sales_tenant_created_desc`,
  `DROP INDEX IF EXISTS idx_sales_tenant_doc_no`,
  `DROP INDEX IF EXISTS idx_sales_tenant_customer_created`,
  `DROP INDEX IF EXISTS idx_sales_tenant_branch_created`,
  `DROP INDEX IF EXISTS idx_purchases_tenant_created_desc`,
  `DROP INDEX IF EXISTS idx_purchases_tenant_doc_no`,
  `DROP INDEX IF EXISTS idx_purchases_tenant_supplier_created`,
  `DROP INDEX IF EXISTS idx_cust_ledger_tenant_cust_created`,
  `DROP INDEX IF EXISTS idx_supp_ledger_tenant_supp_created`,
  `DROP INDEX IF EXISTS idx_je_lines_tenant_account`,
  `DROP INDEX IF EXISTS idx_je_tenant_source`,
  `DROP INDEX IF EXISTS idx_je_tenant_entry_date`,
  `DROP INDEX IF EXISTS idx_prod_loc_stock_tenant_prod_loc`,
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
