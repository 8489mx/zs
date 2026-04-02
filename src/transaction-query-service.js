function parsePositiveInt(value, fallback, max = 200) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function paginateRows(rows, query, defaults = {}) {
  const page = parsePositiveInt(query.page, defaults.page || 1, 10000);
  const pageSize = parsePositiveInt(query.pageSize, defaults.pageSize || 20, defaults.maxPageSize || 100);
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  return {
    rows: rows.slice(startIndex, startIndex + pageSize),
    pagination: {
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
      rangeStart: totalItems ? startIndex + 1 : 0,
      rangeEnd: totalItems ? Math.min(startIndex + pageSize, totalItems) : 0,
    },
  };
}

function makePagedResult(allRows, filteredRows, query, responseKey, defaults, summarizeRows) {
  const hasPagingParams = query.page || query.pageSize || query.search || query.q || query.filter || query.view || query.type;
  if (!hasPagingParams) return { [responseKey]: allRows };
  const { rows, pagination } = paginateRows(filteredRows, query, defaults);
  return { [responseKey]: rows, pagination, summary: summarizeRows(filteredRows) };
}


function filterReturnRows(rows, query) {
  const search = String(query.search || query.q || '').trim().toLowerCase();
  const filter = String(query.filter || query.view || 'all').trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((row) => {
    const returnType = String(row.returnType || row.type || '').toLowerCase();
    if (filter === 'sales' && returnType !== 'sale') return false;
    if (filter === 'purchase' && returnType !== 'purchase') return false;
    if (filter === 'today' && String(row.createdAt || row.date || '').slice(0, 10) != today) return false;
    if (!search) return true;
    return [row.docNo, row.returnType, row.productName, row.note, row.customerName, row.supplierName]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizeReturnRows(rows) {
  return {
    totalItems: rows.length,
    totalAmount: Number(rows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    salesReturns: rows.filter((row) => String(row.returnType || row.type || '').toLowerCase() === 'sale').length,
    purchaseReturns: rows.filter((row) => String(row.returnType || row.type || '').toLowerCase() === 'purchase').length,
    todayCount: rows.filter((row) => String(row.createdAt || row.date || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    latestDocNo: rows[0] ? rows[0].docNo || '' : '',
  };
}

function buildReturnsListResponse(rows, query) {
  const filteredRows = filterReturnRows(rows || [], query || {});
  return makePagedResult(rows || [], filteredRows, query || {}, 'returns', { pageSize: 20, maxPageSize: 100 }, summarizeReturnRows);
}

function filterExpenseRows(rows, query) {
  const search = String(query.search || '').trim().toLowerCase();
  if (!search) return rows;
  return rows.filter((row) => [row.title, row.note, row.branchName, row.locationName, row.createdBy]
    .some((value) => String(value || '').toLowerCase().includes(search)));
}

function summarizeExpenseRows(rows) {
  return {
    totalItems: rows.length,
    totalAmount: Number(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)),
  };
}

function filterSalesRows(rows, query) {
  const search = String(query.search || query.q || '').trim().toLowerCase();
  const filter = String(query.filter || query.view || 'all').trim();
  return rows.filter((row) => {
    if (filter === 'cash' && String(row.paymentType || '') !== 'cash') return false;
    if (filter === 'credit' && String(row.paymentType || '') !== 'credit') return false;
    if (filter === 'cancelled' && String(row.status || '') !== 'cancelled') return false;
    if (!search) return true;
    return [row.docNo, row.customerName, row.status, row.paymentType, row.branchName, row.locationName, row.note]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizeSalesRows(rows) {
  const today = new Date().toISOString().slice(0, 10);
  const topByCustomer = new Map();
  rows.forEach((row) => {
    const key = String(row.customerId || row.customerName || 'cash');
    const current = topByCustomer.get(key) || { name: row.customerName || 'عميل نقدي', total: 0, count: 0 };
    current.total += Number(row.total || 0);
    current.count += 1;
    topByCustomer.set(key, current);
  });
  const todayRows = rows.filter((row) => String(row.date || '').slice(0, 10) === today);
  return {
    totalItems: rows.length,
    totalSales: Number(rows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    todaySalesCount: todayRows.length,
    todaySalesTotal: Number(todayRows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    cashTotal: Number(rows.filter((row) => String(row.paymentType || '') === 'cash').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    creditTotal: Number(rows.filter((row) => String(row.paymentType || '') === 'credit').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    cancelledCount: rows.filter((row) => String(row.status || '') === 'cancelled').length,
    topCustomers: [...topByCustomer.values()].sort((a, b) => b.total - a.total).slice(0, 5),
  };
}

function filterPurchaseRows(rows, query) {
  const search = String(query.search || query.q || '').trim().toLowerCase();
  const filter = String(query.filter || query.view || 'all').trim();
  return rows.filter((row) => {
    if (filter === 'cash' && String(row.paymentType || '') !== 'cash') return false;
    if (filter === 'credit' && String(row.paymentType || '') !== 'credit') return false;
    if (filter === 'cancelled' && String(row.status || '') !== 'cancelled') return false;
    if (!search) return true;
    return [row.docNo, row.supplierName, row.status, row.paymentType, row.branchName, row.locationName, row.note]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizePurchaseRows(rows) {
  const topBySupplier = new Map();
  rows.forEach((row) => {
    const key = String(row.supplierId || row.supplierName || 'unknown');
    const current = topBySupplier.get(key) || { name: row.supplierName || 'بدون مورد', total: 0, count: 0 };
    current.total += Number(row.total || 0);
    current.count += 1;
    topBySupplier.set(key, current);
  });
  return {
    totalItems: rows.length,
    totalAmount: Number(rows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    creditTotal: Number(rows.filter((row) => String(row.paymentType || '') === 'credit').reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    cancelledCount: rows.filter((row) => String(row.status || '') === 'cancelled').length,
    posted: rows.filter((row) => String(row.status || '') === 'posted').length,
    draft: rows.filter((row) => String(row.status || '') !== 'posted').length,
    topSuppliers: [...topBySupplier.values()].sort((a, b) => b.total - a.total).slice(0, 5),
  };
}

function filterCashierShiftRows(rows, query) {
  const search = String(query.search || '').trim().toLowerCase();
  const filter = String(query.filter || 'all').trim();
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((row) => {
    if (filter === 'open' && String(row.status || '') !== 'open') return false;
    if (filter === 'closed' && String(row.status || '') !== 'closed') return false;
    if (filter === 'variance' && Math.abs(Number(row.variance || 0)) <= 0) return false;
    if (filter === 'today' && String(row.createdAt || '').slice(0, 10) !== today) return false;
    if (!search) return true;
    return [row.docNo, row.status, row.openedByName, row.branchName, row.locationName, row.note]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizeCashierShiftRows(rows) {
  const openRows = rows.filter((row) => String(row.status || '') === 'open');
  return {
    totalItems: rows.length,
    openShiftCount: openRows.length,
    openShiftDocNo: openRows[0] ? openRows[0].docNo || String(openRows[0].id || '') : '',
    totalVariance: Number(rows.reduce((sum, row) => sum + Number(row.variance || 0), 0).toFixed(2)),
  };
}

function buildSalesListResponse(rows, query) {
  const filteredRows = filterSalesRows(rows || [], query || {});
  return makePagedResult(rows || [], filteredRows, query || {}, 'sales', { pageSize: 30, maxPageSize: 100 }, summarizeSalesRows);
}

function buildPurchasesListResponse(rows, query) {
  const filteredRows = filterPurchaseRows(rows || [], query || {});
  return makePagedResult(rows || [], filteredRows, query || {}, 'purchases', { pageSize: 25, maxPageSize: 100 }, summarizePurchaseRows);
}

function buildCashierShiftsListResponse(rows, query) {
  const filteredRows = filterCashierShiftRows(rows || [], query || {});
  return makePagedResult(rows || [], filteredRows, query || {}, 'cashierShifts', { pageSize: 20, maxPageSize: 100 }, summarizeCashierShiftRows);
}

function buildExpensesListResponse(rows, query) {
  const filteredRows = filterExpenseRows(rows || [], query || {});
  return makePagedResult(rows || [], filteredRows, query || {}, 'expenses', { pageSize: 20, maxPageSize: 100 }, summarizeExpenseRows);
}

module.exports = {
  buildSalesListResponse,
  buildPurchasesListResponse,
  buildCashierShiftsListResponse,
  buildExpensesListResponse,
  buildReturnsListResponse,
  filterCashierShiftRows,
  summarizeCashierShiftRows,
};
