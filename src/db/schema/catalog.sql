CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  balance REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  balance REAL NOT NULL DEFAULT 0,
  customer_type TEXT DEFAULT 'cash',
  credit_limit REAL NOT NULL DEFAULT 0,
  store_credit_balance REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  category_id INTEGER,
  supplier_id INTEGER,
  price REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  stock REAL NOT NULL DEFAULT 0,
  cost_price REAL NOT NULL DEFAULT 0,
  retail_price REAL NOT NULL DEFAULT 0,
  wholesale_price REAL NOT NULL DEFAULT 0,
  stock_qty REAL NOT NULL DEFAULT 0,
  min_stock_qty REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES product_categories(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS product_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  multiplier REAL NOT NULL DEFAULT 1,
  barcode TEXT UNIQUE,
  is_base_unit INTEGER NOT NULL DEFAULT 0,
  is_sale_unit_default INTEGER NOT NULL DEFAULT 0,
  is_purchase_unit_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('percent', 'fixed')),
  value REAL NOT NULL,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_customer_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  price REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, customer_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS stock_count_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_no TEXT,
  branch_id INTEGER,
  location_id INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  note TEXT DEFAULT '',
  counted_by INTEGER,
  approved_by INTEGER,
  posted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (location_id) REFERENCES stock_locations(id),
  FOREIGN KEY (counted_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_count_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  expected_qty REAL NOT NULL DEFAULT 0,
  counted_qty REAL NOT NULL DEFAULT 0,
  variance_qty REAL NOT NULL DEFAULT 0,
  reason TEXT DEFAULT '',
  note TEXT DEFAULT '',
  FOREIGN KEY (session_id) REFERENCES stock_count_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS damaged_stock_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  branch_id INTEGER,
  location_id INTEGER,
  qty REAL NOT NULL DEFAULT 0,
  reason TEXT DEFAULT 'damage',
  note TEXT DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (location_id) REFERENCES stock_locations(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  movement_type TEXT NOT NULL,
  qty REAL NOT NULL,
  before_qty REAL NOT NULL DEFAULT 0,
  after_qty REAL NOT NULL DEFAULT 0,
  reason TEXT,
  note TEXT,
  reference_type TEXT,
  reference_id INTEGER,
  branch_id INTEGER,
  location_id INTEGER,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
