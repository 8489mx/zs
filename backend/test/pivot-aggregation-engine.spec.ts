import assert from 'node:assert/strict';
import {
  buildDynamicPivotMatrix,
  extractDimensionValue,
  type PivotEngineInput,
} from '../src/modules/reports/engines/pivot-aggregation.engine';

const sampleSales = [
  {
    branch: 'الفرع الرئيسي',
    category: 'إلكترونيات',
    date_month: '2026-08',
    total_amount: 1000,
    net_profit: 300,
    quantity: 5,
  },
  {
    branch: 'الفرع الرئيسي',
    category: 'إلكترونيات',
    date_month: '2026-09',
    total_amount: 1500,
    net_profit: 450,
    quantity: 10,
  },
  {
    branch: 'الفرع الرئيسي',
    category: 'أجهزة منزلية',
    date_month: '2026-09',
    total_amount: 2000,
    net_profit: 500,
    quantity: 4,
  },
  {
    branch: 'فرع الإسكندرية',
    category: 'إلكترونيات',
    date_month: '2026-08',
    total_amount: 3000,
    net_profit: 900,
    quantity: 15,
  },
  {
    branch: 'فرع الإسكندرية',
    category: 'أجهزة منزلية',
    date_month: '2026-09',
    total_amount: 2500,
    net_profit: 600,
    quantity: 8,
  },
];

// Test 1: One-dimensional pivot (Rows = branch, Metric = total_amount)
{
  const input: PivotEngineInput = {
    records: sampleSales,
    rowDimension: 'branch',
    metric: 'total_amount',
  };

  const res = buildDynamicPivotMatrix(input);
  assert.equal(res.rowKeys.length, 2);
  // فرع الإسكندرية total = 3000 + 2500 = 5500
  // الفرع الرئيسي total = 1000 + 1500 + 2000 = 4500
  // Sorted descending: first row must be 'فرع الإسكندرية'
  assert.equal(res.rowKeys[0].label, 'فرع الإسكندرية');
  assert.equal(res.rowTotals['فرع الإسكندرية'].value, 5500);
  assert.equal(res.rowTotals['الفرع الرئيسي'].value, 4500);
  assert.equal(res.grandTotal.value, 10000);
  console.log('✓ Test 1 Passed: 1D Pivot calculates correct branch subtotals and descending sort');
}

// Test 2: Two-dimensional pivot (Rows = branch, Columns = date_month, Metric = total_amount)
{
  const input: PivotEngineInput = {
    records: sampleSales,
    rowDimension: 'branch',
    colDimension: 'date_month',
    metric: 'total_amount',
  };

  const res = buildDynamicPivotMatrix(input);
  assert.equal(res.colKeys.length, 2);
  // Matrix cells
  assert.equal(res.matrix['الفرع الرئيسي']['2026-08'].value, 1000);
  assert.equal(res.matrix['الفرع الرئيسي']['2026-09'].value, 3500); // 1500 + 2000
  assert.equal(res.matrix['فرع الإسكندرية']['2026-08'].value, 3000);
  assert.equal(res.matrix['فرع الإسكندرية']['2026-09'].value, 2500);

  // Column totals
  assert.equal(res.colTotals['2026-08'].value, 4000); // 1000 + 3000
  assert.equal(res.colTotals['2026-09'].value, 6000); // 3500 + 2500
  assert.equal(res.grandTotal.value, 10000);
  console.log('✓ Test 2 Passed: 2D Pivot cross-tabulation matches row, col, and grand totals');
}

// Test 3: Net profit metric
{
  const input: PivotEngineInput = {
    records: sampleSales,
    rowDimension: 'category',
    metric: 'net_profit',
  };

  const res = buildDynamicPivotMatrix(input);
  // إلكترونيات: 300 + 450 + 900 = 1650
  // أجهزة منزلية: 500 + 600 = 1100
  assert.equal(res.rowTotals['إلكترونيات'].value, 1650);
  assert.equal(res.rowTotals['أجهزة منزلية'].value, 1100);
  assert.equal(res.grandTotal.value, 2750);
  console.log('✓ Test 3 Passed: Net profit aggregation functions accurately');
}

// Test 4: Quantity and transaction Count
{
  const inputQty: PivotEngineInput = {
    records: sampleSales,
    rowDimension: 'branch',
    metric: 'quantity',
  };
  const resQty = buildDynamicPivotMatrix(inputQty);
  assert.equal(resQty.grandTotal.value, 42); // 5 + 10 + 4 + 15 + 8

  const inputCount: PivotEngineInput = {
    records: sampleSales,
    rowDimension: 'branch',
    metric: 'count',
  };
  const resCount = buildDynamicPivotMatrix(inputCount);
  assert.equal(resCount.grandTotal.value, 5);
  console.log('✓ Test 4 Passed: Quantity and Count metrics computed correctly');
}

// Test 5: Average amount calculation (avg_amount)
{
  const inputAvg: PivotEngineInput = {
    records: sampleSales,
    rowDimension: 'branch',
    metric: 'avg_amount',
  };
  const resAvg = buildDynamicPivotMatrix(inputAvg);
  // الفرع الرئيسي: 4500 / 3 = 1500
  assert.equal(resAvg.rowTotals['الفرع الرئيسي'].value, 1500);
  // فرع الإسكندرية: 5500 / 2 = 2750
  assert.equal(resAvg.rowTotals['فرع الإسكندرية'].value, 2750);
  // Grand average: 10000 / 5 = 2000
  assert.equal(resAvg.grandTotal.value, 2000);
  console.log('✓ Test 5 Passed: Average amount correctly calculated across dimensions');
}

// Test 6: Empty records handling
{
  const inputEmpty: PivotEngineInput = {
    records: [],
    rowDimension: 'branch',
    metric: 'total_amount',
  };
  const resEmpty = buildDynamicPivotMatrix(inputEmpty);
  assert.equal(resEmpty.rowKeys.length, 0);
  assert.equal(resEmpty.grandTotal.value, 0);
  console.log('✓ Test 6 Passed: Empty record set gracefully returns zero matrix');
}

console.log('\nAll 6 Dynamic BI Pivot Engine tests passed with 100% precision.');
