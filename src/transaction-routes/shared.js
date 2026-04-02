const { fail } = require('../http/respond');

function createTransactionRouteHelpers({ db, addAuditLog }) {
  const respondBadRequest = (res, err, fallbackMessage) => {
    fail(res, err, fallbackMessage);
  };

  const safeAuditPayload = (value, fallback = {}) => {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  };

  const writeStructuredAudit = (action, user, meta) => {
    addAuditLog(action, JSON.stringify(safeAuditPayload({
      actorUserId: Number(user && user.id || 0),
      actorRole: String(user && user.role || ''),
      ...meta,
    }, meta || {})), user && user.id ? Number(user.id) : null);
  };

  const getActiveCashierShiftForUser = (userId) => {
    if (!userId) return null;
    return db.prepare(`SELECT * FROM cashier_shifts WHERE opened_by = ? AND status = 'open' ORDER BY id DESC LIMIT 1`).get(userId) || null;
  };

  return {
    respondBadRequest,
    writeStructuredAudit,
    getActiveCashierShiftForUser,
  };
}

module.exports = { createTransactionRouteHelpers };
