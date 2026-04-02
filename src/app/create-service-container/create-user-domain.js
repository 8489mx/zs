function createUserDomain({
  createUserManagementService,
  db,
  config,
  createPasswordRecord,
  normalizeText,
  defaultAdminPermissions,
  defaultOperatorPermissions,
  defaultCashierPermissions,
  revokeSessionsForUser,
}) {
  return createUserManagementService({
    db,
    config,
    createPasswordRecord,
    normalizeText,
    defaultAdminPermissions,
    defaultOperatorPermissions,
    defaultCashierPermissions,
    revokeSessionsForUser,
  });
}

module.exports = { createUserDomain };
