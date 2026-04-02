const LEGACY_STATE_KEYS = ['settings', 'counters', 'productHistory'];

function createStateDomain({
  createStateStoreService,
  db,
  config,
  getSetting,
  defaultUsersState,
  reportSummary,
  relationalReadModels,
}) {
  return createStateStoreService({
    db,
    config,
    getSetting,
    legacyStateKeys: LEGACY_STATE_KEYS,
    defaultUsersState,
    reportSummary,
    relationalBranches: relationalReadModels.relationalBranches,
    relationalLocations: relationalReadModels.relationalLocations,
    relationalStockTransfers: relationalReadModels.relationalStockTransfers,
    relationalCashierShifts: relationalReadModels.relationalCashierShifts,
    relationalStockCountSessions: relationalReadModels.relationalStockCountSessions,
    relationalDamagedStockRecords: relationalReadModels.relationalDamagedStockRecords,
    relationalCategories: relationalReadModels.relationalCategories,
    relationalSuppliers: relationalReadModels.relationalSuppliers,
    relationalCustomers: relationalReadModels.relationalCustomers,
    relationalProducts: relationalReadModels.relationalProducts,
    relationalTreasury: relationalReadModels.relationalTreasury,
    relationalAuditLogs: relationalReadModels.relationalAuditLogs,
    relationalSales: relationalReadModels.relationalSales,
    relationalPurchases: relationalReadModels.relationalPurchases,
    relationalExpenses: relationalReadModels.relationalExpenses,
    relationalSupplierPayments: relationalReadModels.relationalSupplierPayments,
    relationalReturns: relationalReadModels.relationalReturns,
    relationalServices: relationalReadModels.relationalServices,
  });
}

module.exports = {
  LEGACY_STATE_KEYS,
  createStateDomain,
};
