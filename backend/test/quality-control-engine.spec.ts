import assert from 'node:assert/strict';
import {
  evaluateInspectionResult,
  shouldTriggerNCR,
  suggestNCRSeverity,
  calculateQualityAcceptanceRate,
} from '../src/modules/inventory/engines/quality-control.engine';

console.log('--- Starting Quality Control Engine Tests ---');

// Test 1: Pass/Fail Evaluation
{
  const passResult = evaluateInspectionResult(
    { testType: 'pass_fail' },
    { testType: 'pass_fail', passed: true, inspectedQty: 10, acceptedQty: 10, rejectedQty: 0 },
  );
  assert.equal(passResult.status, 'passed');

  const failResult = evaluateInspectionResult(
    { testType: 'pass_fail' },
    { testType: 'pass_fail', passed: false, inspectedQty: 10, acceptedQty: 0, rejectedQty: 10 },
  );
  assert.equal(failResult.status, 'failed');
  assert.ok(failResult.reason?.includes('فشل الفحص'));

  const conditionalResult = evaluateInspectionResult(
    { testType: 'pass_fail' },
    { testType: 'pass_fail', passed: false, inspectedQty: 10, acceptedQty: 8, rejectedQty: 2 },
  );
  assert.equal(conditionalResult.status, 'conditional');
  assert.ok(conditionalResult.reason?.includes('قبول جزئي مشروط'));

  console.log('✓ Test 1 Passed: Pass/Fail and partial acceptance evaluated accurately');
}

// Test 2: Measure Tolerance Tests
{
  // Specification: Diameter between 20.0mm and 20.5mm
  const criteria = { testType: 'measure' as const, normMeasureMin: 20.0, normMeasureMax: 20.5 };

  const validMeasure = evaluateInspectionResult(criteria, {
    testType: 'measure',
    measuredValue: 20.3,
    inspectedQty: 1,
    acceptedQty: 1,
    rejectedQty: 0,
  });
  assert.equal(validMeasure.status, 'passed');

  const outOfToleranceHigh = evaluateInspectionResult(criteria, {
    testType: 'measure',
    measuredValue: 20.8,
    inspectedQty: 1,
    acceptedQty: 0,
    rejectedQty: 1,
  });
  assert.equal(outOfToleranceHigh.status, 'failed');
  assert.ok(outOfToleranceHigh.reason?.includes('خارج حدود التسامح'));

  const outOfToleranceLow = evaluateInspectionResult(criteria, {
    testType: 'measure',
    measuredValue: 19.4,
    inspectedQty: 1,
    acceptedQty: 0,
    rejectedQty: 1,
  });
  assert.equal(outOfToleranceLow.status, 'failed');

  console.log('✓ Test 2 Passed: Quantitative measurement tolerances strictly bounded');
}

// Test 3: NCR Triggers & Severity Deduction
{
  assert.equal(shouldTriggerNCR('passed', 0), false);
  assert.equal(shouldTriggerNCR('failed', 10), true);
  assert.equal(shouldTriggerNCR('conditional', 2), true);

  assert.equal(suggestNCRSeverity(60, 100), 'critical', '>=50% is critical');
  assert.equal(suggestNCRSeverity(20, 100), 'major', '>=10% is major');
  assert.equal(suggestNCRSeverity(2, 100), 'minor', '<10% is minor');

  console.log('✓ Test 3 Passed: NCR trigger and severity deduction working correctly');
}

// Test 4: Acceptance Rate Calculation
{
  const inspections = [
    { inspectedQty: 100, acceptedQty: 95, rejectedQty: 5 },
    { inspectedQty: 50, acceptedQty: 50, rejectedQty: 0 },
    { inspectedQty: 50, acceptedQty: 35, rejectedQty: 15 },
  ];
  // Total inspected: 200, Total accepted: 180 (90%)
  const rates = calculateQualityAcceptanceRate(inspections);
  assert.equal(rates.totalInspected, 200);
  assert.equal(rates.totalAccepted, 180);
  assert.equal(rates.totalRejected, 20);
  assert.equal(rates.acceptanceRatePercent, 90.0);

  console.log('✓ Test 4 Passed: Overall quality acceptance rates aggregate with precision');
}

console.log('\nAll 4 Quality Control Engine tests passed with 100% precision.');
