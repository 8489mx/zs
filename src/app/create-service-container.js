const {
  crypto,
  db,
  config,
  adminTools,
  createAccountingGuards,
  createBackupSnapshotStore,
  createAccountingReportingService,
  createDomainNormalizers,
  createSystemDomainService,
  createRelationalReadModels,
  createBackupPayloadService,
  createDashboardOverviewService,
  createStateStoreService,
  createBootstrapStateService,
  createTransactionService,
  createTransactionMutationService,
  createPasswordRecord,
  normalizeText,
  validateSettingsPayload,
  ROLE_PRESETS,
  createBackupRestoreService,
  createUserManagementService,
} = require('./create-service-container/base-dependencies');
const { createBackupDomain } = require('./create-service-container/create-backup-domain');
const { buildContainerResponse } = require('./create-service-container/build-container-response');
const { createGetSetting } = require('./create-service-container/get-setting');
const { createSessionRevoker } = require('./create-service-container/session-revoker');
const { createStateDomain } = require('./create-service-container/create-state-domain');
const { createSettingsDomain } = require('./create-service-container/create-system-domain');
const { createTransactionDomain } = require('./create-service-container/create-transaction-domain');
const { createUserDomain } = require('./create-service-container/create-user-domain');
const { createDiagnostics } = require('./create-service-container/create-diagnostics');

function createServiceContainer({ userHasPermission }) {
  const sessionRevoker = createSessionRevoker();
  const getSetting = createGetSetting({ db });
  const { assertSaleMutationAllowed, assertPurchaseMutationAllowed } = createAccountingGuards({ db });
  const defaultAdminPermissions = [...ROLE_PRESETS.super_admin.permissions];
  const defaultOperatorPermissions = [...ROLE_PRESETS.owner.permissions];
  const defaultCashierPermissions = [...ROLE_PRESETS.cashier.permissions];

  const userManagementService = createUserDomain({
    createUserManagementService,
    db,
    config,
    createPasswordRecord,
    normalizeText,
    defaultAdminPermissions,
    defaultOperatorPermissions,
    defaultCashierPermissions,
    revokeSessionsForUser: sessionRevoker,
  });
  const { defaultUsersState, createManagedUser, updateManagedUser, deleteManagedUser, unlockManagedUser } = userManagementService;

  const relationalReadModels = createRelationalReadModels({ db });
  const {
    computeShiftExpectedCash,
    relationalPurchases,
    relationalExpenses,
    relationalSupplierPayments,
    relationalReturns,
    relationalServices,
    relationalSales,
    relationalCustomers,
    relationalProducts,
    relationalSuppliers,
  } = relationalReadModels;

  const accountingReportingService = createAccountingReportingService({ db, getSetting });
  const { reportSummary, addCustomerLedgerEntry, addSupplierLedgerEntry, backfillLedgersIfNeeded, addTreasuryTransaction } = accountingReportingService;

  const stateStoreService = createStateDomain({ createStateStoreService, db, config, getSetting, defaultUsersState, reportSummary, relationalReadModels });
  const {
    safeJsonParse,
    defaultState,
    mergeStateWithDefaults,
    sanitizeLegacyState,
    getStoredAppState,
    hydrateRelationalCollections,
    persistAppStateOnly,
    persistRelationalState,
    stateWithUsers,
    saveState,
    makeDocNo,
    addAuditLog,
    addSecurityAudit,
    resolveBranchLocationScope,
  } = stateStoreService;

  const backupSnapshotStore = createBackupSnapshotStore({ db, getStoredAppState, persistAppStateOnly });
  backupSnapshotStore.migrateLegacySnapshots();

  const dashboardOverviewService = createDashboardOverviewService({
    reportSummary,
    relationalProducts,
    relationalSales,
    relationalPurchases,
    relationalCustomers,
    relationalSuppliers,
  });

  const domainNormalizers = createDomainNormalizers({ db, getSetting });
  const { assertManagerPin, normalizeIncomingSale, normalizeIncomingPurchase } = domainNormalizers;

  const settingsDomain = createSettingsDomain({
    createSystemDomainService,
    db,
    validateSettingsPayload,
    stateWithUsers,
    saveState,
    addAuditLog,
    relationalBranches: relationalReadModels.relationalBranches,
    relationalLocations: relationalReadModels.relationalLocations,
    relationalServices,
    persistAppStateOnly,
    getStoredAppState,
    singleStoreMode: config.singleStoreMode,
  });

  const bootstrapStateService = createBootstrapStateService({
    db,
    config,
    createPasswordRecord,
    defaultAdminPermissions,
    defaultOperatorPermissions,
    defaultCashierPermissions,
    defaultUsersState,
    safeJsonParse,
    defaultState,
    mergeStateWithDefaults,
    sanitizeLegacyState,
    persistAppStateOnly,
    revokeSessionsForUser: sessionRevoker,
  });
  const {
    ensureDefaultUsers,
    migrateLegacyServicesToTable,
    restoreUsersFromBackup,
    syncUsers,
    replaceOperationalBackupData,
    backfillAdminPermissions,
    migrateLegacyOperationalData,
  } = bootstrapStateService;

  ensureDefaultUsers();
  migrateLegacyServicesToTable();
  backfillAdminPermissions();
  backfillLedgersIfNeeded();
  migrateLegacyOperationalData(getStoredAppState);

  const backupPayloadService = createBackupPayloadService({
    db,
    crypto,
    getStoredAppState,
    relationalPurchases,
    relationalExpenses,
    relationalSupplierPayments,
    relationalReturns,
    relationalServices,
  });
  const { buildRelationalBackupPayload, restoreRelationalBackupData, restoreServicesFromBackup, replaceLedgerBackupData } = backupPayloadService;

  const backupRestoreService = createBackupDomain({
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
  });

  const { transactionService, transactionMutationService } = createTransactionDomain({
    createTransactionService,
    createTransactionMutationService,
    db,
    userHasPermission,
    makeDocNo,
    addSupplierLedgerEntry,
    addCustomerLedgerEntry,
    addTreasuryTransaction,
    addAuditLog,
    persistAppStateOnly,
    hydrateRelationalCollections,
    getStoredAppState,
    relationalPurchases,
    relationalSales,
    resolveBranchLocationScope,
    relationalCustomers,
    relationalProducts,
    relationalSuppliers,
    relationalReturns,
    assertManagerPin,
    assertSaleMutationAllowed,
    assertPurchaseMutationAllowed,
    normalizeIncomingSale,
    normalizeIncomingPurchase,
  });

  return buildContainerResponse({
    db,
    config,
    reportSummary,
    buildRelationalBackupPayload,
    defaultUsersState,
    createManagedUser,
    updateManagedUser,
    deleteManagedUser,
    unlockManagedUser,
    syncUsers,
    diagnostics: createDiagnostics(adminTools),
    settingsDomain,
    relationalReadModels,
    accountingReportingService,
    stateStoreService,
    backupSnapshotStore,
    dashboardOverviewService,
    domainNormalizers,
    ensureDefaultUsers,
    backupPayloadService,
    backupRestoreService,
    transactionService,
    transactionMutationService,
    supporting: {
      addAuditLog,
      addSecurityAudit,
      makeDocNo,
      resolveBranchLocationScope,
      computeShiftExpectedCash,
      addTreasuryTransaction,
      assertManagerPin,
      getSetting,
      persistRelationalState,
    },
  });
}

module.exports = { createServiceContainer };
