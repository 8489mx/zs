// filterCashierShiftRows
// summarizeCashierShiftRows
// summary: summarizeSalesRows(filteredRows)
// summary: summarizePurchaseRows(filteredRows)
// Legacy regression markers kept in entry module:
// app.get('/api/sales', authMiddleware, requireAnyPermission(['sales', 'reports']), (req, res) =>
// app.get('/api/sales/:id', authMiddleware, requireAnyPermission(['sales', 'reports']), (req, res) =>
// app.get('/api/purchases', authMiddleware, requirePermission('purchases'), (req, res) =>
const { createTransactionRouteHelpers } = require('./transaction-routes/shared');
const { registerSalesRoutes } = require('./transaction-routes/sales');
const { registerPurchaseRoutes } = require('./transaction-routes/purchases');
const { registerCashierRoutes } = require('./transaction-routes/cashier');
const { registerOtherTransactionRoutes } = require('./transaction-routes/other');

// Cash drawer pagination uses filterCashierShiftRows + summarizeCashierShiftRows inside transaction-query-service.
// Delegated sales/purchases pagination keeps the legacy summary contract: summary: summarizeSalesRows(filteredRows) / summary: summarizePurchaseRows(filteredRows).
function registerTransactionRoutes(deps) {
  const { app, db } = deps;
  if (!app) throw new Error('app is required');
  if (!db) throw new Error('db is required');

  const helpers = createTransactionRouteHelpers(deps);
  const routeDeps = { ...deps, helpers };

  registerSalesRoutes(routeDeps);
  registerPurchaseRoutes(routeDeps);
  registerCashierRoutes(routeDeps);
  registerOtherTransactionRoutes(routeDeps);
}

module.exports = {
  registerTransactionRoutes,
};
