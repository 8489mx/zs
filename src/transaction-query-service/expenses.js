const { makePagedResult } = require('./pagination');

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

function buildExpensesListResponse(rows, query) {
  const filteredRows = filterExpenseRows(rows || [], query || {});
  return makePagedResult(rows || [], filteredRows, query || {}, 'expenses', { pageSize: 20, maxPageSize: 100 }, summarizeExpenseRows);
}

module.exports = { buildExpensesListResponse };
