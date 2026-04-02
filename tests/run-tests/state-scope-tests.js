const assert = require('assert');
const { createStateStoreService } = require('../../src/state-store-service');
const { run } = require('./test-harness');

function createMockDb() {
  return {
    prepare(sql) {
      return {
        get(value) {
          if (sql.includes('FROM branches')) {
            if (Number(value) === 2 || Number(value) === 3) return { id: Number(value) };
            return null;
          }
          if (sql.includes('FROM stock_locations')) {
            if (Number(value) === 7) return { id: 7, branch_id: 2 };
            if (Number(value) === 8) return { id: 8, branch_id: 3 };
            return null;
          }
          return null;
        },
        run() { return { changes: 0 }; },
        all() { return []; },
      };
    },
  };
}

function createService() {
  return createStateStoreService({
    db: createMockDb(),
    config: { defaultStoreName: 'Demo' },
    getSetting(_key, fallback) { return fallback; },
    defaultUsersState() { return []; },
    legacyStateKeys: [],
    reportSummary() { return {}; },
    relationalBranches() { return []; },
    relationalLocations() { return []; },
    relationalStockTransfers() { return []; },
    relationalCashierShifts() { return []; },
    relationalStockCountSessions() { return []; },
    relationalDamagedStockRecords() { return []; },
    relationalCategories() { return []; },
    relationalSuppliers() { return []; },
    relationalCustomers() { return []; },
    relationalProducts() { return []; },
    relationalTreasury() { return []; },
    relationalAuditLogs() { return []; },
    relationalSales() { return []; },
    relationalPurchases() { return []; },
    relationalExpenses() { return []; },
    relationalSupplierPayments() { return []; },
    relationalReturns() { return []; },
    relationalServices() { return []; },
  });
}

function runStateScopeTests() {
  run('resolveBranchLocationScope enforces assigned branch scope and infers default branch', () => {
    const service = createService();
    assert.deepEqual(service.resolveBranchLocationScope({}, { branchIds: ['2'], defaultBranchId: '2' }), { branchId: 2, locationId: null });
    assert.deepEqual(service.resolveBranchLocationScope({ locationId: 7 }, { branchIds: ['2'], defaultBranchId: '2' }), { branchId: 2, locationId: 7 });
    assert.throws(() => service.resolveBranchLocationScope({ branchId: 3 }, { branchIds: ['2'], defaultBranchId: '2' }), /outside your assigned scope/i);
    assert.throws(() => service.resolveBranchLocationScope({ locationId: 8 }, { branchIds: ['2'], defaultBranchId: '2' }), /outside your assigned branch scope/i);
  });
}

module.exports = {
  runStateScopeTests,
};
