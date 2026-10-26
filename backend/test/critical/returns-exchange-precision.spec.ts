import assert from 'node:assert/strict';
import { exchangeStoreCreditAmount, hasUnpaidExchangeBalance } from '../../src/modules/returns/engines/exchange-store-credit.engine';

assert.equal(exchangeStoreCreditAmount(0.001, 3), 0.001);
assert.equal(exchangeStoreCreditAmount(0.002, 3), 0.002);
assert.equal(exchangeStoreCreditAmount(1.234, 3), 1.234);
assert.equal(exchangeStoreCreditAmount(1.234, 2), 1.23);
assert.throws(() => exchangeStoreCreditAmount(-0.001, 3), /Invalid exchange credit/);
assert.throws(() => exchangeStoreCreditAmount(Number.NaN, 3), /Invalid exchange credit/);
console.log('POS exchange credit precision regressions passed');

assert.equal(hasUnpaidExchangeBalance(0.003,0.002,0,3),true,'one unpaid KWD fil must block exchange');
assert.equal(hasUnpaidExchangeBalance(0.003,0.003,0,3),false);
assert.equal(hasUnpaidExchangeBalance(1.01,1,0,2),true);
assert.equal(hasUnpaidExchangeBalance(1,1,0,2),false);
assert.throws(()=>hasUnpaidExchangeBalance(NaN,0,0,3),/Invalid exchange invoice/);
