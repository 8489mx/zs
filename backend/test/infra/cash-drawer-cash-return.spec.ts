import { strict as assert } from 'node:assert';
import { buildShiftCashReturnItem } from '../../src/modules/cash-drawer/helpers/cash-drawer.helper';

const mixedTender = buildShiftCashReturnItem({ id: 12, doc_no: 'RT-12', cash_refund: 20,
  note: 'cash 20 + store credit 80' });
assert.equal(mixedTender?.amount, 20);
assert.equal(mixedTender?.kind, 'return');
assert.equal(mixedTender?.id, 'ret-12');
// Card-only and store-credit-only returns must not enter a cashier cash-out group.
assert.equal(buildShiftCashReturnItem({ id: 13, cash_refund: 0 }), null);
assert.equal(buildShiftCashReturnItem({ id: 14, cash_refund: -10 }), null);
