function parsePositiveInt(value, fallback, max = 200) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function paginateRows(rows, query, defaults = {}) {
  const page = parsePositiveInt(query.page, defaults.page || 1, 10000);
  const pageSize = parsePositiveInt(query.pageSize, defaults.pageSize || 25, defaults.maxPageSize || 200);
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

function filterStockTransferRows(rows, query) {
  const search = String(query.search || query.q || '').trim().toLowerCase();
  const filter = String(query.filter || query.view || 'all').trim().toLowerCase();
  return rows.filter((row) => {
    if (filter !== 'all' && String(row.status || '').toLowerCase() !== filter) return false;
    if (!search) return true;
    return [row.docNo, row.note, row.fromLocationName, row.toLocationName, row.fromBranchName, row.toBranchName, row.createdBy, row.status]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizeStockTransferRows(rows) {
  return {
    totalItems: rows.length,
    sent: rows.filter((row) => String(row.status || '') === 'sent').length,
    received: rows.filter((row) => String(row.status || '') === 'received').length,
    cancelled: rows.filter((row) => String(row.status || '') === 'cancelled').length,
    totalQty: Number(rows.reduce((sum, row) => sum + Number((row.items || []).reduce((inner, item) => inner + Number(item.qty || 0), 0)), 0).toFixed(3)),
  };
}

function filterStockCountSessionRows(rows, query) {
  const search = String(query.search || query.q || '').trim().toLowerCase();
  const filter = String(query.filter || query.view || 'all').trim().toLowerCase();
  return rows.filter((row) => {
    if (filter !== 'all' && String(row.status || '').toLowerCase() !== filter) return false;
    if (!search) return true;
    return [row.docNo, row.note, row.locationName, row.branchName, row.countedBy, row.approvedBy, row.status]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizeStockCountSessionRows(rows) {
  return {
    totalItems: rows.length,
    draft: rows.filter((row) => String(row.status || '') === 'draft').length,
    posted: rows.filter((row) => String(row.status || '') === 'posted').length,
    totalVariance: Number(rows.reduce((sum, row) => sum + Number((row.items || []).reduce((inner, item) => inner + Number(item.varianceQty || 0), 0)), 0).toFixed(3)),
  };
}

function filterDamagedStockRows(rows, query) {
  const search = String(query.search || query.q || '').trim().toLowerCase();
  return rows.filter((row) => {
    if (!search) return true;
    return [row.productName, row.reason, row.note, row.locationName, row.branchName, row.createdBy]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizeDamagedStockRows(rows) {
  return {
    totalItems: rows.length,
    totalQty: Number(rows.reduce((sum, row) => sum + Number(row.qty || 0), 0).toFixed(3)),
  };
}

function filterStockMovementRows(rows, query) {
  const search = String(query.search || '').trim().toLowerCase();
  const type = String(query.type || 'all').trim().toLowerCase();
  return rows.filter((row) => {
    if (type !== 'all' && String(row.type || '').toLowerCase() !== type) return false;
    if (!search) return true;
    return [row.productName, row.reason, row.note, row.locationName, row.branchName, row.createdBy, row.referenceType, row.referenceId]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizeStockMovementRows(rows) {
  return rows.reduce((acc, row) => {
    const qty = Number(row.qty || 0);
    if (qty >= 0) acc.positive += qty;
    else acc.negative += Math.abs(qty);
    return acc;
  }, { positive: 0, negative: 0, totalItems: rows.length });
}

function buildStockTransfersListResponse(rows, query) {
  const filteredRows = filterStockTransferRows(rows || [], query || {});
  return makePagedResult(rows || [], filteredRows, query || {}, 'stockTransfers', { pageSize: 10, maxPageSize: 100 }, summarizeStockTransferRows);
}

function buildStockCountSessionsListResponse(rows, query) {
  const filteredRows = filterStockCountSessionRows(rows || [], query || {});
  return makePagedResult(rows || [], filteredRows, query || {}, 'stockCountSessions', { pageSize: 8, maxPageSize: 100 }, summarizeStockCountSessionRows);
}

function buildDamagedStockListResponse(rows, query) {
  const filteredRows = filterDamagedStockRows(rows || [], query || {});
  return makePagedResult(rows || [], filteredRows, query || {}, 'damagedStockRecords', { pageSize: 10, maxPageSize: 100 }, summarizeDamagedStockRows);
}

function buildStockMovementsListResponse(rows, query) {
  const filteredRows = filterStockMovementRows(rows || [], query || {});
  return makePagedResult(rows || [], filteredRows, query || {}, 'stockMovements', { pageSize: 20, maxPageSize: 100 }, summarizeStockMovementRows);
}

module.exports = {
  buildStockTransfersListResponse,
  buildStockCountSessionsListResponse,
  buildDamagedStockListResponse,
  buildStockMovementsListResponse,
};
