const { RELATIONAL_BACKUP_TABLE_EXPORT_ORDER } = require('./constants');

function pruneBackupPayload(payload) {
  const clone = JSON.parse(JSON.stringify(payload || {}));
  if (clone.app_state && Array.isArray(clone.app_state.backupSnapshots)) {
    clone.app_state.backupSnapshots = clone.app_state.backupSnapshots.slice(0, 7);
  }
  return clone;
}

function selectBackupRows(db, tableName) {
  const orderBy = tableName === 'settings' ? 'key ASC' : 'id ASC';
  return db.prepare(`SELECT * FROM ${tableName} ORDER BY ${orderBy}`).all();
}

function insertBackupRows(db, tableName, rows) {
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

function buildBackupManifest(db, crypto, tables) {
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

module.exports = { pruneBackupPayload, selectBackupRows, insertBackupRows, buildBackupManifest };
