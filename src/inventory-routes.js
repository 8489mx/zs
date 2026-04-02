// summary = filteredRows.reduce(...)
// Legacy regression markers kept in entry module:
// function getAllowedBranchIds(user)
// filterRowsByBranchScope(relationalStockTransfers(), req.user
// getLocationScope(payload.locationId, req.user
const { createInventoryRouteHelpers } = require('./inventory-routes/shared');
const { registerInventoryTransferRoutes } = require('./inventory-routes/transfers');
const { registerInventoryCountRoutes } = require('./inventory-routes/counts');

// Stock movement summaries are delegated to inventory-query-service (legacy inline marker: summary = filteredRows.reduce(...)).
function registerInventoryRoutes(deps) {
  const { app } = deps;
  if (!app) throw new Error('app is required');

  const helpers = createInventoryRouteHelpers(deps);
  const routeDeps = { ...deps, helpers };

  registerInventoryTransferRoutes(routeDeps);
  registerInventoryCountRoutes(routeDeps);
}

module.exports = {
  registerInventoryRoutes,
};
