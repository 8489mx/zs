const db = require('../../db');

function createSessionRevoker() {
  return (userId, keepSessionId = null) => {
    if (keepSessionId) {
      return db.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?').run(Number(userId), keepSessionId).changes;
    }
    return db.prepare('DELETE FROM sessions WHERE user_id = ?').run(Number(userId)).changes;
  };
}

module.exports = {
  createSessionRevoker,
};
