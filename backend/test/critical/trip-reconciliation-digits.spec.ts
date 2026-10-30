/*
New file: backend/test/critical/trip-reconciliation-digits.spec.ts
Pins van trip reconciliation amounts at the tenant's book digits
(money-precision program, package 8;
INV-TRIP-RECONCILIATION-DIGITS).

THE GAP: the two reconciliation functions rounded every amount
through file-private 2-decimal rounders, so a 3-decimal tenant's
settlement equation cut 1000.125 to 1000.13 and a stock-shortage
cost of 10.125 to 10.13 before any comparison ran.

THE FIX: digits are REQUIRED — a moneyDigits field on the
financials input and a digits parameter on the stock audit — and
every amount rounds through the canonical engine. Quantities in
the stock audit stay at 4 decimals (they are quantities, not
money). The 0.05 goods-equation tolerance and the 0.01
cash-variance status band are policy bands, deliberately
unchanged: a 0.005 cash variance still reads 'balanced' at 3
decimals, and only the amounts change.

HONEST LIMIT: reconcileTripFinancials has no production caller
today (imported by van-sales.service.ts, never invoked — the live
settleTrip path computes its own cash variance inline, a separate
package). This package corrects the engine and pins it; it
changes no live settlement behavior until the engine is wired.
reconcileVanStockAudit IS live: settleTrip charges the rep from
its totalStockShortageCost, so its 3-decimal costs are live money
from this package forward.

WHAT THIS PINS:
- Financials and stock-audit amounts keep three decimals at
  digits 3 (with the 2-decimal answers beside them).
- The 0.005-in-band case stays 'balanced' at digits 3.
- Shortage/overage statuses and amounts at digits 3.
- Omitting digits fails closed instead of rounding to cents.
*/

import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import {
  reconcileTripFinancials,
  reconcileVanStockAudit,
} from '../../src/modules/delivery-reps/van-trip-reconciliation.engine';

const NO_DIGITS = undefined as unknown as 2;

async function main(): Promise<void> {
  const input = {
    loadedAmount: 1000.125,
    salesAmount: 500.125,
    cashSales: 400.125,
    creditSales: 100,
    fieldCollections: 50.125,
    returnsAmount: 10.125,
    cashRefunds: 5.125,
    tripExpenses: 2.125,
    countedCash: 443.125,
    remainingVanStockValue: 510.125,
    instapaySales: 20.125,
    instapayCollections: 10.125,
  };
  const r3 = reconcileTripFinancials({ ...input, moneyDigits: 3 });
  assert.equal(r3.totalLoaded, 1000.125);
  assert.equal(r3.totalSales, 500.125);
  assert.equal(r3.expectedRemainingValue, 510.125);
  assert.equal(r3.actualRemainingValue, 510.125);
  assert.equal(r3.isGoodsEquationBalanced, true);
  assert.equal(r3.goodsEquationDiscrepancy, 0);
  assert.equal(r3.expectedCash, 443);
  assert.equal(r3.countedCash, 443.125);
  assert.equal(r3.cashVariance, 0.125);
  assert.equal(r3.cashVarianceStatus, 'overage');
  assert.equal(r3.cashOverageAmount, 0.125);
  assert.equal(r3.cashShortageAmount, 0);
  assert.equal(r3.expectedBankTransfers, 30.25);

  const r2 = reconcileTripFinancials({ ...input, moneyDigits: 2 });
  assert.equal(r2.totalLoaded, 1000.13);
  assert.equal(r2.expectedCash, 443);
  assert.equal(r2.cashVariance, 0.13);
  assert.equal(r2.cashOverageAmount, 0.13);
  assert.equal(r2.expectedBankTransfers, 30.26);

  // Shortage direction at 3 decimals.
  const short3 = reconcileTripFinancials({ ...input, countedCash: 442.875, moneyDigits: 3 });
  assert.equal(short3.cashVariance, -0.125);
  assert.equal(short3.cashVarianceStatus, 'shortage');
  assert.equal(short3.cashShortageAmount, 0.125);

  // The 0.01 status band is policy and stays: 0.005 reads balanced.
  const band3 = reconcileTripFinancials({ ...input, countedCash: 443.005, moneyDigits: 3 });
  assert.equal(band3.cashVariance, 0.005);
  assert.equal(band3.cashVarianceStatus, 'balanced');

  // Stock audit: shortage/overage costs at the caller's digits;
  // quantities stay at 4 decimals.
  const items = [
    { productId: 1, productName: 'A', systemQty: 10, countedQty: 9, costPrice: 10.125, retailPrice: 12 },
    { productId: 2, productName: 'B', systemQty: 10, countedQty: 11, costPrice: 10.125, retailPrice: 12 },
  ];
  const a3 = reconcileVanStockAudit(items, 3);
  assert.equal(a3.totalStockShortageCost, 10.125);
  assert.equal(a3.totalStockOverageCost, 10.125);
  assert.equal(a3.netStockVarianceCost, 0);
  assert.equal(a3.itemVariances[0].shortageCost, 10.125);
  assert.equal(a3.itemVariances[1].overageCost, 10.125);
  const a2 = reconcileVanStockAudit(items, 2);
  assert.equal(a2.totalStockShortageCost, 10.13);
  assert.equal(a2.totalStockOverageCost, 10.13);

  // Omitted digits must fail closed, not fall back to cents.
  assert.throws(() => reconcileTripFinancials({ ...input, moneyDigits: NO_DIGITS }), /Invalid monetary minor units/);
  assert.throws(() => reconcileVanStockAudit(items, NO_DIGITS), /Invalid monetary minor units/);

  console.log('Trip reconciliation digits tests passed.');
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
