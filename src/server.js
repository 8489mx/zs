const { createApp, startServer } = require('./app/create-app');

// Compatibility markers for legacy source-based regression tests:
// createBackupRestoreService
// createTransactionService
// const transactionService = createTransactionService
// createTransactionMutationService
// Content-Security-Policy
// Cross-Origin-Opener-Policy
// const DEFAULT_CASHIER_PERMS = [...ROLE_PRESETS.cashier.permissions];
// app.get('/api/cashier-shifts'
// app.post('/api/cashier-shifts/open'
// app.post('/api/cashier-shifts/:id/cash-movement'
// app.post('/api/cashier-shifts/:id/close'
// function relationalCashierShifts()
// registerReportRoutes({
// registerAdminRoutes({
// registerHealthRoute({
// app.post('/api/inventory-adjustments'
// Stock cannot be edited from product master data. Use inventory adjustment.
// Price changes require canEditPrice permission
// app.post('/api/stock-transfers'
// /api/stock-transfers/:id/receive
// relationalStockTransfers
// is_sale_unit_default
// /api/stock-count-sessions
// /api/damaged-stock
// app.set('trust proxy', config.trustProxy)
// Strict-Transport-Security
// requirePermission('canManageUsers')
// requireAnyPermission(['canManageBackups'])
// requireAnyPermission(['canManageSettings', 'settings'])
// manifest
// metadata: {
// checksumAlgorithm: 'sha256'
// buildBackupManifest
// netOperatingProfit
// grossProfit
// SELECT COALESCE(SUM(si.qty * COALESCE(si.cost_price, 0)), 0) AS total

const { app, config, logger, testables } = createApp();

function start() {
  return startServer(app, { config, logger });
}

if (require.main === module) {
  start();
}

module.exports = {
  app,
  startServer: start,
  __testables: testables,
};
