function createStateStoreCore({
  db,
  config,
  getSetting,
  legacyStateKeys,
  defaultUsersState,
  reportSummary,
  relationalBranches,
  relationalLocations,
  relationalStockTransfers,
  relationalCashierShifts,
  relationalStockCountSessions,
  relationalDamagedStockRecords,
  relationalCategories,
  relationalSuppliers,
  relationalCustomers,
  relationalProducts,
  relationalTreasury,
  relationalAuditLogs,
  relationalSales,
  relationalPurchases,
  relationalExpenses,
  relationalSupplierPayments,
  relationalReturns,
  relationalServices,
  safeJsonParse,
}) {
  function defaultState() {
    return {
      settings: {
        storeName: getSetting('storeName', config.defaultStoreName),
        phone: getSetting('storePhone', '01000000000'),
        address: getSetting('storeAddress', 'القاهرة'),
        lowStockThreshold: Number(getSetting('lowStockThreshold', '5')),
        invoiceFooter: getSetting('invoiceFooter', 'شكراً لتعاملكم معنا'),
        invoiceQR: getSetting('invoiceQR', ''),
        taxNumber: getSetting('taxNumber', ''),
        taxRate: Number(getSetting('taxRate', 0) || 0),
        taxMode: getSetting('taxMode', 'exclusive') === 'inclusive' ? 'inclusive' : 'exclusive',
        logoData: getSetting('logoData', ''),
        paperSize: getSetting('paperSize', 'a4'),
        hasManagerPin: Boolean(getSetting('managerPinHash', getSetting('managerPin', ''))),
        autoBackup: getSetting('autoBackup', 'on'),
        brandName: getSetting('brandName', 'Z Systems'),
        accentColor: getSetting('accentColor', '#2563eb'),
        currentBranchId: getSetting('currentBranchId', ''),
        currentLocationId: getSetting('currentLocationId', ''),
      },
      users: defaultUsersState(),
      branches: [],
      locations: [],
      categories: [{ id: 'cat-general', name: 'عام' }],
      suppliers: [{ id: 'sup-default', name: 'مورد تجريبي', phone: '', address: '', balance: 0, notes: '' }],
      customers: [{ id: 'cus-default', name: 'عميل نقدي', phone: '', address: '', balance: 0, type: 'cash', creditLimit: 0 }],
      products: [{
        id: 'prod-demo', name: 'منتج تجريبي', barcode: '123456789', categoryId: 'cat-general', supplierId: 'sup-default',
        costPrice: 50, retailPrice: 70, wholesalePrice: 60, stock: 25, minStock: 5, notes: '',
        units: [{ id: 'u1', name: 'قطعة', multiplier: 1, barcode: '123456789' }], customerPrices: [], offers: []
      }],
      sales: [], purchases: [], expenses: [], services: [],
      treasury: [{ id: 'open-1', type: 'opening', amount: 0, note: 'رصيد افتتاحي', date: new Date().toISOString() }],
      cashierShifts: [],
      customerPayments: [], supplierPayments: [], returns: [], auditLogs: [],
      stockTransfers: [],
      stockCountSessions: [], damagedStockRecords: [],
      counters: { sale: 1, purchase: 1, saleReturn: 1, purchaseReturn: 1, stock: 1, paymentIn: 1, paymentOut: 1 },
      stockMovements: [], productHistory: []
    };
  }

  function mergeStateWithDefaults(parsed) {
    const base = defaultState();
    return {
      ...base,
      ...(parsed || {}),
      settings: { ...base.settings, ...((parsed || {}).settings || {}) },
      users: Array.isArray((parsed || {}).users) ? parsed.users : base.users,
      branches: Array.isArray((parsed || {}).branches) ? parsed.branches : base.branches,
      locations: Array.isArray((parsed || {}).locations) ? parsed.locations : base.locations,
      categories: Array.isArray((parsed || {}).categories) ? parsed.categories : base.categories,
      suppliers: Array.isArray((parsed || {}).suppliers) ? parsed.suppliers : base.suppliers,
      customers: Array.isArray((parsed || {}).customers) ? parsed.customers : base.customers,
      products: Array.isArray((parsed || {}).products) ? parsed.products : base.products,
      sales: Array.isArray((parsed || {}).sales) ? parsed.sales : base.sales,
      purchases: Array.isArray((parsed || {}).purchases) ? parsed.purchases : base.purchases,
      expenses: Array.isArray((parsed || {}).expenses) ? parsed.expenses : base.expenses,
      services: Array.isArray((parsed || {}).services) ? parsed.services : base.services,
      treasury: Array.isArray((parsed || {}).treasury) ? parsed.treasury : base.treasury,
      cashierShifts: Array.isArray((parsed || {}).cashierShifts) ? parsed.cashierShifts : base.cashierShifts,
      customerPayments: Array.isArray((parsed || {}).customerPayments) ? parsed.customerPayments : base.customerPayments,
      supplierPayments: Array.isArray((parsed || {}).supplierPayments) ? parsed.supplierPayments : base.supplierPayments,
      returns: Array.isArray((parsed || {}).returns) ? parsed.returns : base.returns,
      auditLogs: Array.isArray((parsed || {}).auditLogs) ? parsed.auditLogs : base.auditLogs,
      stockCountSessions: Array.isArray((parsed || {}).stockCountSessions) ? parsed.stockCountSessions : base.stockCountSessions,
      damagedStockRecords: Array.isArray((parsed || {}).damagedStockRecords) ? parsed.damagedStockRecords : base.damagedStockRecords,
      counters: { ...base.counters, ...((parsed || {}).counters || {}) },
      stockMovements: Array.isArray((parsed || {}).stockMovements) ? parsed.stockMovements : base.stockMovements,
      stockTransfers: Array.isArray((parsed || {}).stockTransfers) ? parsed.stockTransfers : base.stockTransfers,
      productHistory: Array.isArray((parsed || {}).productHistory) ? parsed.productHistory : base.productHistory,
    };
  }

  function sanitizeLegacyState(state) {
    const merged = mergeStateWithDefaults(state || {});
    const legacy = {};
    for (const key of legacyStateKeys || []) legacy[key] = merged[key];
    return legacy;
  }

  function getStoredAppState() {
    const row = db.prepare('SELECT state_json FROM app_state WHERE id = 1').get();
    if (!row) return sanitizeLegacyState(defaultState());
    return sanitizeLegacyState(safeJsonParse(row.state_json, {}));
  }

  function hydrateRelationalCollections(state) {
    const next = mergeStateWithDefaults(state || {});
    next.branches = relationalBranches();
    next.locations = relationalLocations();
    next.stockTransfers = relationalStockTransfers();
    next.categories = relationalCategories();
    next.suppliers = relationalSuppliers();
    next.customers = relationalCustomers();
    next.products = relationalProducts();
    next.sales = relationalSales();
    next.purchases = relationalPurchases();
    next.expenses = relationalExpenses();
    next.supplierPayments = relationalSupplierPayments();
    next.returns = relationalReturns();
    next.services = relationalServices();
    next.treasury = relationalTreasury();
    next.cashierShifts = relationalCashierShifts();
    next.stockCountSessions = relationalStockCountSessions();
    next.damagedStockRecords = relationalDamagedStockRecords();
    next.auditLogs = relationalAuditLogs();
    return next;
  }

  function stateWithUsers() {
    const state = hydrateRelationalCollections(getStoredAppState());
    state.users = defaultUsersState();
    state.settings = {
      ...state.settings,
      storeName: getSetting('storeName', state.settings.storeName || config.defaultStoreName),
      phone: getSetting('storePhone', state.settings.phone || ''),
      address: getSetting('storeAddress', state.settings.address || ''),
      lowStockThreshold: Number(getSetting('lowStockThreshold', String(state.settings.lowStockThreshold || 5))),
      invoiceFooter: getSetting('invoiceFooter', state.settings.invoiceFooter || ''),
      invoiceQR: getSetting('invoiceQR', state.settings.invoiceQR || ''),
      taxNumber: getSetting('taxNumber', state.settings.taxNumber || ''),
      taxRate: Number(getSetting('taxRate', state.settings.taxRate || 0) || 0),
      taxMode: getSetting('taxMode', state.settings.taxMode || 'exclusive') === 'inclusive' ? 'inclusive' : 'exclusive',
      logoData: getSetting('logoData', state.settings.logoData || ''),
      paperSize: getSetting('paperSize', state.settings.paperSize || 'a4'),
      hasManagerPin: Boolean(getSetting('managerPinHash', getSetting('managerPin', ''))),
      autoBackup: getSetting('autoBackup', state.settings.autoBackup || 'on'),
      brandName: getSetting('brandName', state.settings.brandName || 'Z Systems'),
      accentColor: getSetting('accentColor', state.settings.accentColor || '#2563eb'),
      currentBranchId: getSetting('currentBranchId', state.settings.currentBranchId || ''),
      currentLocationId: getSetting('currentLocationId', state.settings.currentLocationId || ''),
    };
    state.cashierShifts = relationalCashierShifts();
    state.stockCountSessions = relationalStockCountSessions();
    state.damagedStockRecords = relationalDamagedStockRecords();
    state.reportSummary = reportSummary({ from: '1970-01-01T00:00:00.000Z', to: new Date().toISOString() });
    return state;
  }

  return {
    defaultState,
    mergeStateWithDefaults,
    sanitizeLegacyState,
    getStoredAppState,
    hydrateRelationalCollections,
    stateWithUsers,
  };
}

module.exports = { createStateStoreCore };
