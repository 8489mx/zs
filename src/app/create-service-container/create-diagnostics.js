function createDiagnostics(adminTools) {
  return {
    buildDiagnostics: adminTools.buildDiagnostics,
    buildMaintenanceReport: adminTools.buildMaintenanceReport,
    cleanupExpiredSessions: adminTools.cleanupExpiredSessions,
    reconcileCustomerBalances: adminTools.reconcileCustomerBalances,
    reconcileSupplierBalances: adminTools.reconcileSupplierBalances,
    reconcileAllBalances: adminTools.reconcileAllBalances,
    verifyBackupPayload: adminTools.verifyBackupPayload,
    buildSupportSnapshot: adminTools.buildSupportSnapshot,
    buildLaunchReadiness: adminTools.buildLaunchReadiness,
    buildUatReadiness: adminTools.buildUatReadiness,
    buildOperationalReadiness: adminTools.buildOperationalReadiness,
    csvFromRows: adminTools.csvFromRows,
  };
}

module.exports = { createDiagnostics };
