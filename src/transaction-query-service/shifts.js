const { makePagedResult } = require('./paging');

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

function buildCashierShiftsListResponse(rows, query) {
  const safeRows = rows || [];
  const safeQuery = query || {};
  const filteredRows = filterCashierShiftRows(safeRows, safeQuery);
  return makePagedResult(safeRows, filteredRows, safeQuery, 'cashierShifts', { pageSize: 20, maxPageSize: 100 }, summarizeCashierShiftRows);
}

module.exports = { buildCashierShiftsListResponse, filterCashierShiftRows, summarizeCashierShiftRows };
