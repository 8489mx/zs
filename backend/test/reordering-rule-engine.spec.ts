import assert from 'node:assert/strict';
import {
  calculateForecastedStock,
  evaluateReorderingRule,
  groupReorderItemsBySupplier,
  type BreachedReorderItem,
} from '../src/modules/inventory/engines/reordering-rule.engine';

(() => {
  console.log('Running automated reordering rule engine spec...');

  // Test 1: Virtual Forecasted Stock Calculation
  const forecastNormal = calculateForecastedStock({
    onHandQty: 50,
    incomingQty: 30, // 30 on open POs
    outgoingQty: 20, // 20 reserved for sales
  });
  assert.equal(forecastNormal.forecastedQty, 60);
  assert.equal(forecastNormal.onHandQty, 50);
  assert.equal(forecastNormal.incomingQty, 30);
  assert.equal(forecastNormal.outgoingQty, 20);

  // Test 2: Stock Sufficient (Above Min) -> No Reorder
  const evalSufficient = evaluateReorderingRule({
    productId: 101,
    minQty: 20,
    maxQty: 100,
    onHandQty: 25,
    incomingQty: 10,
    outgoingQty: 5,
  });
  // Forecasted: 25 + 10 - 5 = 30 >= min (20)
  assert.equal(evalSufficient.isBreached, false);
  assert.equal(evalSufficient.forecastedQty, 30);
  assert.equal(evalSufficient.suggestedOrderQty, 0);
  assert.equal(evalSufficient.reason, 'STOCK_SUFFICIENT');

  // Test 3: Stock Breaches Min -> Trigger Reorder to Max
  const evalBreached = evaluateReorderingRule({
    productId: 102,
    minQty: 30,
    maxQty: 100,
    qtyMultiple: 1,
    onHandQty: 15,
    incomingQty: 5,
    outgoingQty: 0,
  });
  // Forecasted: 15 + 5 = 20 < min (30). Shortage to max(100) = 80.
  assert.equal(evalBreached.isBreached, true);
  assert.equal(evalBreached.forecastedQty, 20);
  assert.equal(evalBreached.shortageQty, 80);
  assert.equal(evalBreached.suggestedOrderQty, 80);
  assert.equal(evalBreached.reason, 'FORECASTED_BELOW_MIN');

  // Test 4: Quantity Multiple Rounding (e.g. cartons/boxes)
  // Deficiency is 25, package multiple is 12 (must buy 3 boxes of 12 = 36)
  const evalMultiple = evaluateReorderingRule({
    productId: 103,
    minQty: 10,
    maxQty: 30,
    qtyMultiple: 12,
    onHandQty: 5,
    incomingQty: 0,
    outgoingQty: 0,
  });
  // Forecasted: 5 < 10. Shortage: 30 - 5 = 25.
  // 25 / 12 = 2.083 -> Math.ceil = 3 * 12 = 36
  assert.equal(evalMultiple.isBreached, true);
  assert.equal(evalMultiple.shortageQty, 25);
  assert.equal(evalMultiple.suggestedOrderQty, 36);

  // Test 5: Incoming PO Prevents Duplicate Ordering
  // Real stock is 5 (below min 20), BUT 50 units are already on a pending PO in transit!
  const evalInTransit = evaluateReorderingRule({
    productId: 104,
    minQty: 20,
    maxQty: 60,
    onHandQty: 5,
    incomingQty: 50,
    outgoingQty: 0,
  });
  // Forecasted: 5 + 50 = 55 >= 20 -> Should NOT order again!
  assert.equal(evalInTransit.isBreached, false);
  assert.equal(evalInTransit.forecastedQty, 55);
  assert.equal(evalInTransit.suggestedOrderQty, 0);

  // Test 6: Invalid Config (min > max or min < 0)
  const evalInvalid = evaluateReorderingRule({
    productId: 105,
    minQty: 50,
    maxQty: 20, // max < min!
    onHandQty: 10,
    incomingQty: 0,
  });
  assert.equal(evalInvalid.isBreached, false);
  assert.equal(evalInvalid.reason, 'INVALID_RULE_CONFIG');

  // Test 7: Grouping Breached Items by Preferred Supplier & Warehouse
  const mockBreachedItems: BreachedReorderItem[] = [
    {
      ruleId: 1,
      productId: 201,
      productName: 'سكر أبيض 1 كجم',
      unitCost: 35,
      supplierId: 10,
      supplierName: 'شركة السكر الوطنية',
      warehouseId: 1,
      warehouseName: 'مخزن العبور',
      onHandQty: 2,
      incomingQty: 0,
      forecastedQty: 2,
      minQty: 20,
      maxQty: 100,
      qtyMultiple: 10,
      suggestedOrderQty: 100,
      estimatedCost: 3500,
    },
    {
      ruleId: 2,
      productId: 202,
      productName: 'شاي ناعم 250 جم',
      unitCost: 45,
      supplierId: 10,
      supplierName: 'شركة السكر الوطنية',
      warehouseId: 1,
      warehouseName: 'مخزن العبور',
      onHandQty: 5,
      incomingQty: 0,
      forecastedQty: 5,
      minQty: 25,
      maxQty: 80,
      qtyMultiple: 12,
      suggestedOrderQty: 84,
      estimatedCost: 3780,
    },
    {
      ruleId: 3,
      productId: 301,
      productName: 'زيت عباد 1 لتر',
      unitCost: 65,
      supplierId: 20,
      supplierName: 'شركة الزيوت الحديثة',
      warehouseId: 2,
      warehouseName: 'مخزن أكتوبر',
      onHandQty: 0,
      incomingQty: 0,
      forecastedQty: 0,
      minQty: 15,
      maxQty: 50,
      qtyMultiple: 6,
      suggestedOrderQty: 54,
      estimatedCost: 3510,
    },
  ];

  const plans = groupReorderItemsBySupplier(mockBreachedItems);
  assert.equal(plans.length, 2, 'Should create 2 distinct supplier PO plans');

  const sugarPlan = plans.find((p) => p.supplierId === 10);
  assert.ok(sugarPlan);
  assert.equal(sugarPlan.supplierName, 'شركة السكر الوطنية');
  assert.equal(sugarPlan.items.length, 2);
  assert.equal(sugarPlan.totalQuantity, 184); // 100 + 84
  assert.equal(sugarPlan.totalAmount, 3500 + 3780); // 7280

  const oilPlan = plans.find((p) => p.supplierId === 20);
  assert.ok(oilPlan);
  assert.equal(oilPlan.supplierName, 'شركة الزيوت الحديثة');
  assert.equal(oilPlan.items.length, 1);
  assert.equal(oilPlan.totalQuantity, 54);
  assert.equal(oilPlan.totalAmount, 3510);

  console.log('Automated reordering rule engine spec passed with 100% assertions!');
})();
