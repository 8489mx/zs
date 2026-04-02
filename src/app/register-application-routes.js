const { registerAuthRoutes } = require('../auth-routes');
const { registerSystemRoutes } = require('../system-routes');
const { registerCatalogRoutes } = require('../catalog-routes');
const { registerInventoryRoutes } = require('../inventory-routes');
const { registerTransactionRoutes } = require('../transaction-routes');
const { registerReportRoutes } = require('../report-routes');
const { registerAdminRoutes } = require('../admin-routes');
const { registerHealthRoute } = require('../admin-routes');
const { validateUsersPayload, validatePasswordChangePayload, parseDateRange } = require('../validation');
const {
  authMiddleware,
  adminOnly,
  superAdminOnly,
  login,
  createSession,
  destroySession,
  listSessions,
  revokeSessionForUser,
  revokeOtherSessions,
  changePassword,
} = require('../auth');
const {
  buildAuthRouteContext,
  buildSystemRouteContext,
  buildCatalogRouteContext,
  buildInventoryRouteContext,
  buildTransactionRouteContext,
  buildReportRouteContext,
  buildAdminRouteContext,
  buildHealthRouteContext,
} = require('./register-application-routes/contexts');

function registerApplicationRoutes({ runtime, services }) {
  const hydratedServices = {
    ...services,
    authMiddleware,
    adminOnly,
    superAdminOnly,
    login,
    createSession,
    destroySession,
    listSessions,
    revokeSessionForUser,
    revokeOtherSessions,
    changePassword,
    validateUsersPayload,
    validatePasswordChangePayload,
    parseDateRange,
  };

  registerAuthRoutes(buildAuthRouteContext(runtime, hydratedServices));
  registerSystemRoutes(buildSystemRouteContext(runtime, hydratedServices));
  registerCatalogRoutes(buildCatalogRouteContext(runtime, hydratedServices));
  registerInventoryRoutes(buildInventoryRouteContext(runtime, hydratedServices));
  registerTransactionRoutes(buildTransactionRouteContext(runtime, hydratedServices));
  registerReportRoutes(buildReportRouteContext(runtime, hydratedServices));
  registerAdminRoutes(buildAdminRouteContext(runtime, hydratedServices));
  registerHealthRoute(buildHealthRouteContext(runtime, hydratedServices));
}

module.exports = {
  registerApplicationRoutes,
};
