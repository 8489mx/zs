async function runTransactionalScenario(ctx, session) {
  const { assert, api, port, findByName, findById, sumAmounts } = ctx;
  const { adminCookie, cashierCookie } = session;
  const categoryRes = await api('POST', port, '/api/categories', adminCookie, { name: 'Integration Cat' });
  assert.equal(categoryRes.status, 201);
  const category = findByName(categoryRes.body.categories, 'Integration Cat');
  assert.ok(category);

  const supplierRes = await api('POST', port, '/api/suppliers', adminCookie, { name: 'Integration Supplier', phone: '01000000001' });
  assert.equal(supplierRes.status, 201);
  const supplier = findByName(supplierRes.body.suppliers, 'Integration Supplier');
  assert.ok(supplier);

  const customerRes = await api('POST', port, '/api/customers', adminCookie, { name: 'Integration Customer', phone: '01000000002', creditLimit: 100 });
  assert.equal(customerRes.status, 201);
  const customer = findByName(customerRes.body.customers, 'Integration Customer');
  assert.ok(customer);

  const productRes = await api('POST', port, '/api/products', adminCookie, {
    name: 'Integration Product',
    barcode: 'ITG-0001',
    categoryId: category.id,
    supplierId: supplier.id,
    costPrice: 10,
    retailPrice: 15,
    wholesalePrice: 14,
    stock: 5,
    minStock: 1,
    notes: 'integration',
    units: [{ name: 'قطعة', multiplier: 1, barcode: 'ITG-0001' }],
  });
  assert.equal(productRes.status, 201);
  const product = findByName(productRes.body.products, 'Integration Product');
  assert.ok(product);
  assert.equal(Number(product.stock), 5);

  const badPriceSale = await api('POST', port, '/api/sales', cashierCookie, {
    paymentType: 'cash',
    items: [{ productId: product.id, qty: 1, unitMultiplier: 1, unitName: 'قطعة', price: 99, priceType: 'retail' }],
  });
  assert.equal(badPriceSale.status, 400);
  assert.match(String(badPriceSale.body.error || ''), /Price edit is not allowed/i);

  const badDiscountSale = await api('POST', port, '/api/sales', cashierCookie, {
    paymentType: 'cash',
    discount: 1,
    items: [{ productId: product.id, qty: 1, unitMultiplier: 1, unitName: 'قطعة', price: 15, priceType: 'retail' }],
  });
  assert.equal(badDiscountSale.status, 400);
  assert.match(String(badDiscountSale.body.error || ''), /Discount change is not allowed/i);

  const blockedCashSale = await api('POST', port, '/api/sales', cashierCookie, {
    paymentType: 'cash',
    paymentChannel: 'cash',
    items: [{ productId: product.id, qty: 1, unitMultiplier: 1, unitName: 'قطعة', price: 15, priceType: 'retail' }],
  });
  assert.equal(blockedCashSale.status, 400);
  assert.match(String(blockedCashSale.body.error || ''), /Open cashier shift is required/i);

  const openShift = await api('POST', port, '/api/cashier-shifts/open', cashierCookie, {
    openingCash: 100,
    note: 'opening integration shift',
  });
  assert.equal(openShift.status, 201);

  const cashierCashSale = await api('POST', port, '/api/sales', cashierCookie, {
    paymentType: 'cash',
    paymentChannel: 'cash',
    paidAmount: 15,
    items: [{ productId: product.id, qty: 1, unitMultiplier: 1, unitName: 'قطعة', price: 15, priceType: 'retail' }],
  });
  assert.equal(cashierCashSale.status, 201);

  const purchase1 = await api('POST', port, '/api/purchases', adminCookie, {
    supplierId: supplier.id,
    paymentType: 'credit',
    discount: 0,
    items: [{ productId: product.id, qty: 4, cost: 11, unitMultiplier: 1, unitName: 'قطعة' }],
    note: 'credit purchase',
  });
  assert.equal(purchase1.status, 201);
  const purchase1Id = purchase1.body.purchase.id;

  let products = await api('GET', port, '/api/products', adminCookie);
  let suppliers = await api('GET', port, '/api/suppliers', adminCookie);
  assert.equal(Number(findById(products.body.products, product.id).stock), 8);
  assert.equal(Number(findById(suppliers.body.suppliers, supplier.id).balance), 44);

  const purchase1Update = await api('PUT', port, `/api/purchases/${purchase1Id}`, adminCookie, {
    supplierId: supplier.id,
    paymentType: 'credit',
    discount: 0,
    managerPin: '1234',
    items: [{ productId: product.id, qty: 5, cost: 12, unitMultiplier: 1, unitName: 'قطعة' }],
    note: 'credit purchase updated',
    editReason: 'مراجعة تكلفة فاتورة المورد',
  });
  assert.equal(purchase1Update.status, 200);

  products = await api('GET', port, '/api/products', adminCookie);
  suppliers = await api('GET', port, '/api/suppliers', adminCookie);
  assert.equal(Number(findById(products.body.products, product.id).stock), 9);
  assert.equal(Number(findById(suppliers.body.suppliers, supplier.id).balance), 60);

  const sale = await api('POST', port, '/api/sales', adminCookie, {
    customerId: customer.id,
    paymentType: 'credit',
    discount: 0,
    items: [{ productId: product.id, qty: 2, unitMultiplier: 1, unitName: 'قطعة', price: 15, priceType: 'retail' }],
    note: 'credit sale',
  });
  assert.equal(sale.status, 201);
  const saleId = sale.body.sale.id;

  products = await api('GET', port, '/api/products', adminCookie);
  let customers = await api('GET', port, '/api/customers', adminCookie);
  assert.equal(Number(findById(products.body.products, product.id).stock), 7);
  assert.equal(Number(findById(customers.body.customers, customer.id).balance), 30);

  const saleUpdate = await api('PUT', port, `/api/sales/${saleId}`, adminCookie, {
    customerId: customer.id,
    paymentType: 'credit',
    managerPin: '1234',
    discount: 0,
    items: [{ productId: product.id, qty: 1, unitMultiplier: 1, unitName: 'قطعة', price: 16, priceType: 'retail' }],
    note: 'credit sale updated',
    editReason: 'تصحيح بيانات الفاتورة بعد مراجعة العميل',
  });
  assert.equal(saleUpdate.status, 200);

  products = await api('GET', port, '/api/products', adminCookie);
  customers = await api('GET', port, '/api/customers', adminCookie);
  assert.equal(Number(findById(products.body.products, product.id).stock), 8);
  assert.equal(Number(findById(customers.body.customers, customer.id).balance), 16);

  const customerPayment = await api('POST', port, '/api/customer-payments', adminCookie, {
    customerId: customer.id,
    amount: 10,
    note: 'part payment',
  });
  assert.equal(customerPayment.status, 201);

  customers = await api('GET', port, '/api/customers', adminCookie);
  assert.equal(Number(findById(customers.body.customers, customer.id).balance), 6);

  const saleReturn = await api('POST', port, '/api/returns', adminCookie, {
    type: 'sale',
    invoiceId: saleId,
    productId: product.id,
    qty: 1,
    managerPin: '1234',
    note: 'return all remaining sold qty',
  });
  assert.equal(saleReturn.status, 201);

  products = await api('GET', port, '/api/products', adminCookie);
  customers = await api('GET', port, '/api/customers', adminCookie);
  assert.equal(Number(findById(products.body.products, product.id).stock), 9);
  assert.equal(Number(findById(customers.body.customers, customer.id).balance), 0);

  const supplierPayment = await api('POST', port, '/api/supplier-payments', adminCookie, {
    supplierId: supplier.id,
    amount: 20,
    note: 'partial supplier payment',
  });
  assert.equal(supplierPayment.status, 201);
  suppliers = await api('GET', port, '/api/suppliers', adminCookie);
  assert.equal(Number(findById(suppliers.body.suppliers, supplier.id).balance), 40);

  const expense = await api('POST', port, '/api/expenses', adminCookie, {
    title: 'Shipping',
    amount: 7,
    note: 'integration expense',
  });
  assert.equal(expense.status, 201);

  const purchase2 = await api('POST', port, '/api/purchases', adminCookie, {
    supplierId: supplier.id,
    paymentType: 'cash',
    discount: 0,
    items: [{ productId: product.id, qty: 2, cost: 9, unitMultiplier: 1, unitName: 'قطعة' }],
    note: 'cash purchase',
  });
  assert.equal(purchase2.status, 201);
  const purchase2Id = purchase2.body.purchase.id;

  products = await api('GET', port, '/api/products', adminCookie);
  assert.equal(Number(findById(products.body.products, product.id).stock), 11);

  const cancelPurchase2 = await api('POST', port, `/api/purchases/${purchase2Id}/cancel`, adminCookie, {
    managerPin: '1234',
    reason: 'integration cancel check',
  });
  assert.equal(cancelPurchase2.status, 200);

  products = await api('GET', port, '/api/products', adminCookie);
  assert.equal(Number(findById(products.body.products, product.id).stock), 9);

  const treasury = await api('GET', port, '/api/treasury-transactions', adminCookie);
  assert.equal(treasury.status, 200);
  assert.equal(sumAmounts(treasury.body.treasury), -12);

  const summary = await api('GET', port, '/api/reports/summary', adminCookie);
  assert.equal(summary.status, 200);
  assert.equal(Number(summary.body.sales.total), 31);
  assert.equal(Number(summary.body.purchases.total), 60);
  assert.equal(Number(summary.body.expenses.total), 7);
  assert.equal(Number(summary.body.treasury.net), -12);
  assert.ok(Array.isArray(summary.body.topProducts));
  assert.ok(summary.body.topProducts.some((item) => item.name === 'Integration Product'));

  const inventory = await api('GET', port, '/api/reports/inventory', adminCookie);
  assert.equal(inventory.status, 200);
  const inventoryProduct = findById(inventory.body.items, product.id);
  assert.ok(inventoryProduct);
  assert.equal(Number(inventoryProduct.stock), 9);

  const customerBalances = await api('GET', port, '/api/reports/customer-balances', adminCookie);
  assert.equal(customerBalances.status, 200);
  assert.equal((customerBalances.body.customers || []).some((item) => String(item.id) === String(customer.id)), false);

  const returnsRes = await api('GET', port, '/api/returns', adminCookie);
  assert.equal(returnsRes.status, 200);
  assert.equal((returnsRes.body.returns || []).length, 1);
  assert.equal(Number(returnsRes.body.returns[0].total), 16);

  const invalidShortReturn = await api('POST', port, '/api/returns', adminCookie, {
    type: 'sale',
    invoiceId: saleId,
    productId: product.id,
    qty: 1,
    managerPin: '1234',
    note: 'short',
  });
  assert.equal(invalidShortReturn.status, 400);

  const creditlessSale = await api('POST', port, '/api/sales', adminCookie, {
    paymentType: 'cash',
    items: [{ productId: product.id, qty: 1, unitMultiplier: 1, unitName: 'قطعة', price: 16, priceType: 'retail' }],
    note: 'walk-in sale',
  });
  assert.equal(creditlessSale.status, 201);

  const invalidCreditReturn = await api('POST', port, '/api/returns', adminCookie, {
    type: 'sale',
    invoiceId: creditlessSale.body.sale.id,
    productId: product.id,
    qty: 1,
    settlementMode: 'store_credit',
    managerPin: '1234',
    note: 'محاولة تحويل المرتجع إلى رصيد متجر بدون عميل',
  });
  assert.equal(invalidCreditReturn.status, 400);

  const invalidExchangeReturn = await api('POST', port, '/api/returns', adminCookie, {
    type: 'sale',
    invoiceId: saleId,
    productId: product.id,
    qty: 1,
    settlementMode: 'exchange',
    note: 'محاولة استبدال غير مدعومة في النسخة الحالية',
  });
  assert.equal(invalidExchangeReturn.status, 400);

  const invalidPurchaseSettlement = await api('POST', port, '/api/returns', adminCookie, {
    type: 'purchase',
    invoiceId: purchase1Id,
    productId: product.id,
    qty: 1,
    settlementMode: 'store_credit',
    managerPin: '1234',
    note: 'محاولة تحويل مرتجع شراء إلى رصيد متجر غير مدعوم',
  });
  assert.equal(invalidPurchaseSettlement.status, 400);

  const storeCreditCustomerRes = await api('POST', port, '/api/customers', adminCookie, {
    name: 'Store Credit Customer',
    phone: '01000000003',
    creditLimit: 100,
    storeCreditBalance: 20,
  });
  assert.equal(storeCreditCustomerRes.status, 201);
  const storeCreditCustomer = findByName(storeCreditCustomerRes.body.customers, 'Store Credit Customer');
  assert.ok(storeCreditCustomer);

  const treasuryBeforeStoreCreditSale = await api('GET', port, '/api/treasury-transactions', adminCookie);
  assert.equal(treasuryBeforeStoreCreditSale.status, 200);
  const treasuryBeforeStoreCreditTotal = sumAmounts(treasuryBeforeStoreCreditSale.body.treasury);

  const mixedTenderSale = await api('POST', port, '/api/sales', adminCookie, {
    customerId: storeCreditCustomer.id,
    paymentType: 'cash',
    paymentChannel: 'cash',
    paidAmount: 5,
    storeCreditUsed: 10,
    items: [{ productId: product.id, qty: 1, unitMultiplier: 1, unitName: 'قطعة', price: 15, priceType: 'retail' }],
    note: 'sale with store credit and cash',
  });
  assert.equal(mixedTenderSale.status, 201);

  const treasuryAfterStoreCreditSale = await api('GET', port, '/api/treasury-transactions', adminCookie);
  assert.equal(treasuryAfterStoreCreditSale.status, 200);
  assert.equal(sumAmounts(treasuryAfterStoreCreditSale.body.treasury), treasuryBeforeStoreCreditTotal + 5);

  const mixedTenderReturn = await api('POST', port, '/api/returns', adminCookie, {
    type: 'sale',
    invoiceId: mixedTenderSale.body.sale.id,
    productId: product.id,
    qty: 1,
    settlementMode: 'refund',
    refundMethod: 'cash',
    managerPin: '1234',
    note: 'رد كامل لبيع جمع بين الرصيد والنقد',
  });
  assert.equal(mixedTenderReturn.status, 201);

  customers = await api('GET', port, '/api/customers', adminCookie);
  assert.equal(Number(findById(customers.body.customers, storeCreditCustomer.id).storeCreditBalance), 20);

  const treasuryAfterMixedReturn = await api('GET', port, '/api/treasury-transactions', adminCookie);
  assert.equal(treasuryAfterMixedReturn.status, 200);
  assert.equal(sumAmounts(treasuryAfterMixedReturn.body.treasury), treasuryBeforeStoreCreditTotal);

  const treasuryBeforeCardSale = sumAmounts(treasuryAfterMixedReturn.body.treasury);
  const cardSale = await api('POST', port, '/api/sales', adminCookie, {
    paymentType: 'cash',
    paymentChannel: 'card',
    paidAmount: 16,
    items: [{ productId: product.id, qty: 1, unitMultiplier: 1, unitName: 'قطعة', price: 16, priceType: 'retail' }],
    note: 'card sale',
  });
  assert.equal(cardSale.status, 201);

  const treasuryAfterCardSale = await api('GET', port, '/api/treasury-transactions', adminCookie);
  assert.equal(treasuryAfterCardSale.status, 200);
  assert.equal(sumAmounts(treasuryAfterCardSale.body.treasury), treasuryBeforeCardSale);

  const missingApprovalReturn = await api('POST', port, '/api/returns', adminCookie, {
    type: 'sale',
    invoiceId: cardSale.body.sale.id,
    productId: product.id,
    qty: 1,
    settlementMode: 'refund',
    refundMethod: 'card',
    note: 'مرتجع بدون اعتماد مدير',
  });
  assert.equal(missingApprovalReturn.status, 400);

  const cardSaleReturn = await api('POST', port, '/api/returns', adminCookie, {
    type: 'sale',
    invoiceId: cardSale.body.sale.id,
    productId: product.id,
    qty: 1,
    settlementMode: 'refund',
    refundMethod: 'card',
    managerPin: '1234',
    note: 'مرتجع بيع بطاقة يعود إلى البطاقة',
  });
  assert.equal(cardSaleReturn.status, 201);

  const treasuryAfterCardReturn = await api('GET', port, '/api/treasury-transactions', adminCookie);
  assert.equal(treasuryAfterCardReturn.status, 200);
  assert.equal(sumAmounts(treasuryAfterCardReturn.body.treasury), treasuryBeforeCardSale);

  const cashPurchaseForCardRefund = await api('POST', port, '/api/purchases', adminCookie, {
    supplierId: supplier.id,
    paymentType: 'cash',
    discount: 0,
    items: [{ productId: product.id, qty: 1, cost: 9, unitMultiplier: 1, unitName: 'قطعة' }],
    note: 'cash purchase refunded to card',
  });
  assert.equal(cashPurchaseForCardRefund.status, 201);
  const cardRefundPurchaseId = cashPurchaseForCardRefund.body.purchase.id;

  const treasuryAfterCardRefundPurchase = await api('GET', port, '/api/treasury-transactions', adminCookie);
  assert.equal(treasuryAfterCardRefundPurchase.status, 200);
  const treasuryAfterCardRefundPurchaseTotal = sumAmounts(treasuryAfterCardRefundPurchase.body.treasury);
  assert.equal(treasuryAfterCardRefundPurchaseTotal, treasuryBeforeCardSale - 9);

  const purchaseCardRefund = await api('POST', port, '/api/returns', adminCookie, {
    type: 'purchase',
    invoiceId: cardRefundPurchaseId,
    productId: product.id,
    qty: 1,
    settlementMode: 'refund',
    refundMethod: 'card',
    managerPin: '1234',
    note: 'مرتجع شراء تم استرداده إلى البطاقة',
  });
  assert.equal(purchaseCardRefund.status, 201);

  const treasuryAfterPurchaseCardReturn = await api('GET', port, '/api/treasury-transactions', adminCookie);
  assert.equal(treasuryAfterPurchaseCardReturn.status, 200);
  assert.equal(sumAmounts(treasuryAfterPurchaseCardReturn.body.treasury), treasuryAfterCardRefundPurchaseTotal);

  const audit = await api('GET', port, '/api/audit-logs', adminCookie);
  assert.equal(audit.status, 200);
  assert.ok((audit.body.auditLogs || []).length >= 10);
  const sensitiveAudit = (audit.body.auditLogs || []).find((entry) => String(entry.action || '').includes('مرتجع بيع'));
  assert.ok(sensitiveAudit, 'sale return audit should exist');
  const sensitiveAuditDetails = JSON.parse(String(sensitiveAudit.details || '{}'));
  assert.equal(sensitiveAuditDetails.actorUserId, 1);
  assert.equal(sensitiveAuditDetails.after.returnType, 'sale');

  return {
    productId: product.id,
    customerId: customer.id,
    supplierId: supplier.id,
  };
}

module.exports = {
  runTransactionalScenario,
};
