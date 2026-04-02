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

module.exports = { parsePositiveInt, paginateRows, makePagedResult };
