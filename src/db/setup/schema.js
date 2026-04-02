const schemaSql = require('../schema-sql');
const indexesSql = require('../indexes-sql');

function hasColumn(db, table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((item) => item.name === column);
}

function ensureColumn(db, table, columnDef, columnName) {
  if (!hasColumn(db, table, columnName)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
  }
}

function ensureCaseInsensitiveUniqueIndex(db, table, column, indexName) {
  const duplicateRow = db.prepare(`
    SELECT lower(${column}) AS normalized_value, COUNT(*) AS total
    FROM ${table}
    GROUP BY lower(${column})
    HAVING COUNT(*) > 1
    LIMIT 1
  `).get();
  if (duplicateRow) {
    throw new Error(`Cannot create ${indexName}: duplicate ${column} values differ only by letter case`);
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ${indexName} ON ${table}(${column} COLLATE NOCASE)`);
}

function ensureUsersRoleSchema(db) {
  const createRow = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  const createSql = String((createRow || {}).sql || '').toLowerCase();
  if (!createSql || createSql.includes("'super_admin'")) return;
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users__migrated (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin','admin','cashier')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      permissions_json TEXT NOT NULL DEFAULT '[]',
      branch_ids_json TEXT NOT NULL DEFAULT '[]',
      default_branch_id INTEGER,
      display_name TEXT DEFAULT '',
      failed_login_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_login_at TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 0
    );
  `);
  db.exec(`
    INSERT INTO users__migrated (
      id, username, password_hash, password_salt, role, is_active, created_at, permissions_json, branch_ids_json, default_branch_id, display_name, failed_login_count, locked_until, last_login_at, must_change_password
    )
    SELECT
      id,
      username,
      password_hash,
      password_salt,
      CASE WHEN role = 'admin' THEN 'admin' ELSE 'cashier' END,
      is_active,
      created_at,
      COALESCE(permissions_json, '[]'),
      COALESCE(branch_ids_json, '[]'),
      default_branch_id,
      COALESCE(display_name, ''),
      COALESCE(failed_login_count, 0),
      locked_until,
      last_login_at,
      COALESCE(must_change_password, 0)
    FROM users;
  `);
  db.exec('DROP TABLE users');
  db.exec('ALTER TABLE users__migrated RENAME TO users');
  db.exec('PRAGMA foreign_keys = ON');
}

function applyBaseSchema(db) {
  db.exec(schemaSql);
  const columns = [
    ['users', "permissions_json TEXT NOT NULL DEFAULT '[]'", 'permissions_json'],
    ['users', "branch_ids_json TEXT NOT NULL DEFAULT '[]'", 'branch_ids_json'],
    ['users', 'default_branch_id INTEGER', 'default_branch_id'],
    ['users', "display_name TEXT DEFAULT ''", 'display_name'],
    ['customers', 'store_credit_balance REAL NOT NULL DEFAULT 0', 'store_credit_balance'],
    ['customers', "company_name TEXT DEFAULT ''", 'company_name'],
    ['customers', "tax_number TEXT DEFAULT ''", 'tax_number'],
    ['returns', "settlement_mode TEXT DEFAULT 'refund'", 'settlement_mode'],
    ['returns', "refund_method TEXT DEFAULT ''", 'refund_method'],
    ['returns', 'exchange_sale_id INTEGER', 'exchange_sale_id'],
    ['users', 'failed_login_count INTEGER NOT NULL DEFAULT 0', 'failed_login_count'],
    ['users', 'locked_until TEXT', 'locked_until'],
    ['users', 'last_login_at TEXT', 'last_login_at'],
    ['users', 'must_change_password INTEGER NOT NULL DEFAULT 0', 'must_change_password'],
    ['sessions', 'last_seen_at TEXT', 'last_seen_at'],
    ['sessions', "ip_address TEXT DEFAULT ''", 'ip_address'],
    ['sessions', "user_agent TEXT DEFAULT ''", 'user_agent'],
    ['sales', 'customer_id INTEGER', 'customer_id'],
    ['sales', "status TEXT NOT NULL DEFAULT 'posted'", 'status'],
    ['sales', "note TEXT DEFAULT ''", 'note'],
    ['sales', 'doc_no TEXT', 'doc_no'],
    ['sales', "payment_channel TEXT DEFAULT 'cash'", 'payment_channel'],
    ['sales', 'paid_amount REAL NOT NULL DEFAULT 0', 'paid_amount'],
    ['sales', 'store_credit_used REAL NOT NULL DEFAULT 0', 'store_credit_used'],
    ['sales', 'updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP', 'updated_at'],
    ['sales', 'tax_rate REAL NOT NULL DEFAULT 0', 'tax_rate'],
    ['sales', 'tax_amount REAL NOT NULL DEFAULT 0', 'tax_amount'],
    ['sales', 'prices_include_tax INTEGER NOT NULL DEFAULT 0', 'prices_include_tax'],
    ['sales', 'branch_id INTEGER', 'branch_id'],
    ['sales', 'location_id INTEGER', 'location_id'],
    ['purchases', 'branch_id INTEGER', 'branch_id'],
    ['purchases', 'location_id INTEGER', 'location_id'],
    ['customer_payments', 'branch_id INTEGER', 'branch_id'],
    ['customer_payments', 'location_id INTEGER', 'location_id'],
    ['supplier_payments', 'branch_id INTEGER', 'branch_id'],
    ['supplier_payments', 'location_id INTEGER', 'location_id'],
    ['expenses', 'branch_id INTEGER', 'branch_id'],
    ['expenses', 'location_id INTEGER', 'location_id'],
    ['treasury_transactions', 'branch_id INTEGER', 'branch_id'],
    ['treasury_transactions', 'location_id INTEGER', 'location_id'],
    ['returns', 'branch_id INTEGER', 'branch_id'],
    ['returns', 'location_id INTEGER', 'location_id'],
    ['stock_movements', 'branch_id INTEGER', 'branch_id'],
    ['stock_movements', 'location_id INTEGER', 'location_id'],
    ['purchases', 'tax_rate REAL NOT NULL DEFAULT 0', 'tax_rate'],
    ['purchases', 'tax_amount REAL NOT NULL DEFAULT 0', 'tax_amount'],
    ['purchases', 'prices_include_tax INTEGER NOT NULL DEFAULT 0', 'prices_include_tax'],
    ['product_units', 'is_sale_unit_default INTEGER NOT NULL DEFAULT 0', 'is_sale_unit_default'],
    ['product_units', 'is_purchase_unit_default INTEGER NOT NULL DEFAULT 0', 'is_purchase_unit_default'],
    ['sale_items', "unit_name TEXT DEFAULT 'قطعة'", 'unit_name'],
    ['sale_items', 'unit_multiplier REAL NOT NULL DEFAULT 1', 'unit_multiplier'],
    ['sale_items', 'cost_price REAL NOT NULL DEFAULT 0', 'cost_price'],
    ['sale_items', "price_type TEXT DEFAULT 'retail'", 'price_type'],
    ['held_sales', 'paid_amount REAL NOT NULL DEFAULT 0', 'paid_amount'],
    ['held_sales', 'cash_amount REAL NOT NULL DEFAULT 0', 'cash_amount'],
    ['held_sales', 'card_amount REAL NOT NULL DEFAULT 0', 'card_amount'],
    ['held_sales', "search TEXT DEFAULT ''", 'search'],
    ['held_sales', "price_type TEXT DEFAULT 'retail'", 'price_type'],
    ['sales', 'cancelled_at TEXT', 'cancelled_at'],
    ['sales', 'cancelled_by INTEGER', 'cancelled_by'],
    ['sales', "cancel_reason TEXT DEFAULT ''", 'cancel_reason'],
    ['purchases', 'cancelled_at TEXT', 'cancelled_at'],
    ['purchases', 'cancelled_by INTEGER', 'cancelled_by'],
    ['purchases', "cancel_reason TEXT DEFAULT ''", 'cancel_reason'],
  ];
  columns.forEach(([table, columnDef, columnName]) => ensureColumn(db, table, columnDef, columnName));
  ensureUsersRoleSchema(db);
  db.exec(indexesSql);
  ensureCaseInsensitiveUniqueIndex(db, 'users', 'username', 'idx_users_username_nocase');
}

module.exports = { applyBaseSchema };
