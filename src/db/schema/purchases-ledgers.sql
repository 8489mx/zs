CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_no TEXT,
  supplier_id INTEGER,
  payment_type TEXT NOT NULL DEFAULT 'cash',
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  settlement_mode TEXT DEFAULT 'refund',
  refund_method TEXT DEFAULT '',
  exchange_sale_id INTEGER,
  note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'posted',
  branch_id INTEGER,
  location_id INTEGER,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  unit_cost REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0,
  unit_name TEXT DEFAULT 'قطعة',
  unit_multiplier REAL NOT NULL DEFAULT 1,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  expense_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note TEXT DEFAULT '',
  branch_id INTEGER,
  location_id INTEGER,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_no TEXT,
  supplier_id INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  branch_id INTEGER,
  location_id INTEGER,
  payment_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_no TEXT,
  return_type TEXT NOT NULL CHECK(return_type IN ('sale','purchase')),
  invoice_id INTEGER,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  settlement_mode TEXT DEFAULT 'refund',
  refund_method TEXT DEFAULT '',
  exchange_sale_id INTEGER,
  note TEXT DEFAULT '',
  branch_id INTEGER,
  location_id INTEGER,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS customer_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  entry_type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  balance_after REAL NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  reference_type TEXT,
  reference_id INTEGER,
  branch_id INTEGER,
  location_id INTEGER,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS supplier_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  entry_type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  balance_after REAL NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  reference_type TEXT,
  reference_id INTEGER,
  branch_id INTEGER,
  location_id INTEGER,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  service_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
); 
