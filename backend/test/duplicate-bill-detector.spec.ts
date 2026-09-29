import assert from 'node:assert/strict';
import {
  detectDuplicateBills,
  calculateLevenshteinDistance,
  normalizeBillNumber,
  type CandidateBill,
  type HistoricalPurchaseRecord,
} from '../src/modules/purchases/engines/duplicate-bill-detector.engine';

// 1. Normalization tests
assert.equal(normalizeBillNumber('  inv-2026/001  '), 'INV-2026/001');
assert.equal(normalizeBillNumber(''), '');
assert.equal(normalizeBillNumber(null), '');
assert.equal(normalizeBillNumber(undefined), '');
assert.equal(normalizeBillNumber('bill   9901'), 'BILL 9901');

// 2. Levenshtein distance tests
assert.equal(calculateLevenshteinDistance('INV-1001', 'INV-1001'), 0);
assert.equal(calculateLevenshteinDistance('INV-1001', 'INV-1002'), 1);
assert.equal(calculateLevenshteinDistance('INV-1001', 'INV-1011'), 1);
assert.equal(calculateLevenshteinDistance('INV-1001', 'INV-9999'), 4);

// 3. Historical sample setup
const historicalSample: HistoricalPurchaseRecord[] = [
  {
    id: 101,
    docNo: 'PUR-260901-0001',
    supplierId: 5,
    supplierInvoiceNo: 'INV-8890',
    total: 15400.0,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    status: 'posted',
  },
  {
    id: 102,
    docNo: 'PUR-260910-0002',
    supplierId: 5,
    supplierInvoiceNo: 'INV-8891',
    total: 7500.5,
    createdAt: new Date('2026-09-10T12:00:00Z'),
    status: 'posted',
  },
  {
    id: 103,
    docNo: 'PUR-260912-0003',
    supplierId: 8, // Different supplier
    supplierInvoiceNo: 'INV-8890',
    total: 15400.0,
    createdAt: new Date('2026-09-12T09:00:00Z'),
    status: 'posted',
  },
  {
    id: 104,
    docNo: 'PUR-260701-0004',
    supplierId: 5,
    supplierInvoiceNo: 'OLD-001',
    total: 15400.0,
    createdAt: new Date('2026-07-01T09:00:00Z'), // ~75 days ago
    status: 'posted',
  },
  {
    id: 105,
    docNo: 'PUR-260915-0005',
    supplierId: 5,
    supplierInvoiceNo: 'CANCELLED-99',
    total: 3000.0,
    createdAt: new Date('2026-09-15T09:00:00Z'),
    status: 'cancelled',
  },
];

// Test 1: Exact vendor invoice number match -> Blocking
{
  const candidate: CandidateBill = {
    supplierId: 5,
    supplierInvoiceNo: 'inv-8890', // Lowercase test
    total: 12000.0,
    date: new Date('2026-09-20T10:00:00Z'),
  };
  const result = detectDuplicateBills(candidate, historicalSample);
  assert.equal(result.hasDuplicates, true);
  assert.equal(result.hasBlockingDuplicates, true);
  const exactMatch = result.matches.find((m) => m.purchaseId === 101);
  assert.ok(exactMatch);
  assert.equal(exactMatch.reason, 'exact_invoice_no');
  assert.equal(exactMatch.severity, 'blocking');
  assert.equal(exactMatch.docNo, 'PUR-260901-0001');
}

// Test 2: Different supplier -> No collision
{
  const candidate: CandidateBill = {
    supplierId: 99,
    supplierInvoiceNo: 'INV-8890',
    total: 15400.0,
    date: new Date('2026-09-20T10:00:00Z'),
  };
  const result = detectDuplicateBills(candidate, historicalSample);
  assert.equal(result.hasDuplicates, false);
  assert.equal(result.hasBlockingDuplicates, false);
  assert.equal(result.matches.length, 0);
}

// Test 3: Cancelled historical purchase -> Ignored
{
  const candidate: CandidateBill = {
    supplierId: 5,
    supplierInvoiceNo: 'CANCELLED-99',
    total: 3000.0,
    date: new Date('2026-09-20T10:00:00Z'),
  };
  const result = detectDuplicateBills(candidate, historicalSample);
  assert.equal(result.hasDuplicates, false);
}

// Test 4: Exclude self purchase ID on edit -> Ignored
{
  const candidate: CandidateBill = {
    supplierId: 5,
    supplierInvoiceNo: 'INV-8890',
    total: 15400.0,
    date: new Date('2026-09-01T10:00:00Z'),
    excludePurchaseId: 101,
  };
  // Exclude 102 as well from history so neither exact 101 nor similar 102 triggers
  const historyWithout102 = historicalSample.filter((h) => h.id !== 102);
  const result = detectDuplicateBills(candidate, historyWithout102);
  assert.equal(result.hasDuplicates, false);
}

// Test 5: Similar vendor invoice number (typo) -> Warning
{
  const candidate: CandidateBill = {
    supplierId: 5,
    supplierInvoiceNo: 'INV-8892', // Dist = 1 from INV-8891
    total: 2000.0,
    date: new Date('2026-09-20T10:00:00Z'),
  };
  const result = detectDuplicateBills(candidate, historicalSample);
  assert.equal(result.hasDuplicates, true);
  assert.equal(result.hasBlockingDuplicates, false);
  assert.equal(result.hasSuspiciousDuplicates, true);
  const similarMatch = result.matches.find((m) => m.purchaseId === 102);
  assert.ok(similarMatch);
  assert.equal(similarMatch.reason, 'similar_invoice_no');
  assert.equal(similarMatch.severity, 'warning');
}

// Test 6: Identical monetary amount within 30 days -> Warning
{
  const candidate: CandidateBill = {
    supplierId: 5,
    supplierInvoiceNo: 'DIFF-NUM-77',
    total: 7500.5, // Matches purchase 102 from 10 days ago
    date: new Date('2026-09-20T10:00:00Z'),
  };
  const result = detectDuplicateBills(candidate, historicalSample);
  assert.equal(result.hasDuplicates, true);
  assert.equal(result.hasBlockingDuplicates, false);
  assert.equal(result.hasSuspiciousDuplicates, true);
  const amountMatch = result.matches.find((m) => m.purchaseId === 102);
  assert.ok(amountMatch);
  assert.equal(amountMatch.reason, 'identical_amount_recent');
  assert.equal(amountMatch.severity, 'warning');
}

// Test 7: Identical amount past 30 days -> Ignored
{
  const candidate: CandidateBill = {
    supplierId: 5,
    supplierInvoiceNo: 'BRAND-NEW-01',
    total: 15400.0,
    date: new Date('2026-09-20T10:00:00Z'),
  };
  // Exclude purchase 101 to test purchase 104 alone (which is >75 days ago)
  const filteredHistory = historicalSample.filter((h) => h.id !== 101);
  const result = detectDuplicateBills(candidate, filteredHistory);
  assert.equal(result.hasDuplicates, false);
}

console.log('DuplicateBillDetectorEngine (Vendor Duplicate Bill & Fraud Detection) tests passed successfully!');
