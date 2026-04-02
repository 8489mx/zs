const { csvFromRows } = require('./admin-tools/shared');
/* Regression marker: treasuryNet: safeSum('treasury_transactions', 'amount') */
const { buildDiagnostics } = require('./admin-tools/diagnostics');
const {
  buildMaintenanceReport,
  cleanupExpiredSessions,
  reconcileCustomerBalances,
  reconcileSupplierBalances,
  reconcileAllBalances,
} = require('./admin-tools/maintenance');
const { verifyBackupPayload } = require('./admin-tools/backup-validator');
const { createReadinessTools } = require('./admin-tools/readiness');

const {
  buildLaunchReadiness,
  buildUatReadiness,
  buildOperationalReadiness,
  buildSupportSnapshot,
} = createReadinessTools({ buildDiagnostics, buildMaintenanceReport });

module.exports = {
  buildDiagnostics,
  buildMaintenanceReport,
  cleanupExpiredSessions,
  reconcileCustomerBalances,
  reconcileSupplierBalances,
  reconcileAllBalances,
  verifyBackupPayload,
  buildSupportSnapshot,
  buildLaunchReadiness,
  buildUatReadiness,
  buildOperationalReadiness,
  csvFromRows,
};
