/*
New file: backend/test/critical/landed-cost-exchange-rate-required.spec.ts
Pins the landed-cost exchange-rate guard (INV-LANDED-COST-EXCHANGE-RATE-REQUIRED).

THE GAP: calculateLandedCostBreakdown silently replaced a missing,
zero, negative, or non-finite exchange rate with 1 (and clamped
tiny rates up to 0.0001) — so a shipment whose arrival rate was
never set costed every line at rate 1 with no error anywhere, and
the stored landed costs looked plausible while being wrong by the
whole exchange rate.

THE RULE: the breakdown engine fails closed on any exchange rate
that is missing, zero, negative, or non-finite. Valid rates pass
through exactly, including rates below 1. The rounding, the
allocation, and the EGP field names are deliberately unchanged
by this package.

WHAT THIS PINS, calling the REAL pure engine directly:
- a valid rate converts exactly (10 USD at 48.5 -> 485 base cost).
- a valid sub-1 rate converts exactly (10 USD at 0.5 -> 5).
- undefined, 0, negative, NaN, and Infinity rates throw.
- a tiny positive rate is used exactly as supplied, not silently
  clamped up to 0.0001 (10 USD at 0.00005 -> 0.0005 base cost).
*/

import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { calculateLandedCostBreakdown } from '../../src/modules/import-sales/engines/import-landed-cost.engine';

const items = [{ id: '1', productId: 201, quantity: 10, factoryUnitPriceUsd: 10 }];

function breakdownWithRate(exchangeRate: unknown): ReturnType<typeof calculateLandedCostBreakdown> {
  return calculateLandedCostBreakdown({
    items,
    exchangeRate: exchangeRate as number,
    shippingCostUsd: 0,
    customsCostEgp: 0,
    internalTransportCostEgp: 0,
  });
}

async function main(): Promise<void> {
  const valid = breakdownWithRate(48.5);
  assert.equal(valid.items[0].baseCostEgp, 485);
  assert.equal(valid.items[0].landedCostEgp, 485);

  const subOne = breakdownWithRate(0.5);
  assert.equal(subOne.items[0].baseCostEgp, 5);

  for (const bad of [undefined, null, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => breakdownWithRate(bad), /exchange rate/i, `rate ${String(bad)} must fail closed`);
  }

  const tiny = breakdownWithRate(0.00005);
  assert.equal(tiny.items[0].baseCostEgp, 0.0005);

  console.log('landed cost exchange rate required checks passed');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
