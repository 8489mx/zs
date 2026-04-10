import { strict as assert } from 'node:assert';
import {
  buildDashboardComputedState,
  buildDashboardOverviewPayload,
  buildDashboardScope,
  buildDashboardStats,
  buildDashboardSummary,
} from '../../src/modules/reports/helpers/reports-dashboard.helper';

(() => {
  const summary = buildDashboardSummary({
    summary: { salesTotal: 1200, purchasesTotal: 800 },
    productsCount: 12,
    customersCount: 4,
    suppliersCount: 3,
    inventorySnapshot: {
      lowStockCount: 5,
      outOfStockCount: 2,
    },
    activeOffers: 1,
  });

  assert.deepEqual(summary, {
    salesTotal: 1200,
    purchasesTotal: 800,
    totalProducts: 12,
    totalCustomers: 4,
    totalSuppliers: 3,
    lowStockCount: 5,
    outOfStockCount: 2,
    activeOffers: 1,
  });

  const stats = buildDashboardStats({
    productsCount: 12,
    customersCount: 4,
    suppliersCount: 3,
    todayOperations: {
      todaySalesCount: 7,
      todaySalesAmount: 1500,
      todayPurchasesCount: 2,
      todayPurchasesAmount: 600,
    },
    inventorySnapshot: {
      inventoryCost: 900,
      inventorySaleValue: 1400,
    },
    partnerExposure: {
      customerDebt: 220,
      supplierDebt: 180,
      nearCreditLimit: 1,
      aboveCreditLimit: 2,
      highSupplierBalances: 1,
    },
    activeOffers: 3,
  });

  assert.deepEqual(stats, {
    productsCount: 12,
    customersCount: 4,
    suppliersCount: 3,
    todaySalesCount: 7,
    todaySalesAmount: 1500,
    todayPurchasesCount: 2,
    todayPurchasesAmount: 600,
    inventoryCost: 900,
    inventorySaleValue: 1400,
    customerDebt: 220,
    supplierDebt: 180,
    nearCreditLimit: 1,
    aboveCreditLimit: 2,
    highSupplierBalances: 1,
    activeOffers: 3,
  });

  const payload = buildDashboardOverviewPayload({
    range: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T23:59:59.999Z' },
    summary: { salesTotal: 1200 },
    productsCount: 12,
    customersCount: 4,
    suppliersCount: 3,
    inventorySnapshot: {
      lowStock: [{ id: '1', name: 'Rice', retailPrice: 20, stockQty: 2, minStockQty: 5, costPrice: 15, status: 'low' }],
      lowStockCount: 5,
      outOfStockCount: 2,
      inventoryCost: 900,
      inventorySaleValue: 1400,
    },
    partnerExposure: {
      customerDebt: 220,
      supplierDebt: 180,
      nearCreditLimit: 1,
      aboveCreditLimit: 2,
      highSupplierBalances: 1,
      topCustomers: [{ key: 'c1', name: 'Cash', total: 220, count: 1 }],
      topSuppliers: [{ key: 's1', name: 'Supp', total: 180, count: 1 }],
    },
    todayOperations: {
      todaySalesCount: 7,
      todaySalesAmount: 1500,
      todayPurchasesCount: 2,
      todayPurchasesAmount: 600,
      topToday: [{ productId: '1', name: 'Rice', qty: 2, total: 40 }],
    },
    trends: {
      sales: [{ key: '2026-01-31', value: 1500 }],
      purchases: [{ key: '2026-01-31', value: 600 }],
    },
    activeOffers: 3,
  });

  assert.equal((payload.summary as any).totalProducts, 12);
  assert.equal((payload.summary as any).activeOffers, 3);
  assert.equal((payload.stats as any).customerDebt, 220);
  assert.equal(((payload.lowStock as any[]) || [])[0]?.name, 'Rice');
  assert.equal(((payload.topToday as any[]) || [])[0]?.total, 40);
  assert.equal(((payload.topCustomers as any[]) || [])[0]?.name, 'Cash');
  assert.equal(((payload.trends as any).sales || [])[0]?.value, 1500);

  const scope = buildDashboardScope(new Date('2026-02-10T12:00:00.000Z'), 'UTC');
  assert.equal(scope.today.key, '2026-02-10');
  assert.equal(scope.activeOfferDate, '2026-02-10');
  assert.equal(scope.trendStart.toISOString(), '2026-02-04T00:00:00.000Z');

  const state = buildDashboardComputedState({
    productsRows: [
      { id: 1, name: 'Rice', stock_qty: 2, min_stock_qty: 5, retail_price: 20, cost_price: 12 },
      { id: 2, name: 'Oil', stock_qty: 10, min_stock_qty: 3, retail_price: 30, cost_price: 21 },
    ],
    customersRows: [
      { id: 1, name: 'Cust', credit_limit: 500 },
    ],
    suppliersRows: [
      { id: 7, name: 'Supp' },
    ],
    recentSalesRows: [
      { created_at: '2026-02-10T08:00:00.000Z', total: 100 },
      { created_at: '2026-02-09T08:00:00.000Z', total: 50 },
    ],
    recentPurchasesRows: [
      { created_at: '2026-02-10T09:00:00.000Z', total: 60 },
      { created_at: '2026-02-08T09:00:00.000Z', total: 40 },
    ],
    topTodayRows: [
      { product_id: 1, product_name: 'Rice', qty_total: 4, sales_total: 100 },
    ],
    customerLedgerRows: [
      { customer_id: 1, balance_total: 240 },
    ],
    supplierLedgerRows: [
      { supplier_id: 7, balance_total: 1100 },
    ],
    businessTimezone: 'UTC',
    todayKey: '2026-02-10',
  });

  assert.equal(state.inventorySnapshot.lowStockCount, 1);
  assert.equal(state.partnerExposure.customerDebt, 240);
  assert.equal(state.partnerExposure.highSupplierBalances, 1);
  assert.equal(state.todayOperations.todaySalesCount, 1);
  assert.equal(state.todayOperations.todayPurchasesAmount, 60);
  assert.equal(state.trends.sales.length, 7);

  console.log('reports-dashboard.helper.spec: ok');
})();
