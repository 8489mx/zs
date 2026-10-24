import type { RawBuilder } from 'kysely';
import { Kysely, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';

export interface AccountingIntegrityCheck {
  code: string;
  count: number;
  samples: Array<Record<string, unknown>>;
}
export interface AccountingIntegrityReport {
  tenantId: string;
  passed: boolean;
  checks: AccountingIntegrityCheck[];
}

/** Shared by the read-only audit and the locked fiscal-close gate. */
export function missingSourcePostingIssues(tenantId: string, start?: string, endExclusive?: string | Date): RawBuilder<unknown> {
  const range = (column: string) => sql`(${start ? sql`${sql.ref(column)} >= ${start}::date` : sql`true`}
    AND ${endExclusive ? sql`${sql.ref(column)} < ${endExclusive}::date` : sql`true`})`;
  return sql`
    SELECT 'sale' AS source_type,s.id FROM sales s WHERE s.tenant_id=${tenantId} AND s.status='posted' AND ${range('s.created_at')} AND (s.total>0 OR EXISTS (SELECT 1 FROM sale_items i WHERE i.tenant_id=s.tenant_id AND i.sale_id=s.id AND i.qty*i.cost_price>0)) AND NOT EXISTS (
      SELECT 1 FROM journal_entries j WHERE j.tenant_id=s.tenant_id AND j.source_id=s.id AND j.status='posted'
        AND j.source_type IN ('sale','sale_edit') AND j.reversed_by_entry_id IS NULL)
    UNION ALL SELECT 'purchase',p.id FROM purchases p WHERE p.tenant_id=${tenantId} AND p.status='posted' AND ${range('p.created_at')} AND p.total>0 AND NOT EXISTS (
      SELECT 1 FROM journal_entries j WHERE j.tenant_id=p.tenant_id AND j.source_id=p.id AND j.status='posted' AND j.source_type='purchase' AND j.reversed_by_entry_id IS NULL)
    UNION ALL SELECT 'return',r.id FROM return_documents r WHERE r.tenant_id=${tenantId} AND ${range('r.created_at')} AND (r.total>0 OR EXISTS (SELECT 1 FROM return_items i WHERE i.tenant_id=r.tenant_id AND i.return_document_id=r.id AND i.qty*i.cost_price>0)) AND NOT EXISTS (
      SELECT 1 FROM journal_entries j WHERE j.tenant_id=r.tenant_id AND j.source_id=r.id AND j.status='posted'
        AND (j.source_type=CASE WHEN r.return_type='sale' THEN 'sales_return' ELSE 'purchase_return' END OR (r.return_type='sale' AND j.source_type='return')))
      AND NOT EXISTS (SELECT 1 FROM sales s JOIN journal_entries j ON j.tenant_id=s.tenant_id AND j.source_type='sale' AND j.source_id=s.id AND j.status='posted'
        WHERE s.tenant_id=r.tenant_id AND s.exchange_return_id=r.id)`;
}

/** Read-only reconciliation. Call within a repeatable-read snapshot when writers are active. */
export async function inspectAccountingIntegrity(db: Kysely<Database>, tenantId: string): Promise<AccountingIntegrityReport> {
  if (!tenantId?.trim()) throw new Error('An explicit tenant is required for accounting reconciliation');
  const tenant = await db.selectFrom('tenants').select('id').where('id','=',tenantId).executeTakeFirst();
  if (!tenant) throw new Error('Accounting reconciliation tenant does not exist');
  const checks: AccountingIntegrityCheck[] = [];
  async function check(code: string, query: RawBuilder<unknown>) {
    const result = await sql<Record<string, unknown>>`WITH issues AS (${query})
      SELECT issues.*, count(*) over() as _issue_count FROM issues LIMIT 100`.execute(db);
    checks.push({code,count:Number(result.rows[0]?._issue_count || 0),samples:result.rows.map(({_issue_count,...row})=>row)});
  }
  await check('POSTED_JOURNAL_BALANCE',sql`SELECT j.id, count(l.id) AS line_count,
    coalesce(sum(l.debit),0) AS debit, coalesce(sum(l.credit),0) AS credit
    FROM journal_entries j LEFT JOIN journal_entry_lines l ON l.journal_entry_id=j.id AND l.tenant_id=j.tenant_id
    WHERE j.tenant_id=${tenantId} AND j.status='posted' GROUP BY j.id
    HAVING count(l.id)<2 OR coalesce(sum(l.debit),0)<>coalesce(sum(l.credit),0)`);
  await check('JOURNAL_MONEY_VALID',sql`SELECT id,journal_entry_id FROM journal_entry_lines WHERE tenant_id=${tenantId} AND (
    debit IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) OR credit IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)
    OR debit<0 OR credit<0 OR (debit>0 AND credit>0) OR (debit=0 AND credit=0))`);
  await check('JOURNAL_TENANT_REFERENCES',sql`SELECT l.id,l.journal_entry_id,l.account_id FROM journal_entry_lines l
    LEFT JOIN journal_entries j ON j.id=l.journal_entry_id AND j.tenant_id=l.tenant_id
    LEFT JOIN accounting_accounts a ON a.id=l.account_id AND a.tenant_id=l.tenant_id
    LEFT JOIN branches b ON b.id=l.branch_id AND b.tenant_id=l.tenant_id
    LEFT JOIN stock_locations s ON s.id=l.location_id AND s.tenant_id=l.tenant_id
    LEFT JOIN cost_centers c ON c.id=l.cost_center_id AND c.tenant_id=l.tenant_id
    WHERE l.tenant_id=${tenantId} AND (j.id IS NULL OR a.id IS NULL OR
      (l.branch_id IS NOT NULL AND b.id IS NULL) OR (l.location_id IS NOT NULL AND s.id IS NULL) OR (l.cost_center_id IS NOT NULL AND c.id IS NULL))`);
  await check('USER_BRANCH_TENANT',sql`SELECT u.id,u.default_branch_id FROM users u LEFT JOIN branches b
    ON b.id=u.default_branch_id AND b.tenant_id=u.tenant_id WHERE u.tenant_id=${tenantId} AND u.default_branch_id IS NOT NULL AND b.id IS NULL`);
  await check('BRANCH_LOCATION_TENANT_REFERENCES',sql`
    SELECT 'user_branch' AS source_type,u.user_id AS id FROM user_branches u
      LEFT JOIN users p ON p.id=u.user_id AND p.tenant_id=u.tenant_id
      LEFT JOIN branches b ON b.id=u.branch_id AND b.tenant_id=u.tenant_id
      WHERE u.tenant_id=${tenantId} AND (p.id IS NULL OR b.id IS NULL)
    UNION ALL SELECT 'branch',b.id FROM branches b LEFT JOIN stock_locations s ON s.id=b.default_stock_location_id AND s.tenant_id=b.tenant_id
      WHERE b.tenant_id=${tenantId} AND b.default_stock_location_id IS NOT NULL AND s.id IS NULL
    UNION ALL SELECT 'location',s.id FROM stock_locations s LEFT JOIN branches b ON b.id=s.branch_id AND b.tenant_id=s.tenant_id
      WHERE s.tenant_id=${tenantId} AND s.branch_id IS NOT NULL AND b.id IS NULL
    UNION ALL SELECT 'journal',j.id FROM journal_entries j
      LEFT JOIN branches b ON b.id=j.branch_id AND b.tenant_id=j.tenant_id
      LEFT JOIN stock_locations s ON s.id=j.location_id AND s.tenant_id=j.tenant_id
      WHERE j.tenant_id=${tenantId} AND ((j.branch_id IS NOT NULL AND b.id IS NULL) OR (j.location_id IS NOT NULL AND s.id IS NULL))`);
  await check('ACCOUNTING_SETTINGS_REFERENCES',sql`SELECT s.id,m.column_name,m.account_id FROM accounting_settings s
    CROSS JOIN LATERAL (VALUES
      ('cash_account_id',s.cash_account_id),('bank_account_id',s.bank_account_id),
      ('customer_receivable_account_id',s.customer_receivable_account_id),('supplier_payable_account_id',s.supplier_payable_account_id),
      ('inventory_account_id',s.inventory_account_id),('sales_revenue_account_id',s.sales_revenue_account_id),
      ('sales_discount_account_id',s.sales_discount_account_id),('cogs_account_id',s.cogs_account_id),
      ('purchase_account_id',s.purchase_account_id),('expenses_account_id',s.expenses_account_id),
      ('sales_tax_account_id',s.sales_tax_account_id),('purchase_tax_account_id',s.purchase_tax_account_id),
      ('manufacturing_overhead_account_id',s.manufacturing_overhead_account_id)
    ) m(column_name,account_id) LEFT JOIN accounting_accounts a ON a.id=m.account_id AND a.tenant_id=s.tenant_id
    WHERE s.tenant_id=${tenantId} AND m.account_id IS NOT NULL AND a.id IS NULL`);
  await check('JOURNAL_PARTNER_REFERENCES',sql`SELECT l.id,l.partner_type,l.partner_id FROM journal_entry_lines l
    LEFT JOIN customers c ON c.id=l.partner_id AND c.tenant_id=l.tenant_id AND l.partner_type='customer'
    LEFT JOIN suppliers s ON s.id=l.partner_id AND s.tenant_id=l.tenant_id AND l.partner_type='supplier'
    WHERE l.tenant_id=${tenantId} AND ((l.partner_type='customer' AND c.id IS NULL) OR (l.partner_type='supplier' AND s.id IS NULL))`);
  await check('CUSTOMER_LEDGER_CACHE',sql`SELECT c.id,c.balance,coalesce(l.amount,0) AS ledger_balance FROM customers c
    LEFT JOIN (SELECT customer_id,sum(amount) AS amount FROM customer_ledger WHERE tenant_id=${tenantId} GROUP BY customer_id) l ON l.customer_id=c.id
    WHERE c.tenant_id=${tenantId} AND abs(coalesce(c.balance,0)-coalesce(l.amount,0))>0.005`);
  await check('SUPPLIER_LEDGER_CACHE',sql`SELECT s.id,s.balance,coalesce(l.amount,0) AS ledger_balance FROM suppliers s
    LEFT JOIN (SELECT supplier_id,sum(amount) AS amount FROM supplier_ledger WHERE tenant_id=${tenantId} GROUP BY supplier_id) l ON l.supplier_id=s.id
    WHERE s.tenant_id=${tenantId} AND abs(coalesce(s.balance,0)-coalesce(l.amount,0))>0.005`);
  await check('CUSTOMER_GL_SUBLEDGER',sql`WITH gl AS (
    SELECT l.partner_id,sum(l.debit-l.credit) AS amount FROM journal_entry_lines l
    JOIN journal_entries j ON j.id=l.journal_entry_id AND j.tenant_id=l.tenant_id
    JOIN accounting_accounts a ON a.id=l.account_id AND a.tenant_id=l.tenant_id
    LEFT JOIN accounting_settings s ON s.tenant_id=l.tenant_id AND s.id=1
    WHERE l.tenant_id=${tenantId} AND j.status='posted' AND l.partner_type='customer'
      AND (a.is_receivable OR a.code='1130' OR a.id=s.customer_receivable_account_id) GROUP BY l.partner_id)
    SELECT c.id,c.balance,coalesce(gl.amount,0) AS gl_balance FROM customers c LEFT JOIN gl ON gl.partner_id=c.id
    WHERE c.tenant_id=${tenantId} AND abs(coalesce(c.balance,0)-coalesce(gl.amount,0))>0.005`);
  await check('SUPPLIER_GL_SUBLEDGER',sql`WITH gl AS (
    SELECT l.partner_id,sum(l.credit-l.debit) AS amount FROM journal_entry_lines l
    JOIN journal_entries j ON j.id=l.journal_entry_id AND j.tenant_id=l.tenant_id
    JOIN accounting_accounts a ON a.id=l.account_id AND a.tenant_id=l.tenant_id
    LEFT JOIN accounting_settings s ON s.tenant_id=l.tenant_id AND s.id=1
    WHERE l.tenant_id=${tenantId} AND j.status='posted' AND l.partner_type='supplier'
      AND (a.is_payable OR a.code='2110' OR a.id=s.supplier_payable_account_id) GROUP BY l.partner_id)
    SELECT p.id,p.balance,coalesce(gl.amount,0) AS gl_balance FROM suppliers p LEFT JOIN gl ON gl.partner_id=p.id
    WHERE p.tenant_id=${tenantId} AND abs(coalesce(p.balance,0)-coalesce(gl.amount,0))>0.005`);
  await check('STOCK_LOCATION_QUANTITIES',sql`SELECT p.id,p.stock_qty,coalesce(s.qty,0) AS location_qty FROM products p
    LEFT JOIN (SELECT product_id,sum(qty) AS qty FROM product_location_stock WHERE tenant_id=${tenantId} GROUP BY product_id) s ON s.product_id=p.id
    WHERE p.tenant_id=${tenantId} AND abs(coalesce(p.stock_qty,0)-coalesce(s.qty,0))>0.0005`);
  await check('INVENTORY_GL_VALUATION',sql`WITH stock AS (
    SELECT coalesce(sum(stock_qty*cost_price),0) AS amount FROM products WHERE tenant_id=${tenantId}
  ), book AS (SELECT coalesce(sum(l.debit-l.credit),0) AS amount FROM journal_entry_lines l
    JOIN journal_entries j ON j.id=l.journal_entry_id AND j.tenant_id=l.tenant_id
    JOIN accounting_accounts a ON a.id=l.account_id AND a.tenant_id=l.tenant_id
    LEFT JOIN accounting_settings s ON s.tenant_id=l.tenant_id AND s.id=1
    WHERE l.tenant_id=${tenantId} AND j.status='posted' AND (a.is_inventory OR a.code IN ('1140','1145') OR a.id=s.inventory_account_id))
    SELECT stock.amount AS stock_value,book.amount AS gl_value FROM stock,book WHERE abs(stock.amount-book.amount)>0.05`);
  await check('UNRESOLVED_POSTINGS',sql`SELECT id,source_type,source_id FROM accounting_posting_failures WHERE tenant_id=${tenantId} AND resolved_at IS NULL`);
  await check('DUPLICATE_SOURCE_POSTINGS',sql`SELECT source_type,source_id,count(*) AS journal_count FROM journal_entries
    WHERE tenant_id=${tenantId} AND status='posted' AND source_id IS NOT NULL
      AND source_type IN ('sale','purchase','sales_return','purchase_return','customer_payment','supplier_payment','expense')
    GROUP BY source_type,source_id HAVING count(*)>1`);
  await check('SOURCE_DOCUMENT_POSTINGS',missingSourcePostingIssues(tenantId));
  await check('REVERSAL_LINKS',sql`SELECT j.id,j.reversed_by_entry_id,j.reversal_of_entry_id FROM journal_entries j
    LEFT JOIN journal_entries r ON r.tenant_id=j.tenant_id AND r.id=j.reversed_by_entry_id
    LEFT JOIN journal_entries o ON o.tenant_id=j.tenant_id AND o.id=j.reversal_of_entry_id
    WHERE j.tenant_id=${tenantId} AND ((j.reversed_by_entry_id IS NOT NULL AND (r.id IS NULL OR r.reversal_of_entry_id IS DISTINCT FROM j.id))
      OR (j.reversal_of_entry_id IS NOT NULL AND (o.id IS NULL OR o.reversed_by_entry_id IS DISTINCT FROM j.id)))`);
  return {tenantId,passed:checks.every(check=>check.count===0),checks};
}
