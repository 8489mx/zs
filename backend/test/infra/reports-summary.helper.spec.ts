import assert from 'node:assert/strict';
import { buildReportSummaryPayload, splitReturnRowsByType } from '../../src/modules/reports/helpers/reports-summary.helper';

(function testSplitReturnRowsByType() {
  const rows = [
    { return_type: 'sale', total: 10 },
    { return_type: 'purchase', total: 20 },
    { return_type: 'other', total: 30 },
  ];

  const split = splitReturnRowsByType(rows);
  assert.equal(split.sales.length, 1);
  assert.equal(split.purchases.length, 1);
})();

(function testBuildReportSummaryPayload() {
  const payload = buildReportSummaryPayload({
    salesRows: [{ total: 200 }, { total: 50 }],
    purchasesRows: [{ total: 120 }],
    expensesRows: [{ amount: 30 }],
    returnsRows: [
      { return_type: 'sale', total: 20 },
      { return_type: 'purchase', total: 10 },
    ],
    treasuryRows: [
      { amount: 100 },
      { amount: -40 },
    ],
    saleItemsRows: [
      { product_id: 1, product_name: 'Milk', qty: 2, cost_price: 25, line_total: 80 },
      { product_id: 1, product_name: 'Milk', qty: 1, cost_price: 25, line_total: 40 },
      { product_id: 2, product_name: 'Bread', qty: 3, cost_price: 10, line_total: 45 },
    ],
  });

  assert.equal(payload.sales.count, 2);
  assert.equal(payload.sales.total, 250);
  assert.equal(payload.sales.netSales, 230);
  assert.equal(payload.purchases.netPurchases, 110);
  assert.equal(payload.expenses.total, 30);
  assert.equal(payload.returns.count, 2);
  assert.equal(payload.returns.salesTotal, 20);
  assert.equal(payload.returns.purchasesTotal, 10);
  assert.equal(payload.treasury.cashIn, 100);
  assert.equal(payload.treasury.cashOut, 40);
  assert.equal(payload.treasury.net, 60);
  assert.equal(payload.commercial.cogs, 105);
  assert.equal(payload.commercial.grossProfit, 125);
  assert.equal(payload.commercial.netOperatingProfit, 95);
  assert.equal(payload.topProducts.length, 2);
  assert.equal(payload.topProducts[0].name, 'Milk');
  assert.equal(payload.topProducts[0].qty, 3);
  assert.equal(payload.topProducts[0].revenue, 120);
})();

console.log('reports-summary.helper specs passed');
