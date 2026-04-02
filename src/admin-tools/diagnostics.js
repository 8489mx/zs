const { config, pkg, safeCount, safeSum, getDbFileInfo } = require('./shared');

function buildDiagnostics() {
  const counts = {
    users: safeCount('users'),
    activeUsers: safeCount('users', 'WHERE is_active = 1'),
    sessions: safeCount('sessions'),
    products: safeCount('products'),
    activeProducts: safeCount('products', 'WHERE is_active = 1'),
    customers: safeCount('customers'),
    suppliers: safeCount('suppliers'),
    sales: safeCount('sales'),
    postedSales: safeCount('sales', "WHERE status = 'posted'"),
    cancelledSales: safeCount('sales', "WHERE status = 'cancelled'"),
    purchases: safeCount('purchases'),
    postedPurchases: safeCount('purchases', "WHERE status = 'posted'"),
    cancelledPurchases: safeCount('purchases', "WHERE status = 'cancelled'"),
    returns: safeCount('returns'),
    expenses: safeCount('expenses'),
    treasuryTransactions: safeCount('treasury_transactions'),
    auditLogs: safeCount('audit_logs'),
    stockMovements: safeCount('stock_movements')
  };
  return {
    ok: true,
    service: 'z-systems-pos',
    version: pkg.version,
    timestamp: new Date().toISOString(),
    database: getDbFileInfo(),
    counts,
    finance: {
      salesTotal: safeSum('sales', 'total', "WHERE status = 'posted'"),
      purchasesTotal: safeSum('purchases', 'total', "WHERE status = 'posted'"),
      expensesTotal: safeSum('expenses', 'amount'),
      treasuryNet: safeSum('treasury_transactions', 'amount')
    },
    security: {
      legacyStateWriteEnabled: config.allowLegacyStateWrite,
      requestLogging: config.requestLogging,
      sameOriginProtection: config.enforceSameOriginWrites,
      resetUsersEnabled: config.allowResetUsers,
      restoreUsersEnabled: config.allowRestoreUsers,
      sessionDays: config.sessionDays,
      maxFailedLoginAttempts: config.maxFailedLoginAttempts,
      loginLockMinutes: config.loginLockMinutes
    }
  };
}

module.exports = { buildDiagnostics };
