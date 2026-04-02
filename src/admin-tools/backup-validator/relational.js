const { asArray, normalizeId, requireArrayOfObjects } = require('./utils');

const REQUIRED_RELATIONAL_TABLES = [
  'settings',
  'branches',
  'stock_locations',
  'stock_transfers',
  'stock_transfer_items',
  'product_categories',
  'suppliers',
  'customers',
  'products',
  'product_units',
  'product_offers',
  'product_customer_prices',
  'stock_movements',
  'sales',
  'sale_items',
  'treasury_transactions',
  'audit_logs',
  'customer_payments',
  'purchases',
  'purchase_items',
  'expenses',
  'supplier_payments',
  'returns',
  'customer_ledger',
  'supplier_ledger',
  'services',
];

function buildRelationalRefs(relationalTables) {
  const branchIds = new Set(asArray(relationalTables.branches).map((entry) => normalizeId(entry && entry.id)).filter(Boolean));
  const locationIds = new Set(asArray(relationalTables.stock_locations).map((entry) => normalizeId(entry && entry.id)).filter(Boolean));
  const customerIds = new Set(asArray(relationalTables.customers).map((entry) => normalizeId(entry && entry.id)).filter(Boolean));
  const supplierIds = new Set(asArray(relationalTables.suppliers).map((entry) => normalizeId(entry && entry.id)).filter(Boolean));
  const productIds = new Set(asArray(relationalTables.products).map((entry) => normalizeId(entry && entry.id)).filter(Boolean));
  const saleIds = new Set(asArray(relationalTables.sales).map((entry) => normalizeId(entry && entry.id)).filter(Boolean));
  const purchaseIds = new Set(asArray(relationalTables.purchases).map((entry) => normalizeId(entry && entry.id)).filter(Boolean));
  const transferIds = new Set(asArray(relationalTables.stock_transfers).map((entry) => normalizeId(entry && entry.id)).filter(Boolean));
  const saleStatusById = new Map(asArray(relationalTables.sales).map((entry) => [normalizeId(entry && entry.id), String((entry && entry.status) || 'posted')]));
  const purchaseStatusById = new Map(asArray(relationalTables.purchases).map((entry) => [normalizeId(entry && entry.id), String((entry && entry.status) || 'posted')]));

  return {
    branchIds,
    locationIds,
    customerIds,
    supplierIds,
    productIds,
    saleIds,
    purchaseIds,
    transferIds,
    saleStatusById,
    purchaseStatusById,
  };
}

function validateTableShapes(relationalTables, errors) {
  REQUIRED_RELATIONAL_TABLES.forEach((tableName) => {
    requireArrayOfObjects(relationalTables[tableName], `snapshot.tables.${tableName}`, errors, { required: true, max: 100000 });
  });
}

function validateReferences(relationalTables, refs, pushUniqueError, pushUniqueWarning) {
  const { branchIds, locationIds, customerIds, supplierIds, productIds, saleIds, purchaseIds, transferIds, saleStatusById, purchaseStatusById } = refs;

  const locationBranchIds = asArray(relationalTables.stock_locations).map((entry) => normalizeId(entry && (entry.branch_id || entry.branchId))).filter(Boolean);
  locationBranchIds.forEach((branchId) => {
    if (branchIds.size && !branchIds.has(branchId)) pushUniqueError('stock_locations reference a branch not present in snapshot.tables.branches');
  });

  for (const row of asArray(relationalTables.sale_items)) {
    const saleId = normalizeId(row.sale_id || row.saleId);
    const productId = normalizeId(row.product_id || row.productId);
    if (!saleId) pushUniqueError('sale_items must reference a valid sale_id');
    if (saleIds.size && saleId && !saleIds.has(saleId)) pushUniqueError('sale_items reference a sale not present in snapshot.tables.sales');
    if (!productId) pushUniqueError('sale_items must reference a valid product_id');
    if (productIds.size && productId && !productIds.has(productId)) pushUniqueError('sale_items reference a product not present in snapshot.tables.products');
    if (!(Number(row.qty || 0) > 0)) pushUniqueError('sale_items qty must be greater than zero');
  }

  for (const row of asArray(relationalTables.purchase_items)) {
    const purchaseId = normalizeId(row.purchase_id || row.purchaseId);
    const productId = normalizeId(row.product_id || row.productId);
    if (!purchaseId) pushUniqueError('purchase_items must reference a valid purchase_id');
    if (purchaseIds.size && purchaseId && !purchaseIds.has(purchaseId)) pushUniqueError('purchase_items reference a purchase not present in snapshot.tables.purchases');
    if (!productId) pushUniqueError('purchase_items must reference a valid product_id');
    if (productIds.size && productId && !productIds.has(productId)) pushUniqueError('purchase_items reference a product not present in snapshot.tables.products');
    if (!(Number(row.qty || 0) > 0)) pushUniqueError('purchase_items qty must be greater than zero');
  }

  for (const row of asArray(relationalTables.stock_transfers)) {
    const fromLocationId = normalizeId(row.from_location_id || row.fromLocationId);
    const toLocationId = normalizeId(row.to_location_id || row.toLocationId);
    if (!fromLocationId || !toLocationId) pushUniqueError('stock_transfers must reference valid source and destination locations');
    if (locationIds.size && fromLocationId && !locationIds.has(fromLocationId)) pushUniqueError('stock_transfers reference a source location not present in snapshot.tables.stock_locations');
    if (locationIds.size && toLocationId && !locationIds.has(toLocationId)) pushUniqueError('stock_transfers reference a destination location not present in snapshot.tables.stock_locations');
    if (fromLocationId && toLocationId && fromLocationId === toLocationId) pushUniqueError('stock_transfers source and destination locations must be different');
    if (!['sent', 'received', 'cancelled'].includes(String(row.status || 'sent'))) pushUniqueError('stock_transfers contain an invalid status');
  }

  for (const row of asArray(relationalTables.stock_transfer_items)) {
    const transferId = normalizeId(row.transfer_id || row.transferId);
    const productId = normalizeId(row.product_id || row.productId);
    if (!transferId) pushUniqueError('stock_transfer_items must reference a valid transfer_id');
    if (transferIds.size && transferId && !transferIds.has(transferId)) pushUniqueError('stock_transfer_items reference a transfer not present in snapshot.tables.stock_transfers');
    if (!productId) pushUniqueError('stock_transfer_items must reference a valid product_id');
    if (productIds.size && productId && !productIds.has(productId)) pushUniqueError('stock_transfer_items reference a product not present in snapshot.tables.products');
    if (!(Number(row.qty || 0) > 0)) pushUniqueError('stock_transfer_items qty must be greater than zero');
  }

  for (const row of asArray(relationalTables.customer_payments)) {
    const customerId = normalizeId(row.customer_id || row.customerId);
    if (!customerId) pushUniqueError('customer_payments must reference a valid customer_id');
    if (customerIds.size && customerId && !customerIds.has(customerId)) pushUniqueError('customer_payments reference a customer not present in snapshot.tables.customers');
    if (!(Number(row.amount || 0) > 0)) pushUniqueError('customer_payments amount must be greater than zero');
  }

  for (const row of asArray(relationalTables.supplier_payments)) {
    const supplierId = normalizeId(row.supplier_id || row.supplierId);
    if (!supplierId) pushUniqueError('supplier_payments must reference a valid supplier_id');
    if (supplierIds.size && supplierId && !supplierIds.has(supplierId)) pushUniqueError('supplier_payments reference a supplier not present in snapshot.tables.suppliers');
    if (!(Number(row.amount || 0) > 0)) pushUniqueError('supplier_payments amount must be greater than zero');
  }

  for (const row of asArray(relationalTables.customer_ledger)) {
    const customerId = normalizeId(row.customer_id || row.customerId);
    if (!customerId) pushUniqueError('customer_ledger entries must reference a valid customer_id');
    if (customerIds.size && customerId && !customerIds.has(customerId)) pushUniqueError('customer_ledger references a customer not present in snapshot.tables.customers');
  }

  for (const row of asArray(relationalTables.supplier_ledger)) {
    const supplierId = normalizeId(row.supplier_id || row.supplierId);
    if (!supplierId) pushUniqueError('supplier_ledger entries must reference a valid supplier_id');
    if (supplierIds.size && supplierId && !supplierIds.has(supplierId)) pushUniqueError('supplier_ledger references a supplier not present in snapshot.tables.suppliers');
  }

  for (const row of asArray(relationalTables.stock_movements)) {
    const productId = normalizeId(row.product_id || row.productId);
    if (!productId) pushUniqueError('stock_movements must reference a valid product_id');
    if (productIds.size && productId && !productIds.has(productId)) pushUniqueError('stock_movements reference a product not present in snapshot.tables.products');
  }

  for (const row of asArray(relationalTables.returns)) {
    const returnType = row.return_type || row.type;
    const productId = normalizeId(row.product_id || row.productId);
    const invoiceId = normalizeId(row.invoice_id || row.invoiceId);
    if (!productId) pushUniqueError('returns must reference a valid product');
    if (productIds.size && productId && !productIds.has(productId)) pushUniqueError('returns reference a product not present in snapshot.tables.products');
    if (!(Number(row.qty || 0) > 0)) pushUniqueError('returns qty must be greater than zero');
    if (!(Number(row.total || 0) >= 0)) pushUniqueError('returns total must not be negative');
    if (returnType === 'sale') {
      if (saleIds.size && invoiceId && !saleIds.has(invoiceId)) pushUniqueError('sale returns reference an invoice not present in snapshot.tables.sales');
    } else if (returnType === 'purchase') {
      if (purchaseIds.size && invoiceId && !purchaseIds.has(invoiceId)) pushUniqueError('purchase returns reference an invoice not present in snapshot.tables.purchases');
    } else {
      pushUniqueError('returns must declare type as sale or purchase');
    }
  }

  asArray(relationalTables.sales).forEach((sale) => {
    const saleId = normalizeId(sale.id);
    const customerId = normalizeId(sale.customer_id || sale.customerId);
    if (customerId && customerIds.size && !customerIds.has(customerId)) pushUniqueError('sales reference a customer not present in snapshot.tables.customers');
    if (!['draft', 'posted', 'cancelled'].includes(String(sale.status || 'posted'))) pushUniqueError('sales contain an invalid status');
    if (!(Number(sale.total || 0) >= 0)) pushUniqueError('sales total must not be negative');
    const itemsTotal = Number(asArray(relationalTables.sale_items).filter((item) => normalizeId(item.sale_id || item.saleId) === saleId).reduce((sum, item) => sum + Number(item.line_total || item.lineTotal || 0), 0).toFixed(2));
    const subtotal = Number(Number(sale.subtotal || itemsTotal).toFixed(2));
    const discount = Number(Number(sale.discount || 0).toFixed(2));
    const total = Number(Number(sale.total || 0).toFixed(2));
    if (Math.abs(subtotal - itemsTotal) > 0.01) pushUniqueError('sales subtotal does not match sale_items');
    if (Math.abs(total - Math.max(0, subtotal - discount)) > 0.01) pushUniqueError('sales total does not match subtotal minus discount');
  });

  asArray(relationalTables.purchases).forEach((purchase) => {
    const purchaseId = normalizeId(purchase.id);
    const supplierId = normalizeId(purchase.supplier_id || purchase.supplierId);
    if (supplierId && supplierIds.size && !supplierIds.has(supplierId)) pushUniqueError('purchases reference a supplier not present in snapshot.tables.suppliers');
    if (!['draft', 'posted', 'cancelled'].includes(String(purchase.status || 'posted'))) pushUniqueError('purchases contain an invalid status');
    if (!(Number(purchase.total || 0) >= 0)) pushUniqueError('purchases total must not be negative');
    const itemsTotal = Number(asArray(relationalTables.purchase_items).filter((item) => normalizeId(item.purchase_id || item.purchaseId) === purchaseId).reduce((sum, item) => sum + Number(item.line_total || item.lineTotal || 0), 0).toFixed(2));
    const subtotal = Number(Number(purchase.subtotal || itemsTotal).toFixed(2));
    const discount = Number(Number(purchase.discount || 0).toFixed(2));
    const total = Number(Number(purchase.total || 0).toFixed(2));
    if (Math.abs(subtotal - itemsTotal) > 0.01) pushUniqueError('purchases subtotal does not match purchase_items');
    if (Math.abs(total - Math.max(0, subtotal - discount)) > 0.01) pushUniqueError('purchases total does not match subtotal minus discount');
  });

  asArray(relationalTables.customer_payments).forEach((payment) => {
    const saleId = normalizeId(payment.sale_id || payment.saleId);
    if (saleId && saleIds.size && !saleIds.has(saleId)) pushUniqueError('customer_payments reference a sale not present in snapshot.tables.sales');
    if (saleId && saleStatusById.get(saleId) === 'cancelled') pushUniqueWarning('customer_payments include allocations against cancelled sales');
  });

  asArray(relationalTables.returns).forEach((entry) => {
    const invoiceId = normalizeId(entry.invoice_id || entry.invoiceId);
    if ((entry.return_type || entry.type) === 'sale' && invoiceId && saleStatusById.get(invoiceId) === 'cancelled') {
      pushUniqueWarning('sale returns reference cancelled sales');
    }
    if ((entry.return_type || entry.type) === 'purchase' && invoiceId && purchaseStatusById.get(invoiceId) === 'cancelled') {
      pushUniqueWarning('purchase returns reference cancelled purchases');
    }
  });
}

function validateRelationalSnapshot(relationalTables, errors, pushUniqueError, pushUniqueWarning) {
  validateTableShapes(relationalTables, errors);
  const refs = buildRelationalRefs(relationalTables);
  validateReferences(relationalTables, refs, pushUniqueError, pushUniqueWarning);
}

module.exports = { validateRelationalSnapshot };
