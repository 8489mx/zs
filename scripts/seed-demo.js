#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

function parseArgs(argv) {
  const result = {
    fresh: false,
    force: false,
    quiet: false,
    dbFile: process.env.DB_FILE || '',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--fresh') result.fresh = true;
    else if (arg === '--force') result.force = true;
    else if (arg === '--quiet') result.quiet = true;
    else if (arg === '--db-file') result.dbFile = argv[index + 1] || result.dbFile;
    else if (arg.startsWith('--db-file=')) result.dbFile = arg.split('=')[1] || result.dbFile;
  }
  return result;
}

const options = parseArgs(process.argv.slice(2));
const resolvedDbFile = options.dbFile
  ? (path.isAbsolute(options.dbFile) ? options.dbFile : path.join(projectRoot, options.dbFile))
  : path.join(projectRoot, 'data', 'zstore.db');
process.env.DB_FILE = resolvedDbFile;

function log(message) {
  if (!options.quiet) console.log(message);
}

function removeDatabaseFiles(dbFile) {
  for (const suffix of ['', '-wal', '-shm']) {
    const target = `${dbFile}${suffix}`;
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }
}

if (options.fresh) {
  fs.mkdirSync(path.dirname(resolvedDbFile), { recursive: true });
  removeDatabaseFiles(resolvedDbFile);
}

const db = require('../src/db');
const config = require('../src/config');
const { createPasswordRecord, normalizeText } = require('../src/security');
const { createUserManagementService } = require('../src/user-management-service');
const { createRelationalReadModels } = require('../src/relational-read-models');
const { createAccountingReportingService } = require('../src/accounting-reporting-service');
const { createStateStoreService } = require('../src/state-store-service');
const { createTransactionService } = require('../src/transaction-service');

const DEFAULT_ADMIN_PERMS = [
  'dashboard','products','sales','purchases','inventory','suppliers','customers','accounts','returns','reports','audit','treasury','services','settings','canEditUsers','canManageUsers','canManageSettings','canManageBackups','canPrint','canDiscount','canEditPrice','canViewProfit','canDelete','canEditInvoices','canAdjustInventory','cashDrawer'
];
const DEFAULT_CASHIER_PERMS = ['dashboard','sales','customers','audit','services','cashDrawer'];
const BRANCH_MANAGER_PERMS = ['dashboard','products','sales','purchases','inventory','suppliers','customers','accounts','returns','reports','audit','treasury','services','canPrint','canDiscount','canEditPrice','canViewProfit','canEditInvoices','canAdjustInventory','cashDrawer'];
const LEGACY_STATE_KEYS = ['settings','backupSnapshots','counters','productHistory'];

function userHasPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

const {
  defaultUsersState,
  createManagedUser,
} = createUserManagementService({
  db,
  config,
  createPasswordRecord,
  normalizeText,
  defaultAdminPermissions: DEFAULT_ADMIN_PERMS,
  defaultCashierPermissions: DEFAULT_CASHIER_PERMS,
  revokeSessionsForUser: () => 0,
});

const readModels = createRelationalReadModels({ db });

const accounting = createAccountingReportingService({ db, getSetting });

const appState = createStateStoreService({
  db,
  config,
  getSetting,
  legacyStateKeys: LEGACY_STATE_KEYS,
  defaultUsersState,
  reportSummary: accounting.reportSummary,
  relationalBranches: readModels.relationalBranches,
  relationalLocations: readModels.relationalLocations,
  relationalStockTransfers: readModels.relationalStockTransfers,
  relationalCashierShifts: readModels.relationalCashierShifts,
  relationalStockCountSessions: readModels.relationalStockCountSessions,
  relationalDamagedStockRecords: readModels.relationalDamagedStockRecords,
  relationalCategories: readModels.relationalCategories,
  relationalSuppliers: readModels.relationalSuppliers,
  relationalCustomers: readModels.relationalCustomers,
  relationalProducts: readModels.relationalProducts,
  relationalTreasury: readModels.relationalTreasury,
  relationalAuditLogs: readModels.relationalAuditLogs,
  relationalSales: readModels.relationalSales,
  relationalPurchases: readModels.relationalPurchases,
  relationalExpenses: readModels.relationalExpenses,
  relationalSupplierPayments: readModels.relationalSupplierPayments,
  relationalReturns: readModels.relationalReturns,
  relationalServices: readModels.relationalServices,
});

const transactions = createTransactionService({
  db,
  userHasPermission,
  makeDocNo: appState.makeDocNo,
  addSupplierLedgerEntry: accounting.addSupplierLedgerEntry,
  addCustomerLedgerEntry: accounting.addCustomerLedgerEntry,
  addTreasuryTransaction: accounting.addTreasuryTransaction,
  addAuditLog: appState.addAuditLog,
  persistAppStateOnly: appState.persistAppStateOnly,
  hydrateRelationalCollections: appState.hydrateRelationalCollections,
  getStoredAppState: appState.getStoredAppState,
  relationalPurchases: readModels.relationalPurchases,
  relationalSales: readModels.relationalSales,
  resolveBranchLocationScope: appState.resolveBranchLocationScope,
});

function tableCount(table) {
  return Number((db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() || {}).total || 0);
}

const occupiedTables = ['users', 'branches', 'stock_locations', 'product_categories', 'suppliers', 'customers', 'products', 'sales', 'purchases'];
const alreadySeeded = occupiedTables.some((table) => tableCount(table) > 0);
if (alreadySeeded && !options.force) {
  console.error('Seed aborted: database already contains operational data. Re-run with --force or use npm run reset:demo.');
  db.close();
  process.exit(1);
}

function insertAndGetId(sql, ...params) {
  const result = db.prepare(sql).run(...params);
  return Number(result.lastInsertRowid || 0);
}

function upsertSetting(key, value) {
  appState.upsertSetting(key, value);
}

function createBranch(name, code) {
  return insertAndGetId('INSERT INTO branches (name, code, is_active) VALUES (?, ?, 1)', name, code);
}

function createLocation(branchId, name, code) {
  return insertAndGetId('INSERT INTO stock_locations (branch_id, name, code, is_active) VALUES (?, ?, ?, 1)', branchId, name, code);
}

function createCategory(name) {
  return insertAndGetId('INSERT INTO product_categories (name, is_active) VALUES (?, 1)', name);
}

function createSupplierRecord(payload) {
  return insertAndGetId('INSERT INTO suppliers (name, phone, address, notes, is_active) VALUES (?, ?, ?, ?, 1)', payload.name, payload.phone || '', payload.address || '', payload.notes || '');
}

function createCustomerRecord(payload) {
  return insertAndGetId('INSERT INTO customers (name, phone, address, customer_type, credit_limit, store_credit_balance, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)', payload.name, payload.phone || '', payload.address || '', payload.customerType || 'cash', Number(payload.creditLimit || 0), Number(payload.storeCreditBalance || 0));
}

function createProductRecord(payload) {
  const productId = insertAndGetId(
    `INSERT INTO products (name, barcode, category_id, supplier_id, price, cost, stock, cost_price, retail_price, wholesale_price, stock_qty, min_stock_qty, notes, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?, 1)`,
    payload.name,
    payload.barcode,
    payload.categoryId,
    payload.supplierId,
    Number(payload.retailPrice || 0),
    Number(payload.costPrice || 0),
    Number(payload.costPrice || 0),
    Number(payload.retailPrice || 0),
    Number(payload.wholesalePrice || payload.retailPrice || 0),
    Number(payload.minStock || 0),
    payload.notes || ''
  );
  const units = Array.isArray(payload.units) && payload.units.length
    ? payload.units
    : [{ name: 'قطعة', multiplier: 1, barcode: payload.barcode, isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }];
  for (const unit of units) {
    db.prepare(`INSERT INTO product_units (product_id, name, multiplier, barcode, is_base_unit, is_sale_unit_default, is_purchase_unit_default)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(productId, unit.name, Number(unit.multiplier || 1), unit.barcode || '', unit.isBaseUnit ? 1 : 0, unit.isSaleUnit ? 1 : 0, unit.isPurchaseUnit ? 1 : 0);
  }
  for (const offer of payload.offers || []) {
    db.prepare('INSERT INTO product_offers (product_id, offer_type, value, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run(productId, offer.type, Number(offer.value || 0), offer.from || '', offer.to || '');
  }
  for (const price of payload.customerPrices || []) {
    db.prepare('INSERT INTO product_customer_prices (product_id, customer_id, price) VALUES (?, ?, ?)')
      .run(productId, Number(price.customerId), Number(price.price || 0));
  }
  return productId;
}

function createServiceRecord(name, amount, notes, actorId) {
  db.prepare('INSERT INTO services (name, amount, notes, service_date, created_by, is_active) VALUES (?, ?, ?, ?, ?, 1)')
    .run(name, Number(amount || 0), notes || '', new Date().toISOString(), actorId);
}

function createCashierShiftHistory({ openedBy, branchId, locationId, openingCash, cashIn, cashOut, countedCash, note }) {
  const openedAt = new Date(Date.now() - (36 * 60 * 60 * 1000)).toISOString();
  const closedAt = new Date(Date.now() - (35 * 60 * 60 * 1000)).toISOString();
  const shiftId = insertAndGetId(
    `INSERT INTO cashier_shifts (doc_no, branch_id, location_id, opened_by, opening_cash, opening_note, status, expected_cash, counted_cash, variance, close_note, closed_by, closed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'closed', ?, ?, ?, ?, ?, ?, ?, ?)`,
    null,
    branchId,
    locationId,
    openedBy,
    Number(openingCash || 0),
    note || 'وردية ديمو مغلقة',
    Number(openingCash || 0) + Number(cashIn || 0) - Number(cashOut || 0),
    Number(countedCash || 0),
    Number((Number(countedCash || 0) - (Number(openingCash || 0) + Number(cashIn || 0) - Number(cashOut || 0))).toFixed(2)),
    'إغلاق ديمو',
    openedBy,
    closedAt,
    openedAt,
    closedAt,
  );
  const docNo = appState.makeDocNo('SHIFT', shiftId);
  db.prepare('UPDATE cashier_shifts SET doc_no = ? WHERE id = ?').run(docNo, shiftId);
  db.prepare('INSERT INTO treasury_transactions (txn_type, amount, note, reference_type, reference_id, branch_id, location_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('cash_in', Number(cashIn || 0), `وردية ${docNo}: إيداع افتتاحي`, 'cashier_shift', shiftId, branchId, locationId, openedBy, new Date(Date.now() - 35.75 * 60 * 60 * 1000).toISOString());
  db.prepare('INSERT INTO treasury_transactions (txn_type, amount, note, reference_type, reference_id, branch_id, location_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('cash_out', -Math.abs(Number(cashOut || 0)), `وردية ${docNo}: صرف نثريات`, 'cashier_shift', shiftId, branchId, locationId, openedBy, new Date(Date.now() - 35.5 * 60 * 60 * 1000).toISOString());
  appState.addAuditLog('وردية ديمو', `تم تجهيز وردية ${docNo} ضمن بيانات الديمو`, openedBy);
  return shiftId;
}


function createOpenCashierShift({ openedBy, branchId, locationId, openingCash, note, openedAt }) {
  const openedIso = openedAt || new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString();
  const shiftId = insertAndGetId(
    `INSERT INTO cashier_shifts (doc_no, branch_id, location_id, opened_by, opening_cash, opening_note, status, expected_cash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)` ,
    null,
    branchId,
    locationId,
    openedBy,
    Number(openingCash || 0),
    note || 'وردية ديمو مفتوحة',
    Number(openingCash || 0),
    openedIso,
    openedIso,
  );
  const docNo = appState.makeDocNo('SHIFT', shiftId);
  db.prepare('UPDATE cashier_shifts SET doc_no = ? WHERE id = ?').run(docNo, shiftId);
  appState.addAuditLog('فتح وردية ديمو', `تم تجهيز وردية ${docNo} ضمن بيانات الديمو`, openedBy);
  return shiftId;
}

function createStockTransferHistory({ fromLocationId, toLocationId, fromBranchId, toBranchId, items, note, actorId }) {
  const transferId = insertAndGetId('INSERT INTO stock_transfers (doc_no, from_location_id, to_location_id, from_branch_id, to_branch_id, status, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', null, fromLocationId, toLocationId, fromBranchId, toBranchId, 'received', note || 'تحويل ديمو', actorId);
  const docNo = `TR-${transferId}`;
  db.prepare('UPDATE stock_transfers SET doc_no = ?, received_by = ?, received_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(docNo, actorId, transferId);
  for (const item of items) {
    const product = db.prepare('SELECT name FROM products WHERE id = ?').get(item.productId);
    db.prepare('INSERT INTO stock_transfer_items (transfer_id, product_id, product_name, qty) VALUES (?, ?, ?, ?)').run(transferId, item.productId, product ? product.name : `Product ${item.productId}`, Number(item.qty || 0));
  }
  appState.addAuditLog('تحويل مخزون ديمو', `تم تجهيز التحويل ${docNo}`, actorId);
  return transferId;
}

function createStockCountHistory({ branchId, locationId, items, actorId }) {
  const sessionId = insertAndGetId('INSERT INTO stock_count_sessions (doc_no, branch_id, location_id, status, note, counted_by, approved_by, posted_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', `COUNT-${Date.now()}`, branchId, locationId, 'posted', 'جلسة جرد ديمو', actorId, actorId);
  for (const item of items) {
    const product = db.prepare('SELECT id, name, stock_qty FROM products WHERE id = ?').get(item.productId);
    if (!product) continue;
    const expectedQty = Number(product.stock_qty || 0);
    const countedQty = Number(item.countedQty || expectedQty);
    const varianceQty = Number((countedQty - expectedQty).toFixed(3));
    db.prepare('INSERT INTO stock_count_items (session_id, product_id, product_name, expected_qty, counted_qty, variance_qty, reason, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(sessionId, item.productId, product.name, expectedQty, countedQty, varianceQty, item.reason || '', item.note || '');
    if (Math.abs(varianceQty) > 0.0001) {
      db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(countedQty, countedQty, item.productId);
      db.prepare('INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, branch_id, location_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(item.productId, 'stock_count', varianceQty, expectedQty, countedQty, item.reason || 'count_adjustment', item.note || 'جلسة جرد ديمو', 'stock_count', sessionId, branchId, locationId, actorId);
    }
  }
  appState.addAuditLog('جرد ديمو', `تم تجهيز جلسة الجرد #${sessionId}`, actorId);
  return sessionId;
}

function createDamagedStockHistory({ productId, qty, branchId, locationId, reason, note, actorId }) {
  const product = db.prepare('SELECT stock_qty FROM products WHERE id = ?').get(productId);
  if (!product) return null;
  const beforeQty = Number(product.stock_qty || 0);
  const amount = Math.min(beforeQty, Number(qty || 0));
  const afterQty = beforeQty - amount;
  db.prepare('UPDATE products SET stock_qty = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterQty, afterQty, productId);
  db.prepare('INSERT INTO stock_movements (product_id, movement_type, qty, before_qty, after_qty, reason, note, reference_type, reference_id, branch_id, location_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(productId, 'damaged', -amount, beforeQty, afterQty, reason || 'damage', note || 'تالف ديمو', 'damaged_stock', productId, branchId, locationId, actorId);
  const damagedId = insertAndGetId('INSERT INTO damaged_stock_records (product_id, branch_id, location_id, qty, reason, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)', productId, branchId, locationId, amount, reason || 'damage', note || 'تالف ديمو', actorId);
  appState.addAuditLog('تالف ديمو', `تم تجهيز سجل تالف #${damagedId}`, actorId);
  return damagedId;
}

function updateCreatedAt(table, id, createdAt, extraAssignments = '') {
  const sql = `UPDATE ${table} SET created_at = ?, updated_at = ?${extraAssignments ? `, ${extraAssignments}` : ''} WHERE id = ?`;
  db.prepare(sql).run(createdAt, createdAt, id);
}

function updateCreatedAtSimple(table, id, createdAt) {
  db.prepare(`UPDATE ${table} SET created_at = ? WHERE id = ?`).run(createdAt, id);
}

const actorPassword = 'Admin@12345';
const cashierPassword = 'Cashier@12345';
const managerPassword = 'BranchMgr@12345';

const now = Date.now();
const hoursAgo = (hours) => new Date(now - hours * 60 * 60 * 1000).toISOString();

// Settings
upsertSetting('storeName', 'Z Systems Demo');
upsertSetting('storePhone', '01200000000');
upsertSetting('storeAddress', 'Port Said - Demo Workspace');
upsertSetting('lowStockThreshold', '6');
upsertSetting('invoiceFooter', 'شكراً لتجربة النظام المحلي');
upsertSetting('brandName', 'Z Systems Demo');
upsertSetting('accentColor', '#2563eb');
upsertSetting('managerPin', '2468');
upsertSetting('paperSize', 'a4');
upsertSetting('taxRate', '0');
upsertSetting('taxMode', 'exclusive');

// Structure
const mainBranchId = createBranch('الفرع الرئيسي', 'MAIN');
const alexBranchId = createBranch('فرع الإسكندرية', 'ALX');
const mainWarehouseId = createLocation(mainBranchId, 'المخزن الرئيسي', 'MAIN-WH');
const showroomId = createLocation(mainBranchId, 'واجهة البيع', 'SHOW');
const alexWarehouseId = createLocation(alexBranchId, 'مخزن الإسكندرية', 'ALX-WH');
upsertSetting('currentBranchId', String(mainBranchId));
upsertSetting('currentLocationId', String(mainWarehouseId));

// Users
const adminUser = createManagedUser({ username: 'admin', password: actorPassword, role: 'admin', name: 'Local Admin', permissions: DEFAULT_ADMIN_PERMS, branchIds: [String(mainBranchId), String(alexBranchId)], defaultBranchId: String(mainBranchId), mustChangePassword: false });
const cashierUser = createManagedUser({ username: 'cashier.main', password: cashierPassword, role: 'cashier', name: 'Main Cashier', permissions: DEFAULT_CASHIER_PERMS, branchIds: [String(mainBranchId)], defaultBranchId: String(mainBranchId), mustChangePassword: false });
const managerUser = createManagedUser({ username: 'branch.manager', password: managerPassword, role: 'cashier', name: 'Branch Manager', permissions: BRANCH_MANAGER_PERMS, branchIds: [String(alexBranchId)], defaultBranchId: String(alexBranchId), mustChangePassword: false });
const adminActor = { id: Number(adminUser.id), username: adminUser.username, role: 'admin', permissions: DEFAULT_ADMIN_PERMS };
const cashierActor = { id: Number(cashierUser.id), username: cashierUser.username, role: 'cashier', permissions: DEFAULT_CASHIER_PERMS };
const managerActor = { id: Number(managerUser.id), username: managerUser.username, role: 'cashier', permissions: BRANCH_MANAGER_PERMS };

// Master data
const categories = {
  stationery: createCategory('أدوات مكتبية'),
  printing: createCategory('طباعة وتصوير'),
  tech: createCategory('ملحقات تقنية'),
  pantry: createCategory('مستهلكات يومية'),
};

const suppliers = {
  nile: createSupplierRecord({ name: 'شركة النيل للتوريدات', phone: '01010000001', address: 'القاهرة', notes: 'مورد رئيسي للأدوات المكتبية' }),
  delta: createSupplierRecord({ name: 'دلتا باك', phone: '01010000002', address: 'الإسكندرية', notes: 'ورق وأحبار' }),
  smart: createSupplierRecord({ name: 'سمارت تريد', phone: '01010000003', address: 'بورسعيد', notes: 'ملحقات تقنية' }),
  fresh: createSupplierRecord({ name: 'فريش سابلايز', phone: '01010000004', address: 'دمياط', notes: 'مستهلكات يومية' }),
};

const customers = {
  cash: createCustomerRecord({ name: 'عميل نقدي', phone: '', address: '', customerType: 'cash', creditLimit: 0 }),
  alpha: createCustomerRecord({ name: 'شركة ألفا', phone: '01120000001', address: 'بورسعيد', customerType: 'credit', creditLimit: 12000 }),
  beta: createCustomerRecord({ name: 'مكتبة بيتا', phone: '01120000002', address: 'الإسماعيلية', customerType: 'credit', creditLimit: 9000 }),
  gamma: createCustomerRecord({ name: 'مكتب جاما', phone: '01120000003', address: 'السويس', customerType: 'credit', creditLimit: 7000 }),
  omega: createCustomerRecord({ name: 'مؤسسة أوميجا', phone: '01120000004', address: 'الإسكندرية', customerType: 'credit', creditLimit: 15000 }),
  deltaRetail: createCustomerRecord({ name: 'دلتا ريتيل', phone: '01120000005', address: 'القاهرة', customerType: 'cash', creditLimit: 0 }),
};

const productIds = {};
const productSeed = [
  { key: 'pen-blue', name: 'قلم جاف أزرق', barcode: '2801001001', categoryId: categories.stationery, supplierId: suppliers.nile, costPrice: 4.5, retailPrice: 7, wholesalePrice: 6, minStock: 30, units: [{ name: 'قطعة', multiplier: 1, barcode: '2801001001', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }, { name: 'علبة 12', multiplier: 12, barcode: '2801001012', isBaseUnit: false, isSaleUnit: false, isPurchaseUnit: true }], customerPrices: [{ customerId: customers.alpha, price: 5.75 }] },
  { key: 'pen-black', name: 'قلم جاف أسود', barcode: '2801001002', categoryId: categories.stationery, supplierId: suppliers.nile, costPrice: 4.5, retailPrice: 7, wholesalePrice: 6, minStock: 30 },
  { key: 'notebook-a4', name: 'كشكول A4 100 ورقة', barcode: '2801002001', categoryId: categories.stationery, supplierId: suppliers.delta, costPrice: 22, retailPrice: 32, wholesalePrice: 28, minStock: 10, offers: [{ type: 'percent', value: 10, from: '2026-03-01', to: '2026-04-30' }] },
  { key: 'paper-a4', name: 'ورق تصوير A4 80gsm', barcode: '2801003001', categoryId: categories.printing, supplierId: suppliers.delta, costPrice: 118, retailPrice: 145, wholesalePrice: 136, minStock: 8, units: [{ name: 'عبوة', multiplier: 1, barcode: '2801003001', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }] },
  { key: 'toner', name: 'حبر طابعة ليزر', barcode: '2801003002', categoryId: categories.printing, supplierId: suppliers.delta, costPrice: 390, retailPrice: 470, wholesalePrice: 445, minStock: 4 },
  { key: 'usb-32', name: 'فلاشة 32GB', barcode: '2801004001', categoryId: categories.tech, supplierId: suppliers.smart, costPrice: 95, retailPrice: 125, wholesalePrice: 115, minStock: 6 },
  { key: 'mouse-wireless', name: 'ماوس لاسلكي', barcode: '2801004002', categoryId: categories.tech, supplierId: suppliers.smart, costPrice: 145, retailPrice: 190, wholesalePrice: 175, minStock: 5 },
  { key: 'keyboard', name: 'لوحة مفاتيح USB', barcode: '2801004003', categoryId: categories.tech, supplierId: suppliers.smart, costPrice: 165, retailPrice: 210, wholesalePrice: 195, minStock: 5 },
  { key: 'stapler', name: 'دباسة معدن', barcode: '2801005001', categoryId: categories.stationery, supplierId: suppliers.nile, costPrice: 42, retailPrice: 60, wholesalePrice: 54, minStock: 8 },
  { key: 'staples', name: 'دبابيس دباسة', barcode: '2801005002', categoryId: categories.stationery, supplierId: suppliers.nile, costPrice: 9, retailPrice: 15, wholesalePrice: 12, minStock: 15 },
  { key: 'marker', name: 'ماركر سبورة', barcode: '2801005003', categoryId: categories.stationery, supplierId: suppliers.nile, costPrice: 11, retailPrice: 18, wholesalePrice: 15, minStock: 15 },
  { key: 'tissue', name: 'مناديل مكتب', barcode: '2801006001', categoryId: categories.pantry, supplierId: suppliers.fresh, costPrice: 18, retailPrice: 26, wholesalePrice: 23, minStock: 10 },
];
for (const entry of productSeed) {
  productIds[entry.key] = createProductRecord(entry);
}

createServiceRecord('تركيب طابعة عميل', 250, 'خدمة تجريبية لاختبار قسم الخدمات', adminActor.id);
createServiceRecord('صيانة جهاز مكتبي', 180, 'عملية محلية ضمن بيانات الديمو', managerActor.id);

// Treasury opening balance
accounting.addTreasuryTransaction('opening', 15000, 'رصيد افتتاحي ديمو', 'seed', 1, adminActor.id, mainBranchId, mainWarehouseId);

// Purchases to populate stock
const purchase1 = transactions.createPurchaseRecord({
  supplierId: suppliers.nile,
  paymentType: 'credit',
  discount: 0,
  taxRate: 0,
  note: 'توريد أدوات مكتبية للفرع الرئيسي',
  branchId: mainBranchId,
  locationId: mainWarehouseId,
  items: [
    { productId: productIds['pen-blue'], qty: 20, cost: 54, unitName: 'علبة 12', unitMultiplier: 12 },
    { productId: productIds['pen-black'], qty: 18, cost: 54, unitName: 'علبة 12', unitMultiplier: 12 },
    { productId: productIds['stapler'], qty: 12, cost: 42, unitName: 'قطعة', unitMultiplier: 1 },
    { productId: productIds['staples'], qty: 60, cost: 9, unitName: 'قطعة', unitMultiplier: 1 },
  ],
}, adminActor);

const purchase2 = transactions.createPurchaseRecord({
  supplierId: suppliers.delta,
  paymentType: 'cash',
  discount: 25,
  taxRate: 0,
  note: 'توريد ورق وأحبار للفرع الرئيسي',
  branchId: mainBranchId,
  locationId: showroomId,
  items: [
    { productId: productIds['paper-a4'], qty: 24, cost: 118, unitName: 'عبوة', unitMultiplier: 1 },
    { productId: productIds['notebook-a4'], qty: 40, cost: 22, unitName: 'قطعة', unitMultiplier: 1 },
    { productId: productIds['toner'], qty: 8, cost: 390, unitName: 'قطعة', unitMultiplier: 1 },
  ],
}, adminActor);

const purchase3 = transactions.createPurchaseRecord({
  supplierId: suppliers.smart,
  paymentType: 'cash',
  discount: 0,
  taxRate: 0,
  note: 'توريد ملحقات تقنية لفرع الإسكندرية',
  branchId: alexBranchId,
  locationId: alexWarehouseId,
  items: [
    { productId: productIds['usb-32'], qty: 15, cost: 95, unitName: 'قطعة', unitMultiplier: 1 },
    { productId: productIds['mouse-wireless'], qty: 10, cost: 145, unitName: 'قطعة', unitMultiplier: 1 },
    { productId: productIds['keyboard'], qty: 8, cost: 165, unitName: 'قطعة', unitMultiplier: 1 },
  ],
}, managerActor);

const purchase4 = transactions.createPurchaseRecord({
  supplierId: suppliers.fresh,
  paymentType: 'cash',
  discount: 0,
  taxRate: 0,
  note: 'مستهلكات يومية',
  branchId: mainBranchId,
  locationId: mainWarehouseId,
  items: [
    { productId: productIds['tissue'], qty: 18, cost: 18, unitName: 'قطعة', unitMultiplier: 1 },
    { productId: productIds['marker'], qty: 40, cost: 11, unitName: 'قطعة', unitMultiplier: 1 },
  ],
}, adminActor);

// Sales and collections
createOpenCashierShift({ openedBy: cashierActor.id, branchId: mainBranchId, locationId: showroomId, openingCash: 500, note: 'وردية ديمو للكاشير' });
createOpenCashierShift({ openedBy: managerActor.id, branchId: alexBranchId, locationId: alexWarehouseId, openingCash: 800, note: 'وردية ديمو للمدير' });
const sale1 = transactions.createSaleRecord({
  customerId: null,
  paymentType: 'cash',
  paymentChannel: 'cash',
  discount: 0,
  paidAmount: 205,
  branchId: mainBranchId,
  locationId: showroomId,
  note: 'بيع نقدي سريع',
  items: [
    { productId: productIds['notebook-a4'], qty: 2, price: 32, unitName: 'قطعة', unitMultiplier: 1, priceType: 'retail' },
    { productId: productIds['pen-blue'], qty: 10, price: 7, unitName: 'قطعة', unitMultiplier: 1, priceType: 'retail' },
    { productId: productIds['stapler'], qty: 1, price: 60, unitName: 'قطعة', unitMultiplier: 1, priceType: 'retail' },
  ],
}, cashierActor);

const sale2 = transactions.createSaleRecord({
  customerId: customers.alpha,
  paymentType: 'credit',
  paymentChannel: 'cash',
  discount: 15,
  paidAmount: 0,
  branchId: mainBranchId,
  locationId: mainWarehouseId,
  note: 'توريد آجل لشركة ألفا',
  items: [
    { productId: productIds['paper-a4'], qty: 6, price: 145, unitName: 'عبوة', unitMultiplier: 1, priceType: 'retail' },
    { productId: productIds['pen-blue'], qty: 24, price: 5.75, unitName: 'قطعة', unitMultiplier: 1, priceType: 'retail' },
  ],
}, adminActor);

const sale3 = transactions.createSaleRecord({
  customerId: customers.omega,
  paymentType: 'cash',
  paymentChannel: 'bank',
  discount: 0,
  paidAmount: 600,
  branchId: alexBranchId,
  locationId: alexWarehouseId,
  note: 'بيع جملة لفرع الإسكندرية',
  items: [
    { productId: productIds['usb-32'], qty: 2, price: 115, unitName: 'قطعة', unitMultiplier: 1, priceType: 'wholesale' },
    { productId: productIds['mouse-wireless'], qty: 1, price: 175, unitName: 'قطعة', unitMultiplier: 1, priceType: 'wholesale' },
    { productId: productIds['keyboard'], qty: 1, price: 195, unitName: 'قطعة', unitMultiplier: 1, priceType: 'wholesale' },
  ],
}, managerActor);

transactions.createCustomerPayment({ customerId: customers.alpha, amount: 320, note: 'دفعة مقدمة من شركة ألفا', branchId: mainBranchId, locationId: mainWarehouseId }, adminActor);
transactions.createSupplierPaymentRecord({ supplierId: suppliers.nile, amount: 900, note: 'سداد جزئي للمورد', branchId: mainBranchId, locationId: mainWarehouseId }, adminActor);
transactions.createExpenseRecord({ title: 'مصاريف نقل داخلي', amount: 145, note: 'مصاريف تشغيل ديمو', branchId: mainBranchId, locationId: mainWarehouseId, date: hoursAgo(18) }, adminActor);
transactions.createExpenseRecord({ title: 'إنترنت الفرع', amount: 320, note: 'مصروف شهري', branchId: alexBranchId, locationId: alexWarehouseId, date: hoursAgo(12) }, managerActor);
transactions.createReturnRecord({ type: 'sale', invoiceId: Number(sale2.id), productId: productIds['paper-a4'], qty: 1, note: 'مرتجع عميل بسبب تلف عبوة', branchId: mainBranchId, locationId: mainWarehouseId }, adminActor);
transactions.createReturnRecord({ type: 'purchase', invoiceId: Number(purchase1.id), productId: productIds['staples'], qty: 5, note: 'مرتجع مورد - عبوات تالفة', branchId: mainBranchId, locationId: mainWarehouseId }, adminActor);

// Inventory / cash history
createStockTransferHistory({
  fromLocationId: mainWarehouseId,
  toLocationId: showroomId,
  fromBranchId: mainBranchId,
  toBranchId: mainBranchId,
  items: [
    { productId: productIds['notebook-a4'], qty: 6 },
    { productId: productIds['pen-black'], qty: 24 },
  ],
  note: 'تحويل داخلي ديمو',
  actorId: adminActor.id,
});

createStockCountHistory({
  branchId: alexBranchId,
  locationId: alexWarehouseId,
  actorId: managerActor.id,
  items: [
    { productId: productIds['usb-32'], countedQty: 12, reason: 'count_adjustment', note: 'فرق جرد بسيط' },
    { productId: productIds['keyboard'], countedQty: 7, reason: 'count_adjustment', note: 'نقص قطعة' },
  ],
});

createDamagedStockHistory({ productId: productIds['marker'], qty: 3, branchId: mainBranchId, locationId: showroomId, reason: 'damage', note: 'أقلام تالفة للعرض', actorId: adminActor.id });
createCashierShiftHistory({ openedBy: cashierActor.id, branchId: mainBranchId, locationId: showroomId, openingCash: 500, cashIn: 150, cashOut: 30, countedCash: 615, note: 'وردية محلية للتجربة' });

// Timestamp polish for a subset
updateCreatedAt('sales', Number(sale1.id), hoursAgo(20));
updateCreatedAt('sales', Number(sale2.id), hoursAgo(16));
updateCreatedAt('sales', Number(sale3.id), hoursAgo(10));
updateCreatedAt('purchases', Number(purchase1.id), hoursAgo(30));
updateCreatedAt('purchases', Number(purchase2.id), hoursAgo(26));
updateCreatedAt('purchases', Number(purchase3.id), hoursAgo(14));
updateCreatedAt('purchases', Number(purchase4.id), hoursAgo(8));
updateCreatedAtSimple('customer_payments', 1, hoursAgo(15));
updateCreatedAtSimple('supplier_payments', 1, hoursAgo(22));

appState.persistRelationalState();

const summary = {
  dbFile: resolvedDbFile,
  users: tableCount('users'),
  branches: tableCount('branches'),
  locations: tableCount('stock_locations'),
  categories: tableCount('product_categories'),
  suppliers: tableCount('suppliers'),
  customers: tableCount('customers'),
  products: tableCount('products'),
  purchases: tableCount('purchases'),
  sales: tableCount('sales'),
  returns: tableCount('returns'),
  customerPayments: tableCount('customer_payments'),
  supplierPayments: tableCount('supplier_payments'),
  expenses: tableCount('expenses'),
  services: tableCount('services'),
  shifts: tableCount('cashier_shifts'),
  stockTransfers: tableCount('stock_transfers'),
  stockCountSessions: tableCount('stock_count_sessions'),
  damagedStockRecords: tableCount('damaged_stock_records'),
};

const output = {
  summary,
  accounts: [
    { username: 'admin', password: actorPassword, role: 'admin', scope: 'all branches' },
    { username: 'cashier.main', password: cashierPassword, role: 'cashier', scope: 'main branch' },
    { username: 'branch.manager', password: managerPassword, role: 'branch manager', scope: 'alexandria branch' },
  ],
};

const reportPath = path.join(projectRoot, 'docs', 'demo-seed-report.json');
fs.writeFileSync(reportPath, JSON.stringify(output, null, 2));
log(`Demo seed completed: ${JSON.stringify(summary)}`);
log(`Accounts written to ${reportPath}`);
db.close();
