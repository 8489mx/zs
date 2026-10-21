import { strict as assert } from 'node:assert';
import { validateForexClosingRate } from '../../src/modules/accounting/services/forex-revaluation.service';

assert.equal(validateForexClosingRate(30.5), 30.5);
for (const value of [0, -1, NaN, Infinity, -Infinity, 'NaN', 'Infinity', '30.5', null, undefined, {}, []]) {
  assert.throws(() => validateForexClosingRate(value), 'Invalid closing rate must be rejected: ' + String(value));
}
console.log('FX rate integrity regressions passed');
