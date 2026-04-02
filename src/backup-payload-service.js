function createBackupPayloadService({ db, crypto, getStoredAppState, relationalPurchases, relationalExpenses, relationalSupplierPayments, relationalReturns, relationalServices }) {
  const RELATIONAL_BACKUP_TABLE_EXPORT_ORDER = [
    'settings',
    'branches',
    'stock_locations',
    'stock_transfers',
    'stock_transfer_items',
    'product_categories',
    'suppliers',
    'customers',
    'products',
    'product_units',
    'product_offers',
    'product_customer_prices',
    'sales',
    'sale_items',
    'purchases',
    'purchase_items',
    'customer_payments',
    'supplier_payments',
    'expenses',
    'returns',
    'customer_ledger',
    'supplier_ledger',
    'treasury_transactions',
    'cashier_shifts',
    'stock_count_sessions',
    'stock_count_items',
    'damaged_stock_records',
    'stock_movements',
    'services',
    'audit_logs'
  ];

  const RELATIONAL_BACKUP_TABLE_DELETE_ORDER = [
    'audit_logs',
    'services',
    'stock_movements',
    'damaged_stock_records',
    'stock_count_items',
    'stock_count_sessions',
    'cashier_shifts',
    'treasury_transactions',
    'supplier_ledger',
    'customer_ledger',
    'returns',
    'expenses',
    'supplier_payments',
    'customer_payments',
    'purchase_items',
    'purchases',
    'sale_items',
    'sales',
    'product_customer_prices',
    'product_offers',
    'product_units',
    'products',
    'customers',
    'suppliers',
    'product_categories',
    'stock_locations',
    'stock_transfer_items',
    'stock_transfers',
    'branches',
    'cashier_shifts',
    'settings'
  ];

  function pruneBackupPayload(payload) {
    const clone = JSON.parse(JSON.stringify(payload || {}));
    if (clone.app_state && Array.isArray(clone.app_state.backupSnapshots)) {
      clone.app_state.backupSnapshots = clone.app_state.backupSnapshots.slice(0, 7);
    }
    return clone;
  }

  function selectBackupRows(tableName) {
    const orderBy = tableName === 'settings' ? 'key ASC' : 'id ASC';
    return db.prepare(`SELECT * FROM ${tableName} ORDER BY ${orderBy}`).all();
  }

  function insertBackupRows(tableName, rows) {
    const entries = Array.isArray(rows) ? rows : [];
    for (const row of entries) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
      const columns = Object.keys(row);
      if (!columns.length) continue;
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      db.prepare(sql).run(...columns.map((column) => row[column]));
    }
  }

  function buildBackupManifest(tables) {
    const normalizedTables = tables && typeof tables === 'object' ? tables : {};
    const tableCounts = Object.fromEntries(RELATIONAL_BACKUP_TABLE_EXPORT_ORDER.map((tableName) => [tableName, Array.isArray(normalizedTables[tableName]) ? normalizedTables[tableName].length : 0]));
    const ledgerTotals = {
      customerLedgerAmount: Number((db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM customer_ledger').get() || {}).total || 0),
      supplierLedgerAmount: Number((db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM supplier_ledger').get() || {}).total || 0),
      treasuryNet: Number((db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM treasury_transactions').get() || {}).total || 0),
      stockOnHand: Number((db.prepare('SELECT COALESCE(SUM(stock_qty), 0) AS total FROM products WHERE is_active = 1').get() || {}).total || 0),
      postedSalesTotal: Number((db.prepare("SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE status = 'posted'").get() || {}).total || 0),
      postedPurchasesTotal: Number((db.prepare("SELECT COALESCE(SUM(total), 0) AS total FROM purchases WHERE status = 'posted'").get() || {}).total || 0),
      expensesTotal: Number((db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses').get() || {}).total || 0),
      returnsTotal: Number((db.prepare('SELECT COALESCE(SUM(total), 0) AS total FROM returns').get() || {}).total || 0)
    };
    const hashSource = JSON.stringify({ tableCounts, ledgerTotals, exportedAtSeed: new Date().toISOString().slice(0, 19) });
    const checksum = crypto.createHash('sha256').update(hashSource).digest('hex');
    return { generatedAt: new Date().toISOString(), tableCounts, ledgerTotals, checksum, checksumAlgorithm: 'sha256' };
  }

  function buildRelationalBackupPayload() {
    const tables = {};
    RELATIONAL_BACKUP_TABLE_EXPORT_ORDER.forEach((tableName) => {
      tables[tableName] = selectBackupRows(tableName);
    });
    const manifest = buildBackupManifest(tables);
    const payload = {
      formatVersion: 5,
      exportedAt: new Date().toISOString(),
      metadata: {
        exporter: 'z-systems-pos',
        restoreMode: 'relational_full',
        tableCounts: manifest.tableCounts,
        manifest
      },
      settings: tables.settings,
      users: db.prepare('SELECT id, username, role, is_active, created_at, permissions_json, display_name, branch_ids_json, default_branch_id FROM users ORDER BY id ASC').all(),
      app_state: getStoredAppState(),
      snapshot: {
        type: 'relational_full',
        tables
      },
      compatibility: {
        purchases: relationalPurchases(),
        expenses: relationalExpenses(),
        supplierPayments: relationalSupplierPayments(),
        returns: relationalReturns(),
        services: relationalServices(),
        customerLedger: db.prepare('SELECT * FROM customer_ledger ORDER BY id ASC').all(),
        supplierLedger: db.prepare('SELECT * FROM supplier_ledger ORDER BY id ASC').all()
      }
    };
    return pruneBackupPayload(payload);
  }

  function restoreRelationalBackupData(payload) {
    const tables = payload && payload.snapshot && payload.snapshot.tables && typeof payload.snapshot.tables === 'object' && !Array.isArray(payload.snapshot.tables)
      ? payload.snapshot.tables
      : null;
    if (!tables) throw new Error('Relational backup snapshot is missing');

    RELATIONAL_BACKUP_TABLE_DELETE_ORDER.forEach((tableName) => {
      db.prepare(`DELETE FROM ${tableName}`).run();
    });

    RELATIONAL_BACKUP_TABLE_EXPORT_ORDER.forEach((tableName) => {
      insertBackupRows(tableName, tables[tableName]);
    });
  }

  function restoreServicesFromBackup(services) {
    db.prepare('DELETE FROM services').run();
    for (const service of Array.isArray(services) ? services : []) {
      db.prepare('INSERT INTO services (name, amount, notes, service_date, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)')
        .run(
          String(service.name || ''),
          Number(service.amount || 0),
          String(service.notes || ''),
          service.date || new Date().toISOString(),
          service.createdAt || new Date().toISOString(),
          service.updatedAt || service.createdAt || new Date().toISOString(),
        );
    }
  }

  function replaceLedgerBackupData(payload) {
    db.prepare('DELETE FROM customer_ledger').run();
    db.prepare('DELETE FROM supplier_ledger').run();
    for (const entry of Array.isArray(payload.customerLedger) ? payload.customerLedger : []) {
      db.prepare('INSERT INTO customer_ledger (customer_id, entry_type, amount, balance_after, note, reference_type, reference_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          Number(entry.customer_id || entry.customerId || 0),
          String(entry.entry_type || entry.type || 'manual'),
          Number(entry.amount || 0),
          Number(entry.balance_after || entry.balanceAfter || 0),
          String(entry.note || ''),
          entry.reference_type || entry.referenceType || null,
          entry.reference_id || entry.referenceId || null,
          entry.created_by || null,
          entry.created_at || entry.date || new Date().toISOString(),
        );
    }
    for (const entry of Array.isArray(payload.supplierLedger) ? payload.supplierLedger : []) {
      db.prepare('INSERT INTO supplier_ledger (supplier_id, entry_type, amount, balance_after, note, reference_type, reference_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          Number(entry.supplier_id || entry.supplierId || 0),
          String(entry.entry_type || entry.type || 'manual'),
          Number(entry.amount || 0),
          Number(entry.balance_after || entry.balanceAfter || 0),
          String(entry.note || ''),
          entry.reference_type || entry.referenceType || null,
          entry.reference_id || entry.referenceId || null,
          entry.created_by || null,
          entry.created_at || entry.date || new Date().toISOString(),
        );
    }
  }

  return {
    buildRelationalBackupPayload,
    restoreRelationalBackupData,
    restoreServicesFromBackup,
    replaceLedgerBackupData,
  };
}

module.exports = { createBackupPayloadService };
