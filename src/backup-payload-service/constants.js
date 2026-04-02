const RELATIONAL_BACKUP_TABLE_EXPORT_ORDER = [
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
  'sales',
  'sale_items',
  'purchases',
  'purchase_items',
  'customer_payments',
  'supplier_payments',
  'expenses',
  'returns',
  'customer_ledger',
  'supplier_ledger',
  'treasury_transactions',
  'cashier_shifts',
  'stock_count_sessions',
  'stock_count_items',
  'damaged_stock_records',
  'stock_movements',
  'services',
  'audit_logs'
];

const RELATIONAL_BACKUP_TABLE_DELETE_ORDER = [
  'audit_logs', 'services', 'stock_movements', 'damaged_stock_records', 'stock_count_items', 'stock_count_sessions',
  'cashier_shifts', 'treasury_transactions', 'supplier_ledger', 'customer_ledger', 'returns', 'expenses',
  'supplier_payments', 'customer_payments', 'purchase_items', 'purchases', 'sale_items', 'sales',
  'product_customer_prices', 'product_offers', 'product_units', 'products', 'customers', 'suppliers',
  'product_categories', 'stock_locations', 'stock_transfer_items', 'stock_transfers', 'branches', 'cashier_shifts', 'settings'
];

module.exports = { RELATIONAL_BACKUP_TABLE_EXPORT_ORDER, RELATIONAL_BACKUP_TABLE_DELETE_ORDER };
