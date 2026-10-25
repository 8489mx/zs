import assert from 'node:assert/strict';
import { currencyMoneyDigits, roundMoney } from '../../src/modules/accounting/engines/money-minor-units.engine';

// Stock-count inventory variance must use tenant-book precision.
const variance = 3;
const historicalUnitCost = 0.001;
assert.equal(roundMoney(variance * historicalUnitCost, currencyMoneyDigits('KWD')), 0.003);
assert.equal(roundMoney(variance * historicalUnitCost, currencyMoneyDigits('OMR')), 0.003);
assert.equal(roundMoney(variance * historicalUnitCost, currencyMoneyDigits('EGP')), 0);
assert.equal(roundMoney(1 * 0.025, currencyMoneyDigits('KWD')), 0.025);
console.log('Stock-count currency precision regressions passed');
