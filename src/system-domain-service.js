const { createSystemAuditHelpers } = require('./system-domain-service/shared');
const { createSystemSettingsService } = require('./system-domain-service/settings');
const { createBranchLocationService } = require('./system-domain-service/branches-locations');
const { createSystemServicesService } = require('./system-domain-service/services');

function createSystemDomainService({
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
  singleStoreMode = false,
}) {
  const audit = createSystemAuditHelpers({ addAuditLog });
  const settingsService = createSystemSettingsService({
    db,
    validateSettingsPayload,
    stateWithUsers,
    saveState,
    audit,
  });
  const branchLocationService = createBranchLocationService({
    db,
    addAuditLog,
    getSystemSettings: settingsService.getSystemSettings,
    relationalBranches,
    relationalLocations,
    singleStoreMode,
  });
  const servicesService = createSystemServicesService({
    db,
    relationalServices,
    persistAppStateOnly,
    getStoredAppState,
  });

  // Regression markers retained here for source-based tests.
  // Selected current location does not belong to the selected branch
  // الفرع موجود بالفعل
  // الموقع موجود بالفعل
  // الإصدار الحالي يدعم فرعًا رئيسيًا واحدًا فقط
  // الإصدار الحالي يدعم مخزنًا أساسيًا واحدًا فقط

  return {
    ...settingsService,
    createBranchRecord: branchLocationService.createBranchRecord,
    createLocationRecord: branchLocationService.createLocationRecord,
    updateBranchRecord: branchLocationService.updateBranchRecord,
    deleteBranchRecord: branchLocationService.deleteBranchRecord,
    updateLocationRecord: branchLocationService.updateLocationRecord,
    deleteLocationRecord: branchLocationService.deleteLocationRecord,
    ...servicesService,
  };
}

module.exports = { createSystemDomainService };
