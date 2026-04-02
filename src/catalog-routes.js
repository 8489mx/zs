// pagination: paged.pagination
// Supplier has financial history and cannot be deleted
// Product has transaction history and cannot be deleted
// Product already exists
// Barcode already exists
// Customer has financial history and cannot be deleted
// Legacy regression markers kept in entry module:
// Supplier already exists
// Customer already exists
// req.query.view || 'all'
// req.query.filter || 'all'
const { createCatalogRouteHelpers } = require('./catalog-routes/shared');
const { registerCategoryRoutes } = require('./catalog-routes/categories');
const { registerSupplierRoutes } = require('./catalog-routes/suppliers');
const { registerCustomerRoutes } = require('./catalog-routes/customers');
const { registerProductRoutes } = require('./catalog-routes/products');

function registerCatalogRoutes(deps) {
  const { app, db } = deps;
  if (!app) throw new Error('app is required');
  if (!db) throw new Error('db is required');

  const helpers = createCatalogRouteHelpers(deps);
  const routeDeps = { ...deps, helpers };

  registerCategoryRoutes(routeDeps);
  registerSupplierRoutes(routeDeps);
  registerCustomerRoutes(routeDeps);
  registerProductRoutes(routeDeps);
}

module.exports = {
  registerCatalogRoutes,
};
