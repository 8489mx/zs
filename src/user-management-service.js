const { createUserManagementNormalization } = require('./user-management-service/normalization');
const { createUserManagementMutations } = require('./user-management-service/mutations');

// Legacy regression markers kept in the entry module:
// revokeManagedUserSessions(existing.id, keepSessionId);
// يوجد فرع غير موجود أو غير نشط ضمن صلاحيات المستخدم

function createUserManagementService({
  db,
  config,
  createPasswordRecord,
  normalizeText,
  defaultAdminPermissions,
  defaultOperatorPermissions,
  defaultCashierPermissions,
  revokeSessionsForUser,
}) {
  if (!db) throw new Error('db is required');
  if (!config) throw new Error('config is required');
  if (typeof createPasswordRecord !== 'function') throw new Error('createPasswordRecord is required');
  if (typeof normalizeText !== 'function') throw new Error('normalizeText is required');
  if (typeof revokeSessionsForUser !== 'function') throw new Error('revokeSessionsForUser is required');

  const normalization = createUserManagementNormalization({
    db,
    config,
    normalizeText,
    defaultAdminPermissions,
    defaultOperatorPermissions,
    defaultCashierPermissions,
  });

  return createUserManagementMutations({
    db,
    createPasswordRecord,
    revokeSessionsForUser,
    defaultAdminPermissions,
    normalization,
  });
}

module.exports = {
  createUserManagementService,
};
