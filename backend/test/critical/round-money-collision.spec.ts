/*
New file: backend/test/critical/round-money-collision.spec.ts
Pins the roundMoney name-collision resolution (money-precision
program, first package; INV-ROUND-MONEY-COLLISION-RESOLVED).

THE COLLISION: two exported functions shared the name `roundMoney`
with different signatures and different answers:
- common/utils/financial-integrity.ts: roundMoney(value) — one
  argument, hard-coded 2 decimals, lenient (non-finite -> 0).
- accounting/engines/money-minor-units.engine.ts: roundMoney(amount,
  digits) — book digits required (2 or 3), strict (non-finite
  throws). The canonical rounder; 38 files import it.
Any future importer — or an IDE auto-import — could grab the wrong
one and silently cut a 3-decimal tenant's money to cents, and the
type checker would not complain about a one-argument call.

THE FIX (zero behavior change): the legacy function is renamed to
roundMoneyToTwoDecimals; the canonical engine keeps `roundMoney`.

WHAT THIS PINS:
- The old name is gone from financial-integrity (a re-import of
  `roundMoney` from that path must not resolve).
- The renamed function keeps its exact 2-decimal behavior.
- The canonical engine keeps its digits behavior.
- The discrimination: 10.125 rounds to 10.13 under the legacy
  function but stays 10.125 under the canonical engine at 3 digits
  — the proof the two must never share a name.
- validateSalePayments keeps its current (2-decimal) answers, so
  the follow-up package that gives it tenant digits can see exactly
  what changes: a KWD collectible of 10.125 paid with 10.125
  returns paidAmount 10.13 today.
*/

import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import * as financialIntegrity from '../../src/common/utils/financial-integrity';
import { roundMoney } from '../../src/modules/accounting/engines/money-minor-units.engine';

const { roundMoneyToTwoDecimals, validateSalePayments } = financialIntegrity;

async function main(): Promise<void> {
  // The old name must not resolve from the legacy module.
  assert.equal(
    (financialIntegrity as Record<string, unknown>).roundMoney,
    undefined,
    'financial-integrity must no longer export roundMoney',
  );

  // Legacy behavior, unchanged: hard-coded 2 decimals, lenient.
  assert.equal(roundMoneyToTwoDecimals(10.555), 10.56);
  assert.equal(roundMoneyToTwoDecimals(10.554), 10.55);
  assert.equal(roundMoneyToTwoDecimals(10.125), 10.13);
  assert.equal(roundMoneyToTwoDecimals(0.0001), 0);
  assert.equal(roundMoneyToTwoDecimals(0), 0);
  assert.equal(roundMoneyToTwoDecimals(Number.NaN), 0);
  assert.equal(roundMoneyToTwoDecimals(-2.345), -2.35);

  // Canonical behavior, unchanged: digits required, strict.
  assert.equal(roundMoney(10.125, 3), 10.125);
  assert.equal(roundMoney(10.125, 2), 10.13);
  assert.equal(roundMoney(10.555, 2), 10.56);
  assert.throws(() => roundMoney(Number.NaN, 2), /Non-finite monetary amount/);

  // The discrimination, worked once: the same KWD amount.
  assert.notEqual(roundMoneyToTwoDecimals(10.125), roundMoney(10.125, 3));

  // validateSalePayments keeps its current 2-decimal answers.
  const paid = validateSalePayments({
    paymentType: 'cash',
    collectibleTotal: 10.125,
    payments: [{ paymentChannel: 'cash', amount: 10.125 }],
  });
  assert.equal(paid.paidAmount, 10.13);

  console.log('Round money collision tests passed.');
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
