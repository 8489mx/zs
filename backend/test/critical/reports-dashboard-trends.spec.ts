import { strict as assert } from 'node:assert';
import { ReportsService } from '../../src/modules/reports/reports.service';
import { dateKey, getBusinessTimezone } from '../../src/modules/reports/helpers/reports-range.helper';

type RowMap = Record<string, unknown[]>;

class FakeQuery {
  constructor(private readonly rows: unknown[]) {}
  select(): this { return this; }
  where(): this { return this; }
  innerJoin(): this { return this; }
  leftJoin(): this { return this; }
  orderBy(): this { return this; }
  groupBy(): this { return this; }
  limit(): this { return this; }
  execute(): Promise<unknown[]> { return Promise.resolve(this.rows); }
  executeTakeFirst(): Promise<unknown> { return Promise.resolve(this.rows[0]); }
}

class FakeDb {
  constructor(private readonly data: RowMap) {}
  selectFrom(table: string): FakeQuery {
    return new FakeQuery(this.data[table] || []);
  }
}

(async () => {
  const businessTimezone = getBusinessTimezone();

  const today = new Date();
  today.setUTCHours(10, 0, 0, 0);
  const oneDayAgo = new Date(today);
  oneDayAgo.setUTCDate(oneDayAgo.getUTCDate() - 1);
  const eightDaysAgo = new Date(today);
  eightDaysAgo.setUTCDate(eightDaysAgo.getUTCDate() - 8);

  const products = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    name: `P${index + 1}`,
    category_id: 1,
    supplier_id: 1,
    retail_price: 10,
    stock_qty: index === 9 ? 5 : 1,
    min_stock_qty: 2,
    cost_price: 4,
  }));

  const service = new ReportsService(new FakeDb({
    sales: [
      { id: 1, total: 100, branch_id: 1, location_id: 1, created_at: today.toISOString() },
      { id: 2, total: 50, branch_id: 1, location_id: 1, created_at: oneDayAgo.toISOString() },
      { id: 3, total: 999, branch_id: 1, location_id: 1, created_at: eightDaysAgo.toISOString() },
    ],
    purchases: [
      { id: 1, total: 80, branch_id: 1, location_id: 1, created_at: today.toISOString() },
    ],
    expenses: [],
    return_documents: [],
    treasury_transactions: [],
    products,
    customers: [
      { id: 1, name: 'Cash', balance: 20, credit_limit: 100 },
      { id: 2, name: 'Vip', balance: 10, credit_limit: 100 },
    ],
    customer_ledger: [
      { customer_id: 1, balance_total: 220 },
      { customer_id: 2, balance_total: 15 },
    ],
    suppliers: [
      { id: 1, name: 'Supp', balance: 10 },
      { id: 2, name: 'Big Supp', balance: 20 },
    ],
    supplier_ledger: [
      { supplier_id: 1, balance_total: 50 },
      { supplier_id: 2, balance_total: 1200 },
    ],
    product_offers: [
      { id: 1, start_date: null, end_date: null },
    ],
    'sale_items as si': [
      { product_id: 1, product_name: 'A', qty: 2, line_total: 20, cost_price: 4, qty_total: 2, sales_total: 20, branch_id: 1, location_id: 1, created_at: today.toISOString() },
    ],
  }) as never);

  const result = await service.dashboardOverview({ branchId: 1, locationId: 1 });
  const trends = (result.trends as any).sales as Array<{ key: string; value: number }>;
  const todayKey = dateKey(today, businessTimezone);
  const oneDayAgoKey = dateKey(oneDayAgo, businessTimezone);
  const eightDaysAgoKey = dateKey(eightDaysAgo, businessTimezone);

  assert.equal(trends.find((item) => item.key === todayKey)?.value, 100);
  assert.equal(trends.find((item) => item.key === oneDayAgoKey)?.value, 50);
  assert.equal(trends.some((item) => item.key === eightDaysAgoKey), false);
  assert.equal((result.stats as any).todaySalesAmount, 100);
  assert.equal((result.summary as any).activeOffers, 1);
  assert.equal((result.summary as any).lowStockCount, 9);
  assert.equal((result.stats as any).customerDebt, 235);
  assert.equal((result.stats as any).highSupplierBalances, 1);
  assert.equal(((result.topCustomers as any[]) || [])[0]?.total, 220);
  assert.equal(((result.topToday as any[]) || [])[0]?.total, 20);

  console.log('reports-dashboard-trends.spec: ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
