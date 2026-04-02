const { buildServicesListResponse, paginateRows, filterManagedUsersRows, summarizeManagedUsersRows } = require('../system-query-service');
const { respondError } = require('./common');
const { registerSessionRoutes } = require('./register-session-routes');
const { registerUserRoutes } = require('./register-user-routes');
const { registerSettingsRoutes } = require('./register-settings-routes');
const { registerImportRoutes } = require('./register-import-routes');
const { registerBackupRoutes } = require('./register-backup-routes');

function registerSystemRouteGroups(options) {
  const { importOperations, withUserLookup } = options.contexts;

  registerSessionRoutes({
    app: options.app,
    authMiddleware: options.authMiddleware,
    setNoStore: options.setNoStore,
    listSessions: options.listSessions,
    revokeSessionForUser: options.revokeSessionForUser,
    revokeOtherSessions: options.revokeOtherSessions,
    changePassword: options.changePassword,
    validatePasswordChangePayload: options.validatePasswordChangePayload,
    sessionCookieOptions: options.sessionCookieOptions,
    addAuditLog: options.addAuditLog,
    respondError,
    config: options.config,
  });

  registerUserRoutes({
    app: options.app,
    authMiddleware: options.authMiddleware,
    adminOnly: options.adminOnly,
    requirePermission: options.requirePermission,
    setNoStore: options.setNoStore,
    defaultUsersState: options.defaultUsersState,
    createManagedUser: options.createManagedUser,
    updateManagedUser: options.updateManagedUser,
    deleteManagedUser: options.deleteManagedUser,
    unlockManagedUser: options.unlockManagedUser,
    validateUsersPayload: options.validateUsersPayload,
    syncUsers: options.syncUsers,
    addSecurityAudit: options.addSecurityAudit,
    withUserLookup,
    paginateRows,
    filterManagedUsersRows,
    summarizeManagedUsersRows,
    respondError,
  });

  registerSettingsRoutes({
    app: options.app,
    authMiddleware: options.authMiddleware,
    adminOnly: options.adminOnly,
    requirePermission: options.requirePermission,
    requireAnyPermission: options.requireAnyPermission,
    stateWithUsers: options.stateWithUsers,
    saveState: options.saveState,
    allowLegacyStateWrite: options.allowLegacyStateWrite,
    getSettings: options.getSettings,
    saveSettings: options.saveSettings,
    listBranches: options.listBranches,
    createBranch: options.createBranch,
    updateBranch: options.updateBranch,
    deleteBranch: options.deleteBranch,
    listLocations: options.listLocations,
    createLocation: options.createLocation,
    updateLocation: options.updateLocation,
    deleteLocation: options.deleteLocation,
    listServices: options.listServices,
    createService: options.createService,
    updateService: options.updateService,
    deleteService: options.deleteService,
    buildServicesListResponse,
    respondError,
  });

  registerImportRoutes({
    app: options.app,
    authMiddleware: options.authMiddleware,
    requireAnyPermission: options.requireAnyPermission,
    getImportRows: importOperations.getImportRows,
    importProductsRows: importOperations.importProductsRows,
    importCustomersRows: importOperations.importCustomersRows,
    importSuppliersRows: importOperations.importSuppliersRows,
    importOpeningStockRows: importOperations.importOpeningStockRows,
    respondError,
  });

  registerBackupRoutes({
    app: options.app,
    authMiddleware: options.authMiddleware,
    adminOnly: options.adminOnly,
    requirePermission: options.requirePermission,
    requireAnyPermission: options.requireAnyPermission,
    backupSnapshotStore: options.backupSnapshotStore,
    buildRelationalBackupPayload: options.buildRelationalBackupPayload,
    backupDownloadRateLimit: options.backupDownloadRateLimit,
    backupVerifyRateLimit: options.backupVerifyRateLimit,
    verifyBackupPayload: options.verifyBackupPayload,
    restoreRateLimit: options.restoreRateLimit,
    backupRestoreService: options.backupRestoreService,
    respondError,
  });
}

module.exports = { registerSystemRouteGroups };
