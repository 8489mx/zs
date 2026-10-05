import { strict as assert } from 'node:assert';
import {
  reconcileTripFinancials,
  reconcileVanStockAudit,
  evaluateCreditLimitCheck,
  evaluateOdometerReadings,
  evaluateMakerCheckerSettlement,
  evaluateNightStockRetention,
} from '../../src/modules/delivery-reps/van-trip-reconciliation.engine';

// =========================================================================
// 1. reconcileTripFinancials - Canonical Equation & Cash Reconciliations
// =========================================================================

// Test 1.1: Balanced trip equation when loaded matches sales + remaining - returns
// Formula: [Loaded] = [Cash Sales] + [Credit Sales] + [Van Stock Remaining] - [Customer Returns]
// 10,000 = (4,000 + 2,000) + 4,500 - 500 = 10,000
const balancedTrip = reconcileTripFinancials({
  loadedAmount: 10000,
  salesAmount: 6000,
  cashSales: 4000,
  creditSales: 2000,
  fieldCollections: 1500,
  returnsAmount: 500,
  cashRefunds: 100,
  countedCash: 5400, // Expected: 4000 + 1500 - 100 = 5400
  remainingVanStockValue: 4500,
});

assert.equal(balancedTrip.isGoodsEquationBalanced, true);
assert.equal(balancedTrip.goodsEquationDiscrepancy, 0);
assert.equal(balancedTrip.expectedRemainingValue, 4500);
assert.equal(balancedTrip.expectedCash, 5400);
assert.equal(balancedTrip.countedCash, 5400);
assert.equal(balancedTrip.cashVariance, 0);
assert.equal(balancedTrip.cashVarianceStatus, 'balanced');
assert.equal(balancedTrip.cashShortageAmount, 0);
assert.equal(balancedTrip.cashOverageAmount, 0);

// Test 1.2: Cash Shortage scenario
const shortageTrip = reconcileTripFinancials({
  loadedAmount: 10000,
  salesAmount: 6000,
  cashSales: 4000,
  creditSales: 2000,
  fieldCollections: 1000,
  returnsAmount: 0,
  cashRefunds: 0,
  countedCash: 4800, // Expected: 5000 -> Shortage of 200
  remainingVanStockValue: 4000,
});

assert.equal(shortageTrip.expectedCash, 5000);
assert.equal(shortageTrip.countedCash, 4800);
assert.equal(shortageTrip.cashVariance, -200);
assert.equal(shortageTrip.cashVarianceStatus, 'shortage');
assert.equal(shortageTrip.cashShortageAmount, 200);
assert.equal(shortageTrip.cashOverageAmount, 0);

// Test 1.3: Cash Overage scenario
const overageTrip = reconcileTripFinancials({
  loadedAmount: 5000,
  salesAmount: 3000,
  cashSales: 3000,
  creditSales: 0,
  fieldCollections: 500,
  returnsAmount: 0,
  cashRefunds: 0,
  countedCash: 3650, // Expected: 3500 -> Overage of 150
  remainingVanStockValue: 2000,
});

assert.equal(overageTrip.expectedCash, 3500);
assert.equal(overageTrip.countedCash, 3650);
assert.equal(overageTrip.cashVariance, 150);
assert.equal(overageTrip.cashVarianceStatus, 'overage');
assert.equal(overageTrip.cashShortageAmount, 0);
assert.equal(overageTrip.cashOverageAmount, 150);

// Test 1.4: Goods equation discrepancy (unaccounted stock loss)
const discrepancyTrip = reconcileTripFinancials({
  loadedAmount: 10000,
  salesAmount: 6000,
  cashSales: 4000,
  creditSales: 2000,
  fieldCollections: 0,
  returnsAmount: 0,
  cashRefunds: 0,
  countedCash: 4000,
  remainingVanStockValue: 3500, // 500 worth of stock unaccounted for
});

assert.equal(discrepancyTrip.isGoodsEquationBalanced, false);
assert.equal(discrepancyTrip.goodsEquationDiscrepancy, 500);

// =========================================================================
// 2. reconcileVanStockAudit - Physical Stock Count Reconciliation
// =========================================================================

const stockAudit = reconcileVanStockAudit([
  {
    productId: 101,
    productName: 'Product A (Balanced)',
    systemQty: 10,
    countedQty: 10,
    costPrice: 25,
    retailPrice: 40,
  },
  {
    productId: 102,
    productName: 'Product B (Shortage 2 pcs)',
    systemQty: 20,
    countedQty: 18,
    costPrice: 50,
    retailPrice: 80,
  },
  {
    productId: 103,
    productName: 'Product C (Overage 1 pc)',
    systemQty: 5,
    countedQty: 6,
    costPrice: 30,
    retailPrice: 45,
  },
]);

assert.equal(stockAudit.totalSystemItems, 3);
assert.equal(stockAudit.auditedItemsCount, 3);
assert.equal(stockAudit.varianceItemsCount, 2);
assert.equal(stockAudit.hasStockDiscrepancy, true);
assert.equal(stockAudit.totalStockShortageCost, 100); // 2 * 50
assert.equal(stockAudit.totalStockOverageCost, 30);   // 1 * 30
assert.equal(stockAudit.netStockVarianceCost, -70);

const shortageItem = stockAudit.itemVariances.find((iv) => iv.productId === 102);
assert.equal(shortageItem?.status, 'shortage');
assert.equal(shortageItem?.varianceQty, -2);
assert.equal(shortageItem?.shortageCost, 100);

const overageItem = stockAudit.itemVariances.find((iv) => iv.productId === 103);
assert.equal(overageItem?.status, 'overage');
assert.equal(overageItem?.varianceQty, 1);
assert.equal(overageItem?.overageCost, 30);

// Default non-audited item stays balanced
const unAudited = reconcileVanStockAudit([
  {
    productId: 104,
    productName: 'Product D',
    systemQty: 15,
    costPrice: 10,
    retailPrice: 15,
  },
]);
assert.equal(unAudited.auditedItemsCount, 0);
assert.equal(unAudited.hasStockDiscrepancy, false);
assert.equal(unAudited.totalStockShortageCost, 0);
assert.equal(unAudited.itemVariances[0].status, 'balanced');

// =========================================================================
// 3. evaluateCreditLimitCheck - Field Credit Limit & Block Checks
// =========================================================================

// Blocked customer rejected
const blockedCheck = evaluateCreditLimitCheck({
  customerId: 5,
  customerName: 'Blocked Store',
  currentBalance: 1000,
  creditLimit: 10000,
  isCreditBlocked: true,
  creditBlockReason: 'تجاوز فترة السداد لأكثر من 60 يوماً',
  requestedCreditAmount: 500,
});
assert.equal(blockedCheck.allowed, false);
assert.equal(blockedCheck.reasonCode, 'CUSTOMER_BLOCKED');
assert.equal(blockedCheck.errorMessageAr?.includes('تجاوز فترة السداد'), true);

// Exceeded credit limit rejected
const limitExceededCheck = evaluateCreditLimitCheck({
  customerId: 6,
  customerName: 'Limited Market',
  currentBalance: 8000,
  creditLimit: 10000,
  isCreditBlocked: false,
  requestedCreditAmount: 3000, // 8000 + 3000 = 11000 > 10000
});
assert.equal(limitExceededCheck.allowed, false);
assert.equal(limitExceededCheck.reasonCode, 'LIMIT_EXCEEDED');
assert.equal(limitExceededCheck.exceededAmount, 1000);
assert.equal(limitExceededCheck.projectedBalance, 11000);

// Within credit limit permitted
const withinLimitCheck = evaluateCreditLimitCheck({
  customerId: 7,
  customerName: 'Healthy Mart',
  currentBalance: 4000,
  creditLimit: 10000,
  isCreditBlocked: false,
  requestedCreditAmount: 3000, // 4000 + 3000 = 7000 <= 10000
});
assert.equal(withinLimitCheck.allowed, true);
assert.equal(withinLimitCheck.projectedBalance, 7000);
assert.equal(withinLimitCheck.exceededAmount, 0);

// Unlimited credit (limit = 0) permitted
const unlimitedCheck = evaluateCreditLimitCheck({
  customerId: 8,
  customerName: 'Unlimited Partner',
  currentBalance: 50000,
  creditLimit: 0,
  isCreditBlocked: false,
  requestedCreditAmount: 20000,
});
assert.equal(unlimitedCheck.allowed, true);
assert.equal(unlimitedCheck.projectedBalance, 70000);

// Zero or negative requested amount rejected
const zeroCreditCheck = evaluateCreditLimitCheck({
  customerId: 9,
  customerName: 'Invalid Amount',
  currentBalance: 0,
  creditLimit: 5000,
  isCreditBlocked: false,
  requestedCreditAmount: 0,
});
assert.equal(zeroCreditCheck.allowed, false);
assert.equal(zeroCreditCheck.reasonCode, 'ZERO_OR_NEGATIVE_REQUEST');

// =========================================================================
// 4. evaluateOdometerReadings - Distance & Meter Validation
// =========================================================================

const odometerValid = evaluateOdometerReadings({
  startOdometer: 14500,
  endOdometer: 14685.5,
});
assert.equal(odometerValid.valid, true);
assert.equal(odometerValid.distanceKm, 185.5);

const odometerRollback = evaluateOdometerReadings({
  startOdometer: 15000,
  endOdometer: 14900,
});
assert.equal(odometerRollback.valid, false);
assert.equal(odometerRollback.errorMessageAr?.includes('أقل من قراءة بداية الرحلة'), true);

// =========================================================================
// 5. evaluateMakerCheckerSettlement - Segregation of Duties
// =========================================================================

// Delivery rep self-approval blocked
const selfApproval = evaluateMakerCheckerSettlement({
  repUserId: 77,
  actorUserId: 77,
  actorRole: 'admin',
  isSupervisorOrAdmin: true,
});
assert.equal(selfApproval.allowed, false);
assert.equal(selfApproval.reasonCode, 'MAKER_CHECKER_SELF_APPROVAL');

// Independent supervisor approved
const supervisorApproval = evaluateMakerCheckerSettlement({
  repUserId: 77,
  actorUserId: 12,
  actorRole: 'admin',
  isSupervisorOrAdmin: true,
});
assert.equal(supervisorApproval.allowed, true);

// Unauthorized viewer rejected
const viewerRejection = evaluateMakerCheckerSettlement({
  repUserId: 77,
  actorUserId: 12,
  actorRole: 'viewer',
  isSupervisorOrAdmin: false,
});
assert.equal(viewerRejection.allowed, false);
assert.equal(viewerRejection.reasonCode, 'UNAUTHORIZED_ROLE');

// =========================================================================
// 6. evaluateNightStockRetention - Overnight Van Stock Governance
// =========================================================================

// Unloading to warehouse always permitted
const unloadPermitted = evaluateNightStockRetention({
  unloadRemainingToWarehouse: true,
  remainingItemsCount: 15,
  nightStockApproved: false,
});
assert.equal(unloadPermitted.allowed, true);
assert.equal(unloadPermitted.status, 'unloaded_to_warehouse');

// Night stock without supervisor approval rejected
const nightStockUnapproved = evaluateNightStockRetention({
  unloadRemainingToWarehouse: false,
  remainingItemsCount: 12,
  nightStockApproved: false,
});
assert.equal(nightStockUnapproved.allowed, false);
assert.equal(nightStockUnapproved.status, 'rejected_missing_approval');
assert.equal(nightStockUnapproved.errorMessageAr?.includes('Night Stock'), true);

// Night stock with supervisor approval permitted
const nightStockApproved = evaluateNightStockRetention({
  unloadRemainingToWarehouse: false,
  remainingItemsCount: 12,
  nightStockApproved: true,
  nightStockNotes: 'معتمد للمندوب لبدء مسار الفجر مبكراً',
});
assert.equal(nightStockApproved.allowed, true);
assert.equal(nightStockApproved.status, 'night_stock_approved');

console.log('[OK] All VanTripReconciliationEngine critical unit tests passed 100% successfully.');
