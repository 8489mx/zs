import { strict as assert } from 'node:assert';
import { calculateAssetDepreciation, validateFixedAssetTerms } from '../../src/modules/accounting/engines/fixed-asset-depreciation.engine';
import { calculateForexDifference, forexOffsetCode } from '../../src/modules/accounting/engines/forex-difference.engine';

assert.throws(() => validateFixedAssetTerms(100, -1, 12));
assert.throws(() => validateFixedAssetTerms(100, 101, 12));
assert.throws(() => validateFixedAssetTerms(100, 10, 0));

const asset = {
  cost: 1200, salvage: 200, usefulLifeMonths: 10, accumulated: 0,
  purchaseDate: new Date('2026-01-01T00:00:00Z'),
  postingDate: new Date('2026-01-31T00:00:00Z'), months: 1, method: 'straight_line',
};
assert.equal(calculateAssetDepreciation(asset), 100, 'January may only recognise one elapsed month');
assert.throws(() => calculateAssetDepreciation({ ...asset, months: 10 }), 'unearned future months are rejected');
assert.equal(calculateAssetDepreciation({ ...asset, accumulated: 100 }), 0, 'a repeat cannot front-load February');
assert.equal(calculateAssetDepreciation({ ...asset, months: 10, postingDate: new Date('2026-10-31T00:00:00Z') }), 1000);
assert.equal(calculateAssetDepreciation({ ...asset, method: 'declining_balance', months: 2,
  postingDate: new Date('2026-02-28T00:00:00Z') }), 432, 'two declining-balance months compound');
assert.equal(calculateAssetDepreciation({ ...asset, salvage: 0, method: 'declining_balance', accumulated: 1071.15,
  months: 1, postingDate: new Date('2026-10-31T00:00:00Z') }), 128.85, 'final month reaches the salvage floor');
assert.throws(() => calculateAssetDepreciation({ ...asset, purchaseDate: new Date('2026-11-01T00:00:00Z') }));

assert.deepEqual(calculateForexDifference(150, 10, 40), { revaluedLocal: 400, difference: 250 });
assert.deepEqual(calculateForexDifference(-150, -10, 40), { revaluedLocal: -400, difference: -250 });
assert.deepEqual(calculateForexDifference(150, 0, 40), { revaluedLocal: 0, difference: -150 });
assert.equal(forexOffsetCode(250), '7180');
assert.equal(forexOffsetCode(-250), '7280');
console.log('Accounting ledger hardening calculations passed');
