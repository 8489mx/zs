CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT,
  payment_type TEXT NOT NULL DEFAULT 'cash',
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  branch_id INTEGER,
  location_id INTEGER,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);


CREATE TABLE IF NOT EXISTS sale_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  payment_channel TEXT NOT NULL DEFAULT 'cash',
  amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS held_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  payment_type TEXT NOT NULL DEFAULT 'cash',
  payment_channel TEXT NOT NULL DEFAULT 'cash',
  paid_amount REAL NOT NULL DEFAULT 0,
  cash_amount REAL NOT NULL DEFAULT 0,
  card_amount REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  search TEXT DEFAULT '',
  price_type TEXT NOT NULL DEFAULT 'retail',
  branch_id INTEGER,
  location_id INTEGER,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (location_id) REFERENCES stock_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS held_sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  held_sale_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  unit_name TEXT DEFAULT 'قطعة',
  unit_multiplier REAL NOT NULL DEFAULT 1,
  price_type TEXT DEFAULT 'retail',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (held_sale_id) REFERENCES held_sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS treasury_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  txn_type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  reference_type TEXT,
  reference_id INTEGER,
  branch_id INTEGER,
  location_id INTEGER,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);


CREATE TABLE IF NOT EXISTS cashier_shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_no TEXT,
  branch_id INTEGER,
  location_id INTEGER,
  opened_by INTEGER NOT NULL,
  opening_cash REAL NOT NULL DEFAULT 0,
  opening_note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  expected_cash REAL NOT NULL DEFAULT 0,
  counted_cash REAL,
  variance REAL,
  close_note TEXT DEFAULT '',
  closed_by INTEGER,
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (location_id) REFERENCES stock_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (opened_by) REFERENCES users(id),
  FOREIGN KEY (closed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS customer_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  branch_id INTEGER,
  location_id INTEGER,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
