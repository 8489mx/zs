CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('super_admin','admin','cashier')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER,
  name TEXT NOT NULL,
  code TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, name),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stock_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_no TEXT,
  from_location_id INTEGER NOT NULL,
  to_location_id INTEGER NOT NULL,
  from_branch_id INTEGER,
  to_branch_id INTEGER,
  status TEXT NOT NULL DEFAULT 'sent',
  note TEXT DEFAULT '',
  created_by INTEGER,
  received_by INTEGER,
  cancelled_by INTEGER,
  received_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_location_id) REFERENCES stock_locations(id),
  FOREIGN KEY (to_location_id) REFERENCES stock_locations(id),
  FOREIGN KEY (from_branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (to_branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (received_by) REFERENCES users(id),
  FOREIGN KEY (cancelled_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transfer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
