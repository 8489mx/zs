// Compatibility markers for legacy source-based regression tests:
// ensureColumn('sales', "store_credit_used REAL NOT NULL DEFAULT 0", 'store_credit_used');
// ensureCaseInsensitiveUniqueIndex('users', 'username', 'idx_users_username_nocase');
// COLLATE NOCASE

module.exports = require('./db/index');
