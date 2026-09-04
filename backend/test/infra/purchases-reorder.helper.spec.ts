import { strict as assert } from 'node:assert';
import {
  calculateReorderItemSuggestion,
  buildReorderAnalysis,
  ReorderProductInput,
  ReorderSupplierInput,
} from '../../src/modules/purchases/helpers/purchases-reorder.helper';

// 1. Test calculation for out of stock item
(() => {
  const product: ReorderProductInput = {
    id: 1,
    name: 'حليب كامل الدسم',
    stock_qty: 0,
    min_stock_qty: 10,
    cost_price: 25,
    retail_price: 35,
    supplier_id: 101,
  };
  const supplier: ReorderSupplierInput = {
    id: 101,
    name: 'شركة الألبان',
    leadTimeDays: 4,
  };
  // Sold 60 units in 30 days -> Daily Run Rate = 2 units/day
  const suggestion = calculateReorderItemSuggestion(product, 60, supplier, {
    daysAnalysis: 30,
    targetCoverageDays: 30,
  });

  assert.equal(suggestion.dailyRunRate, 2);
  assert.equal(suggestion.leadTimeDays, 4);
  assert.equal(suggestion.leadTimeDemand, 8); // 2 * 4
  assert.equal(suggestion.safetyStock, 10); // minStock = 10 > (2*3=6)
  assert.equal(suggestion.reorderPoint, 18); // 8 + 10
  assert.equal(suggestion.daysRemaining, 0);
  assert.equal(suggestion.urgency, 'out_of_stock');
  assert.equal(suggestion.needsReorder, true);
  // targetBuffer = (2 * 30) + 10 = 70; suggested = 70 - 0 = 70
  assert.equal(suggestion.suggestedQty, 70);
  assert.equal(suggestion.estimatedTotalCost, 70 * 25);
})();

// 2. Test critical item near depletion
(() => {
  const product: ReorderProductInput = {
    id: 2,
    name: 'سكر أبيض 1كجم',
    stock_qty: 5,
    min_stock_qty: 10,
    cost_price: 30,
    retail_price: 40,
    supplier_id: 102,
  };
  const supplier: ReorderSupplierInput = {
    id: 102,
    name: 'شركة السكر',
    leadTimeDays: 3,
  };
  // Sold 90 units in 30 days -> Daily Run Rate = 3 units/day
  const suggestion = calculateReorderItemSuggestion(product, 90, supplier, {
    daysAnalysis: 30,
    targetCoverageDays: 14,
  });

  assert.equal(suggestion.dailyRunRate, 3);
  assert.equal(suggestion.daysRemaining, 1); // 5 / 3 = 1 day (< leadTime 3 days)
  assert.equal(suggestion.urgency, 'critical');
  assert.equal(suggestion.needsReorder, true);
  // targetBuffer = (3 * 14) + 10 = 52; suggested = 52 - 5 = 47
  assert.equal(suggestion.suggestedQty, 47);
})();

// 3. Test healthy item with plenty of stock
(() => {
  const product: ReorderProductInput = {
    id: 3,
    name: 'شاي أسود',
    stock_qty: 100,
    min_stock_qty: 10,
    cost_price: 15,
    retail_price: 22,
    supplier_id: 101,
  };
  const supplier: ReorderSupplierInput = {
    id: 101,
    name: 'شركة الألبان',
    leadTimeDays: 2,
  };
  // Sold 30 units in 30 days -> Daily Run Rate = 1 unit/day
  const suggestion = calculateReorderItemSuggestion(product, 30, supplier, {
    daysAnalysis: 30,
    targetCoverageDays: 30,
  });

  assert.equal(suggestion.dailyRunRate, 1);
  assert.equal(suggestion.daysRemaining, 100);
  assert.equal(suggestion.urgency, 'overstocked');
  assert.equal(suggestion.needsReorder, false);
  assert.equal(suggestion.suggestedQty, 0);
})();

// 4. Test supplier grouping and summary
(() => {
  const products: ReorderProductInput[] = [
    { id: 1, name: 'صنف 1', stock_qty: 0, min_stock_qty: 5, cost_price: 10, supplier_id: 201 },
    { id: 2, name: 'صنف 2', stock_qty: 2, min_stock_qty: 10, cost_price: 20, supplier_id: 201 },
    { id: 3, name: 'صنف 3', stock_qty: 1, min_stock_qty: 8, cost_price: 50, supplier_id: 202 },
    { id: 4, name: 'صنف 4', stock_qty: 50, min_stock_qty: 5, cost_price: 30, supplier_id: 202 },
  ];
  const salesMap = new Map<number, number>([
    [1, 30], // 1/day
    [2, 60], // 2/day
    [3, 30], // 1/day
    [4, 10], // 0.33/day
  ]);
  const suppliersMap = new Map<number, ReorderSupplierInput>([
    [201, { id: 201, name: 'مورد أ', leadTimeDays: 3 }],
    [202, { id: 202, name: 'مورد ب', leadTimeDays: 5 }],
  ]);

  const analysis = buildReorderAnalysis(products, salesMap, suppliersMap, {
    daysAnalysis: 30,
    targetCoverageDays: 30,
    onlyNeedsReorder: true,
  });

  assert.equal(analysis.summary.totalMonitoredProducts, 4);
  assert.equal(analysis.summary.outOfStockCount, 1);
  assert.equal(analysis.summary.criticalCount, 2); // صنف 2 وصنف 3
  assert.equal(analysis.summary.needsReorderCount, 3);
  assert.equal(analysis.supplierGroups.length, 2);

  const groupA = analysis.supplierGroups.find((g) => g.supplierId === 201);
  assert.ok(groupA);
  assert.equal(groupA?.items.length, 2); // صنف 1 وصنف 2
  assert.equal(groupA?.criticalCount, 2);

  const groupB = analysis.supplierGroups.find((g) => g.supplierId === 202);
  assert.ok(groupB);
  assert.equal(groupB?.items.length, 1); // صنف 3 فقط (صنف 4 healthy)
})();

console.log('All purchases-reorder helper tests passed successfully!');
