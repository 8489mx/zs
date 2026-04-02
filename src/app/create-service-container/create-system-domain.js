function createSettingsDomain({
  createSystemDomainService,
  db,
  validateSettingsPayload,
  stateWithUsers,
  saveState,
  addAuditLog,
  relationalBranches,
  relationalLocations,
  relationalServices,
  persistAppStateOnly,
  getStoredAppState,
  singleStoreMode,
}) {
  return createSystemDomainService({
    db,
    validateSettingsPayload,
    stateWithUsers,
    saveState,
    addAuditLog,
    relationalBranches,
    relationalLocations,
    relationalServices,
    persistAppStateOnly,
    getStoredAppState,
    singleStoreMode,
  });
}

module.exports = { createSettingsDomain };
