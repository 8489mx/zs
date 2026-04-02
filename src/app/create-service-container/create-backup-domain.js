function createBackupDomain({
  createBackupRestoreService,
  db,
  config,
  adminTools,
  restoreUsersFromBackup,
  saveState,
  replaceOperationalBackupData,
  restoreServicesFromBackup,
  replaceLedgerBackupData,
  backfillLedgersIfNeeded,
  persistAppStateOnly,
  hydrateRelationalCollections,
  getStoredAppState,
  addAuditLog,
  stateWithUsers,
  restoreRelationalBackupData,
}) {
  return createBackupRestoreService({
    db,
    config,
    verifyBackupPayload: adminTools.verifyBackupPayload,
    buildMaintenanceReport: adminTools.buildMaintenanceReport,
    restoreUsersFromBackup,
    saveState,
    replaceOperationalBackupData,
    restoreServicesFromBackup,
    replaceLedgerBackupData,
    backfillLedgersIfNeeded,
    persistAppStateOnly,
    hydrateRelationalCollections,
    getStoredAppState,
    addAuditLog,
    stateWithUsers,
    restoreRelationalBackupData,
  });
}

module.exports = { createBackupDomain };
