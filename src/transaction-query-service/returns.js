const { makePagedResult } = require('./pagination');

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

module.exports = { buildReturnsListResponse };
