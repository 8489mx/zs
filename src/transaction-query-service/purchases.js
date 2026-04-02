const { makePagedResult } = require('./pagination');

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
  const filteredRows = filterPurchaseRows(rows || [], query || {});
  return makePagedResult(rows || [], filteredRows, query || {}, 'purchases', { pageSize: 25, maxPageSize: 100 }, summarizePurchaseRows);
}

module.exports = { buildPurchasesListResponse };
