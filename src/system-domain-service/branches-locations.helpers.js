const BRANCH_USAGE_CHECKS = [
  ['sales', 'branch_id'],
  ['purchases', 'branch_id'],
  ['customer_payments', 'branch_id'],
  ['supplier_payments', 'branch_id'],
  ['expenses', 'branch_id'],
  ['returns', 'branch_id'],
  ['stock_movements', 'branch_id'],
  ['cashier_shifts', 'branch_id'],
  ['treasury_transactions', 'branch_id'],
  ['stock_transfers', 'from_branch_id'],
  ['stock_transfers', 'to_branch_id'],
  ['stock_count_sessions', 'branch_id'],
  ['damaged_stock_records', 'branch_id'],
];

const LOCATION_USAGE_CHECKS = [
  ['sales', 'location_id'],
  ['purchases', 'location_id'],
  ['customer_payments', 'location_id'],
  ['supplier_payments', 'location_id'],
  ['expenses', 'location_id'],
  ['returns', 'location_id'],
  ['stock_movements', 'location_id'],
  ['cashier_shifts', 'location_id'],
  ['treasury_transactions', 'location_id'],
  ['stock_transfers', 'from_location_id'],
  ['stock_transfers', 'to_location_id'],
  ['stock_count_sessions', 'location_id'],
  ['damaged_stock_records', 'location_id'],
];

function createStatusError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalizeEntityName(payload, fieldName, label) {
  const value = String((payload || {})[fieldName] || '').trim();
  if (!value) {
    throw createStatusError(`${label} name is required`, 400);
  }
  return value;
}

function normalizeEntityCode(payload) {
  return String((payload || {}).code || '').trim().slice(0, 40);
}

function assertEntityUnused(db, id, usageChecks, message) {
  for (const [tableName, columnName] of usageChecks) {
    const count = db.prepare(`SELECT COUNT(1) AS count FROM ${tableName} WHERE ${columnName} = ?`).get(id).count || 0;
    if (count) {
      throw createStatusError(message, 400);
    }
  }
}

module.exports = {
  BRANCH_USAGE_CHECKS,
  LOCATION_USAGE_CHECKS,
  assertEntityUnused,
  createStatusError,
  normalizeEntityCode,
  normalizeEntityName,
};
