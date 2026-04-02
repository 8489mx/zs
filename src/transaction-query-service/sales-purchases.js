const { makePagedResult } = require('./paging');

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

function buildSalesListResponse(rows, query) {
  const safeRows = rows || [];
  const safeQuery = query || {};
  const filteredRows = filterSalesRows(safeRows, safeQuery);
  return makePagedResult(safeRows, filteredRows, safeQuery, 'sales', { pageSize: 30, maxPageSize: 100 }, summarizeSalesRows);
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

function buildPurchasesListResponse(rows, query) {
  const safeRows = rows || [];
  const safeQuery = query || {};
  const filteredRows = filterPurchaseRows(safeRows, safeQuery);
  return makePagedResult(safeRows, filteredRows, safeQuery, 'purchases', { pageSize: 25, maxPageSize: 100 }, summarizePurchaseRows);
}

module.exports = {
  buildPurchasesListResponse,
  buildSalesListResponse,
  filterPurchaseRows,
  filterSalesRows,
  summarizePurchaseRows,
  summarizeSalesRows,
};
