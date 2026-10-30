/*
New file: backend/test/critical/import-wac-unification.spec.ts
Pins the WAC unification (inventory #3): the import receipt blends
through the ONE canonical weightedReceiptCost — including the
negative-stock policy — instead of its own formula that took the
incoming cost whenever the prior stock was zero or negative.

WHAT WAS WRONG: importWeightedAverageCost computed
oldQty > 0 ? blend : incoming cost. A receipt following overselling
(-10 @ 5, then 20 @ 6) stored 6, erasing the booked shortfall value
and valuing the same receipt differently from a purchase receipt
(7 under the algebraic blend). The decision, approved 2026-10-30:
the algebraic blend, one policy for every receipt path.

WHAT THIS PINS:
- The import function equals weightedReceiptCost on every
  non-degenerate case, including all negative-stock shapes (blend,
  still-short fallback, dust-emptying, negative-result fallback).
- The import-side contract is preserved: a zero-quantity group
  keeps the old cost, and corrupt inputs still fail closed with the
  same Arabic BadRequestException messages (not the engine's plain
  Error) — the delegation happens only after import validation.
- The caller-side quantity recovery is the canonical helper:
  recoverWacBeforeQty(globalAfter, qty) is the inline math the
  import receipt already used.
*/

import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { importWeightedAverageCost } from '../../src/modules/import-sales/import-inventory-cost.engine';
import {
  recoverWacBeforeQty,
  weightedReceiptCost,
} from '../../src/modules/accounting/engines/inventory-valuation.engine';

async function main(): Promise<void> {
  // The policy change, worked once: -10 @ 5 + 20 @ 6 blends to 7.
  assert.equal(importWeightedAverageCost(-10, 5, 20, 120), 7);
  // Still short after the receipt: falls back to the old cost.
  assert.equal(importWeightedAverageCost(-10, 5, 6, 36), 3.5);
  // Receipt exactly empties the pool: keeps the old cost.
  assert.equal(importWeightedAverageCost(-10, 5, 10, 60), 5);
  // Negative algebraic result on a recovered pool: incoming cost.
  assert.equal(importWeightedAverageCost(-10, 5, 20, 40), 2);
  // Positive and zero pools are unchanged by the unification.
  assert.equal(importWeightedAverageCost(100, 5, 20, 120), 5.166667);
  assert.equal(importWeightedAverageCost(0, 5, 20, 120), 6);

  // Unification property: the import function IS the canonical blend
  // on every case the canonical engine accepts.
  const cases: Array<[number, number, number, number]> = [
    [100, 5, 20, 120],
    [0, 5, 20, 120],
    [-10, 5, 20, 120],
    [-10, 5, 6, 36],
    [-10, 5, 10, 60],
    [-10, 5, 20, 40],
    [50, 8, 50, 500],
    [-3, 4, 3, 30],
    [7.5, 2.5, 2.5, 10],
  ];
  for (const [oldQty, oldCost, qty, value] of cases) {
    assert.equal(
      importWeightedAverageCost(oldQty, oldCost, qty, value),
      weightedReceiptCost(oldQty, oldCost, qty, value),
      `import blend must equal the canonical blend for (${oldQty}, ${oldCost}, ${qty}, ${value})`,
    );
  }

  // Import contract preserved: zero quantity keeps the old cost.
  assert.equal(importWeightedAverageCost(100, 5, 0, 0), 5);

  // Import contract preserved: corrupt inputs fail closed with the
  // import flow's own Arabic 400 messages.
  assert.throws(() => importWeightedAverageCost(Number.NaN, 5, 10, 50), /رصيد المخزون غير صالح/);
  assert.throws(() => importWeightedAverageCost(100, -1, 10, 50), /التكلفة السابقة/);
  assert.throws(() => importWeightedAverageCost(100, 5, 10, -1), /قيمة الاستلام/);
  assert.throws(() => importWeightedAverageCost(100, 5, -2, 50), /الكمية المستلمة/);

  // The caller-side quantity recovery is the canonical helper.
  assert.equal(recoverWacBeforeQty(100, 10), 90);
  assert.equal(recoverWacBeforeQty(100, 10), Number((100 - 10).toFixed(3)));

  console.log('Import WAC unification tests passed.');
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
