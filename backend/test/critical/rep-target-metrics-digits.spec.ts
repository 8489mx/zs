/*
New file: backend/test/critical/rep-target-metrics-digits.spec.ts
Pins rep target tracking inputs at the tenant's book digits
(money-precision program, package 7;
INV-REP-TARGET-METRICS-DIGITS).

THE GAP: calculateRepTargetMetrics normalized its money inputs
with toFixed(2), so a 3-decimal tenant's target of 100000.125 was
reported as 100000.13 — and worse, the achieved comparison ran on
the rounded values, so a rep 0.001 short of target (99999.999
against 100000) read as "target achieved".

THE DECISION (user-approved 2026-10-30): only the INPUTS take
digits. The remaining/required-daily outputs deliberately stay
whole currency units (Math.round / Math.ceil) — a display
convention the frontend duplicates when it renders them — and the
rates stay one-decimal percents and the visits stay counts. Only
the three input normalizations (sales target, sales actual,
collections actual) round through the canonical engine at the
caller's digits. The collection TARGET stays whole-rounded, as
before: targets are set in whole units.

WHAT THIS PINS:
- Target/actual/collections echoes keep three decimals at
  digits 3.
- The 0.001-short rep is NOT achieved at digits 3 (the old code
  called it achieved); at digits 2 the edge still reads achieved,
  exactly as before — the fix is precision-dependent, by design.
- Remaining/required-daily outputs stay whole units even at
  digits 3.
- Omitting digits fails closed instead of normalizing to cents.
*/

import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { calculateRepTargetMetrics } from '../../src/modules/delivery-reps/rep-target.engine';

const NO_DIGITS = undefined as unknown as 2;

async function main(): Promise<void> {
  // 3-decimal echoes; whole-unit outputs unchanged.
  const r3 = calculateRepTargetMetrics({
    targetAmount: 100000.125,
    actualSalesMTD: 50000.125,
    collectionTarget: 50000,
    actualCollectionsMTD: 25000.125,
    visitsTarget: 10,
    actualVisitsMTD: 7,
    currentDate: '2026-09-24',
    weekendDays: [5],
    officialHolidays: ['2026-09-28'],
    moneyDigits: 3,
  });
  assert.equal(r3.targetAmount, 100000.125);
  assert.equal(r3.actualSalesMTD, 50000.125);
  assert.equal(r3.actualCollectionsMTD, 25000.125);
  assert.equal(r3.achievementRate, 50);
  assert.equal(r3.remainingTarget, 50000);
  assert.equal(r3.requiredDailyTarget, 10000);
  assert.equal(r3.collectionAchievementRate, 50);
  assert.equal(r3.remainingCollection, 25000);
  assert.equal(r3.requiredDailyCollection, 5000);
  assert.equal(r3.remainingVisits, 3);
  assert.equal(r3.requiredDailyVisits, 1);

  // 0.001 short of target: not achieved at 3 decimals.
  const short3 = calculateRepTargetMetrics({
    targetAmount: 100000,
    actualSalesMTD: 99999.999,
    currentDate: '2026-09-26',
    weekendDays: [5],
    moneyDigits: 3,
  });
  assert.equal(short3.actualSalesMTD, 99999.999);
  assert.equal(short3.isTargetAchieved, false);
  // The whole-unit remaining display rounds the 0.001 gap to 0 —
  // the accepted consequence of the whole-unit convention.
  assert.equal(short3.remainingTarget, 0);
  const short2 = calculateRepTargetMetrics({
    targetAmount: 100000,
    actualSalesMTD: 99999.999,
    currentDate: '2026-09-26',
    weekendDays: [5],
    moneyDigits: 2,
  });
  assert.equal(short2.actualSalesMTD, 100000);
  assert.equal(short2.isTargetAchieved, true);

  // 2-decimal tenants compute exactly what they computed before.
  const r2 = calculateRepTargetMetrics({
    targetAmount: 100000.125,
    actualSalesMTD: 50000.125,
    currentDate: '2026-09-24',
    weekendDays: [5],
    officialHolidays: ['2026-09-28'],
    moneyDigits: 2,
  });
  assert.equal(r2.targetAmount, 100000.13);
  assert.equal(r2.actualSalesMTD, 50000.13);
  assert.equal(r2.remainingTarget, 50000);
  assert.equal(r2.requiredDailyTarget, 10000);

  // Omitted digits must fail closed, not normalize to cents.
  assert.throws(
    () => calculateRepTargetMetrics({ targetAmount: 100, actualSalesMTD: 50, moneyDigits: NO_DIGITS }),
    /Invalid monetary minor units/,
  );

  console.log('Rep target metrics digits tests passed.');
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
