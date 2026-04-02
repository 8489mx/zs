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

module.exports = { SYSTEM_ROUTE_PATHS, registerSystemRouteCatalog };
