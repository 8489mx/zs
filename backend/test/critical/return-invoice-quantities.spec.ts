import { strict as assert } from 'node:assert';
import { buildInvoiceReturnedQuantities } from '../../src/modules/returns/helpers/return-invoice-quantities.helper';

const sale = buildInvoiceReturnedQuantities('sale', [
  { product_id: 7, sale_item_id: 11, returned_qty: 1 },
  { product_id: 7, sale_item_id: 11, returned_qty: 2 },
  { product_id: 7, sale_item_id: 12, returned_qty: 1 },
  { product_id: 8, sale_item_id: null, returned_qty: 1 },
]);
assert.equal(sale.returnedQtyByLine['11'], 3);
assert.equal(sale.returnedQtyByLine['12'], 1);
assert.deepEqual(sale.blockedProductIds, ['8']);
const purchase = buildInvoiceReturnedQuantities('purchase', [
  { product_id: 7, purchase_item_id: 18, returned_qty: '0.250' },
]);
assert.equal(purchase.returnedQtyByLine['18'], 0.25);
