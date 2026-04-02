const { asArray, normalizeId } = require('./utils');

function validateLegacyAppState(payload, pushUniqueError) {
  const appState = payload.app_state || {};
  const sales = asArray(appState.sales);
  const purchases = asArray(payload.purchases);
  const products = asArray(appState.products);
  const customers = asArray(appState.customers);
  const suppliers = asArray(appState.suppliers);
  const returns = asArray(payload.returns);

  const productIds = new Set(products.map((entry) => normalizeId(entry && entry.id)).filter(Boolean));
  const saleIds = new Set(sales.map((entry) => normalizeId(entry && entry.id)).filter(Boolean));
  const purchaseIds = new Set(purchases.map((entry) => normalizeId(entry && entry.id)).filter(Boolean));
  const customerIds = new Set(customers.map((entry) => normalizeId(entry && entry.id)).filter(Boolean));
  const supplierIds = new Set(suppliers.map((entry) => normalizeId(entry && entry.id)).filter(Boolean));

  sales.forEach((sale) => {
    const customerId = normalizeId(sale.customerId || sale.customer_id);
    if (customerId && customerIds.size && !customerIds.has(customerId)) pushUniqueError('sales reference a customer not present in app_state.customers');
    (asArray(sale.items)).forEach((item) => {
      const productId = normalizeId(item.productId || item.product_id);
      if (!productId) pushUniqueError('sale items must reference a valid product');
      if (productIds.size && productId && !productIds.has(productId)) pushUniqueError('sale items reference a product not present in app_state.products');
      if (!(Number(item.qty || 0) > 0)) pushUniqueError('sale items qty must be greater than zero');
    });
  });

  purchases.forEach((purchase) => {
    const supplierId = normalizeId(purchase.supplierId || purchase.supplier_id);
    if (supplierId && supplierIds.size && !supplierIds.has(supplierId)) pushUniqueError('purchases reference a supplier not present in app_state.suppliers');
    (asArray(purchase.items)).forEach((item) => {
      const productId = normalizeId(item.productId || item.product_id);
      if (!productId) pushUniqueError('purchase items must reference a valid product');
      if (productIds.size && productId && !productIds.has(productId)) pushUniqueError('purchase items reference a product not present in app_state.products');
      if (!(Number(item.qty || 0) > 0)) pushUniqueError('purchase items qty must be greater than zero');
    });
  });

  returns.forEach((entry) => {
    const returnType = entry.return_type || entry.type;
    const productId = normalizeId(entry.product_id || entry.productId);
    const invoiceId = normalizeId(entry.invoice_id || entry.invoiceId);
    if (!productId) pushUniqueError('returns must reference a valid product');
    if (productIds.size && productId && !productIds.has(productId)) pushUniqueError('returns reference a product not present in app_state.products');
    if (!(Number(entry.qty || 0) > 0)) pushUniqueError('returns qty must be greater than zero');
    if (returnType === 'sale') {
      if (saleIds.size && invoiceId && !saleIds.has(invoiceId)) pushUniqueError('sale returns reference an invoice not present in app_state.sales');
    } else if (returnType === 'purchase') {
      if (purchaseIds.size && invoiceId && !purchaseIds.has(invoiceId)) pushUniqueError('purchase returns reference an invoice not present in purchases');
    } else {
      pushUniqueError('returns must declare type as sale or purchase');
    }
  });
}

module.exports = { validateLegacyAppState };
