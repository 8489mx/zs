function createBackupRestoreService(deps) {
  const {
    db,
    config,
    verifyBackupPayload,
    buildMaintenanceReport,
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
    restoreRelationalBackupData
  } = deps;

  function isRelationalSnapshotPayload(payload) {
    return !!(payload && payload.snapshot && payload.snapshot.tables && typeof payload.snapshot.tables === 'object' && !Array.isArray(payload.snapshot.tables));
  }

  function restoreLegacyBackupPayload(payload) {
    if (Array.isArray(payload.users) && payload.users.length && payload.users.some((u) => u.password_hash && u.password_salt)) {
      if (!config.allowRestoreUsers) throw new Error('User restore is disabled');
      restoreUsersFromBackup(payload.users);
    }
    saveState(payload.app_state);
    if (Array.isArray(payload.purchases) || Array.isArray(payload.expenses) || Array.isArray(payload.supplierPayments) || Array.isArray(payload.returns)) {
      replaceOperationalBackupData({
        purchases: Array.isArray(payload.purchases) ? payload.purchases : [],
        expenses: Array.isArray(payload.expenses) ? payload.expenses : [],
        supplierPayments: Array.isArray(payload.supplierPayments) ? payload.supplierPayments : [],
        returns: Array.isArray(payload.returns) ? payload.returns : []
      });
    }
    if (Array.isArray(payload.services)) restoreServicesFromBackup(payload.services);
    if (Array.isArray(payload.customerLedger) || Array.isArray(payload.supplierLedger)) {
      replaceLedgerBackupData(payload);
    } else {
      backfillLedgersIfNeeded();
    }
    persistAppStateOnly(hydrateRelationalCollections(getStoredAppState()));
  }

  function restoreV5RelationalPayload(payload) {
    if (Array.isArray(payload.users) && payload.users.length && payload.users.some((u) => u.password_hash && u.password_salt)) {
      if (!config.allowRestoreUsers) throw new Error('User restore is disabled');
      restoreUsersFromBackup(payload.users);
    }
    restoreRelationalBackupData(payload);
    const appState = payload.app_state && typeof payload.app_state === 'object' && !Array.isArray(payload.app_state)
      ? payload.app_state
      : getStoredAppState();
    persistAppStateOnly(hydrateRelationalCollections(appState));
  }

  function validatePostRestoreState() {
    const maintenance = typeof buildMaintenanceReport === 'function' ? buildMaintenanceReport() : { summary: {} };
    const summary = maintenance.summary || {};
    const blockers = [];
    if (Number(summary.customerLedgerMismatches || 0) > 0) blockers.push('Post-restore validation failed: customer ledger mismatches detected');
    if (Number(summary.supplierLedgerMismatches || 0) > 0) blockers.push('Post-restore validation failed: supplier ledger mismatches detected');
    if (Number(summary.orphanSaleItems || 0) > 0) blockers.push('Post-restore validation failed: orphan sale items detected');
    if (Number(summary.orphanPurchaseItems || 0) > 0) blockers.push('Post-restore validation failed: orphan purchase items detected');
    if (Number(summary.negativeStockProducts || 0) > 0) blockers.push('Post-restore validation failed: negative stock detected');
    return { ok: blockers.length === 0, blockers, maintenance };
  }

  function restoreBackupPayload(payload, userId, options = {}) {
    const runRestore = () => {
      const verification = verifyBackupPayload(payload || {});
      if (!verification.ok) {
        throw new Error((verification.errors || [])[0] || 'Backup file is invalid');
      }
      if (options && options.dryRun) {
        return { dryRun: true, verification, postRestore: null };
      }
      if (isRelationalSnapshotPayload(payload)) {
        restoreV5RelationalPayload(payload || {});
      } else {
        restoreLegacyBackupPayload(payload || {});
      }
      const postRestore = validatePostRestoreState();
      if (!postRestore.ok) {
        throw new Error(postRestore.blockers[0] || 'Post-restore validation failed');
      }
      addAuditLog('استعادة نسخة احتياطية', 'تمت استعادة قاعدة النظام من ملف احتياطي', userId || null);
      return { dryRun: false, verification, postRestore, state: stateWithUsers() };
    };
    return db.transaction(runRestore)();
  }

  return { restoreBackupPayload };
}

module.exports = { createBackupRestoreService };
