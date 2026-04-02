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

function filterServiceRows(rows, query) {
  const search = String(query.search || query.q || '').trim().toLowerCase();
  const filter = String(query.filter || query.view || 'all').trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((row) => {
    const amount = Number(row.amount || 0);
    if (filter === 'today' && String(row.serviceDate || '').slice(0, 10) !== today) return false;
    if (filter === 'high' && amount < 1000) return false;
    if (filter === 'notes' && !String(row.notes || '').trim()) return false;
    if (!search) return true;
    return [row.name, row.notes, row.createdByName, row.serviceDate]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizeServiceRows(rows) {
  const today = new Date().toISOString().slice(0, 10);
  const totalAmount = Number(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2));
  const highestAmount = Number(rows.reduce((max, row) => Math.max(max, Number(row.amount || 0)), 0).toFixed(2));
  const latestRow = [...rows].sort((a, b) => String(b.serviceDate || '').localeCompare(String(a.serviceDate || '')))[0] || null;
  return {
    totalItems: rows.length,
    totalAmount,
    todayCount: rows.filter((row) => String(row.serviceDate || '').slice(0, 10) === today).length,
    averageAmount: rows.length ? Number((totalAmount / rows.length).toFixed(2)) : 0,
    highestAmount,
    latestServiceName: latestRow ? latestRow.name || '' : '',
    latestCreatedByName: latestRow ? latestRow.createdByName || '' : '',
  };
}


function filterManagedUsersRows(rows, query) {
  const search = String(query.search || query.q || '').trim().toLowerCase();
  const filter = String(query.filter || query.view || 'all').trim().toLowerCase();
  return (rows || []).filter((row) => {
    const isActive = row && row.isActive !== false;
    const role = String(row && row.role || '').trim().toLowerCase();
    const mustChangePassword = row && row.mustChangePassword === true;
    const locked = Number(row && row.failedLoginCount || 0) > 0 || Boolean(row && row.lockedUntil);
    if (filter === 'active' && !isActive) return false;
    if (filter === 'inactive' && isActive) return false;
    if (filter === 'admins' && !['admin', 'super_admin'].includes(role)) return false;
    if (filter === 'cashiers' && role !== 'cashier') return false;
    if (filter === 'locked' && !locked) return false;
    if (filter === 'rotation' && !mustChangePassword) return false;
    if (!search) return true;
    return [row.username, row.displayName, row.name, row.role]
      .some((value) => String(value || '').toLowerCase().includes(search));
  });
}

function summarizeManagedUsersRows(rows) {
  const allRows = rows || [];
  return {
    totalItems: allRows.length,
    superAdmins: allRows.filter((row) => String(row.role || '') === 'super_admin').length,
    admins: allRows.filter((row) => String(row.role || '') === 'admin').length,
    cashiers: allRows.filter((row) => String(row.role || '') === 'cashier').length,
    inactive: allRows.filter((row) => row.isActive === false).length,
    locked: allRows.filter((row) => Boolean(row.lockedUntil) || Number(row.failedLoginCount || 0) > 0).length,
    activePrivilegedUsers: allRows.filter((row) => row.isActive !== false && ['super_admin', 'admin'].includes(String(row.role || ''))).length,
  };
}

function buildServicesListResponse(rows, query) {
  const filteredRows = filterServiceRows(rows || [], query || {});
  return makePagedResult(rows || [], filteredRows, query || {}, 'services', { pageSize: 20, maxPageSize: 100 }, summarizeServiceRows);
}

module.exports = {
  buildServicesListResponse,
  filterServiceRows,
  summarizeServiceRows,
  paginateRows,
  filterManagedUsersRows,
  summarizeManagedUsersRows,
};
