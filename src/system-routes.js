const { buildServicesListResponse, paginateRows, filterManagedUsersRows, summarizeManagedUsersRows } = require('./system-query-service');
const { createWithUserLookup, respondError } = require('./system-routes/common');
const { createImportOperations } = require('./system-routes/import-operations');
const { registerSessionRoutes } = require('./system-routes/register-session-routes');
const { registerUserRoutes } = require('./system-routes/register-user-routes');
const { registerSettingsRoutes } = require('./system-routes/register-settings-routes');
const { registerImportRoutes } = require('./system-routes/register-import-routes');
const { registerBackupRoutes } = require('./system-routes/register-backup-routes');

// pagination
// app.put('/api/users', authMiddleware, adminOnly, requirePermission('canManageUsers')
// app.get('/api/state', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) =>
const SYSTEM_ROUTE_PATHS = Object.freeze([
  '/api/auth/sessions',
  '/api/auth/sessions/:id',
  '/api/auth/sessions/revoke-others',
  '/api/auth/change-password',
  '/api/state',
  '/api/users',
  '/api/users/:id',
  '/api/users/:id/unlock',
  '/api/settings',
  '/api/branches',
  '/api/branches/:id',
  '/api/locations',
  '/api/locations/:id',
  '/api/services',
  '/api/services/:id',
  '/api/import/products',
  '/api/import/customers',
  '/api/import/suppliers',
  '/api/import/opening-stock',
  '/api/backup',
  '/api/backup/verify',
  '/api/backup/restore',
]);

function registerSystemRouteCatalog(app) {
  if (!app || (typeof app !== 'function' && typeof app !== 'object')) {
    throw new Error('Express app instance is required');
  }
  if (!app.locals) app.locals = {};
  app.locals.systemRouteCatalog = [...SYSTEM_ROUTE_PATHS];
  return app.locals.systemRouteCatalog;
}

function registerSystemRoutes(options) {
  const {
    app,
    authMiddleware,
    adminOnly,
    requirePermission,
    requireAnyPermission,
    setNoStore,
    listSessions,
    revokeSessionForUser,
    revokeOtherSessions,
    changePassword,
    validatePasswordChangePayload,
    sessionCookieOptions,
    stateWithUsers,
    saveState,
    allowLegacyStateWrite,
    defaultUsersState,
    createManagedUser,
    updateManagedUser,
    deleteManagedUser,
    unlockManagedUser,
    validateUsersPayload,
    syncUsers,
    getSettings,
    saveSettings,
    listBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    listLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    listServices,
    createService,
    updateService,
    deleteService,
    buildRelationalBackupPayload,
    backupDownloadRateLimit,
    backupVerifyRateLimit,
    verifyBackupPayload,
    restoreRateLimit,
    backupRestoreService,
    addAuditLog,
    addSecurityAudit,
    config,
    db,
    normalizeIncomingProduct,
    normalizeCustomer,
    normalizeSupplier,
    replaceProductRelations,
    relationalProducts,
    relationalCustomers,
    relationalSuppliers,
    relationalCategories,
    relationalStockMovements,
    persistRelationalState,
    backupSnapshotStore,
  } = options;

  if (!app) throw new Error('app is required');

  const withUserLookup = createWithUserLookup(defaultUsersState);
  const importOperations = createImportOperations({
    db,
    normalizeIncomingProduct,
    normalizeCustomer,
    normalizeSupplier,
    replaceProductRelations,
    relationalProducts,
    relationalCustomers,
    relationalSuppliers,
    relationalCategories,
    relationalStockMovements,
    persistRelationalState,
    addAuditLog,
  });

  registerSessionRoutes({
    app,
    authMiddleware,
    setNoStore,
    listSessions,
    revokeSessionForUser,
    revokeOtherSessions,
    changePassword,
    validatePasswordChangePayload,
    sessionCookieOptions,
    addAuditLog,
    respondError,
    config,
  });

  registerUserRoutes({
    app,
    authMiddleware,
    adminOnly,
    requirePermission,
    setNoStore,
    defaultUsersState,
    createManagedUser,
    updateManagedUser,
    deleteManagedUser,
    unlockManagedUser,
    validateUsersPayload,
    syncUsers,
    addSecurityAudit,
    withUserLookup,
    paginateRows,
    filterManagedUsersRows,
    summarizeManagedUsersRows,
    respondError,
  });

  registerSettingsRoutes({
    app,
    authMiddleware,
    adminOnly,
    requirePermission,
    requireAnyPermission,
    stateWithUsers,
    saveState,
    allowLegacyStateWrite,
    getSettings,
    saveSettings,
    listBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    listLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    listServices,
    createService,
    updateService,
    deleteService,
    buildServicesListResponse,
    respondError,
  });

  registerImportRoutes({
    app,
    authMiddleware,
    requireAnyPermission,
    getImportRows: importOperations.getImportRows,
    importProductsRows: importOperations.importProductsRows,
    importCustomersRows: importOperations.importCustomersRows,
    importSuppliersRows: importOperations.importSuppliersRows,
    importOpeningStockRows: importOperations.importOpeningStockRows,
    respondError,
  });

  registerBackupRoutes({
    app,
    authMiddleware,
    adminOnly,
    requirePermission,
    requireAnyPermission,
    backupSnapshotStore,
    buildRelationalBackupPayload,
    backupDownloadRateLimit,
    backupVerifyRateLimit,
    verifyBackupPayload,
    restoreRateLimit,
    backupRestoreService,
    respondError,
  });

  registerSystemRouteCatalog(app);
}

module.exports = {
  SYSTEM_ROUTE_PATHS,
  registerSystemRouteCatalog,
  registerSystemRoutes,
};
