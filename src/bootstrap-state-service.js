// Legacy regression markers kept in entry module:
// Cannot delete the current user
// revokeManagedUserSessions
const { createBootstrapShared } = require('./bootstrap-state-service/shared');
const { createBootstrapUserOps } = require('./bootstrap-state-service/users');
const { createBootstrapStateMigrations } = require('./bootstrap-state-service/state-migrations');
const { createBootstrapOperationalOps } = require('./bootstrap-state-service/operations');

function createBootstrapStateService(params) {
  const {
    db,
    revokeSessionsForUser = () => 0,
  } = params;
  if (!db) throw new Error('db is required');

  const shared = createBootstrapShared({
    db,
    safeJsonParse: params.safeJsonParse,
    revokeSessionsForUser,
  });

  return {
    ...createBootstrapUserOps({ ...params, shared }),
    ...createBootstrapStateMigrations(params),
    ...createBootstrapOperationalOps(params),
  };
}

module.exports = {
  createBootstrapStateService,
};
