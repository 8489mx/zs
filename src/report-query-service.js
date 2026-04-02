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
  const slice = rows.slice(startIndex, startIndex + pageSize);
  return {
    rows: slice,
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

function buildReportQueryService() {
  function filterInventoryRows(rows, query) {
    const search = String(query.search || '').trim().toLowerCase();
    const filter = String(query.filter || 'all').trim().toLowerCase();
    return rows.filter((row) => {
      const status = String(row.status || '').toLowerCase();
      if (filter === 'out' && status !== 'out') return false;
      if (filter === 'low' && status !== 'low') return false;
      if (filter === 'attention' && !['low', 'out'].includes(status)) return false;
      if (!search) return true;
      return [row.name, row.category, row.supplier, row.status].some((value) => String(value || '').toLowerCase().includes(search));
    });
  }

  function summarizeInventoryRows(rows) {
    return rows.reduce((summary, row) => {
      summary.totalItems += 1;
      if (row.status === 'out') summary.outOfStock += 1;
      if (row.status === 'low') summary.lowStock += 1;
      if (!row.status || row.status === 'ok') summary.healthy += 1;
      return summary;
    }, { totalItems: 0, outOfStock: 0, lowStock: 0, healthy: 0 });
  }

  function queryInventoryRows(rows, query) {
    const filteredRows = filterInventoryRows(rows || [], query || {});
    const { rows: pagedRows, pagination } = paginateRows(filteredRows, query || {}, { pageSize: 10, maxPageSize: 100 });
    return {
      items: pagedRows,
      pagination,
      summary: summarizeInventoryRows(filteredRows),
    };
  }

  function filterCustomerBalanceRows(rows, query) {
    const search = String(query.search || '').trim().toLowerCase();
    const filter = String(query.filter || 'all').trim().toLowerCase();
    return rows.filter((row) => {
      const availableCredit = Number(row.creditLimit || 0) - Number(row.balance || 0);
      if (filter === 'over-limit' && availableCredit >= 0) return false;
      if (filter === 'high-balance' && Number(row.balance || 0) < 1000) return false;
      if (!search) return true;
      return [row.name, row.phone].some((value) => String(value || '').toLowerCase().includes(search));
    });
  }

  function summarizeCustomerBalanceRows(rows) {
    return rows.reduce((summary, row) => {
      const balance = Number(row.balance || 0);
      const creditLimit = Number(row.creditLimit || 0);
      summary.totalItems += 1;
      summary.totalBalance += balance;
      if (creditLimit > 0 && balance > creditLimit) summary.overLimit += 1;
      if (balance >= 1000) summary.highBalance += 1;
      return summary;
    }, { totalItems: 0, totalBalance: 0, overLimit: 0, highBalance: 0 });
  }

  function queryCustomerBalanceRows(rows, query) {
    const filteredRows = filterCustomerBalanceRows(rows || [], query || {});
    const { rows: pagedRows, pagination } = paginateRows(filteredRows, query || {}, { pageSize: 10, maxPageSize: 100 });
    return {
      customers: pagedRows,
      pagination,
      summary: summarizeCustomerBalanceRows(filteredRows),
    };
  }

  function filterLedgerRows(rows, query) {
    const search = String(query.search || '').trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((row) => [row.entry_type, row.type, row.note, row.reference_type, row.referenceType, row.doc_no, row.created_at, row.date]
      .some((value) => String(value || '').toLowerCase().includes(search)));
  }

  function summarizeLedgerRows(rows) {
    return rows.reduce((summary, row) => {
      summary.totalItems += 1;
      summary.debitTotal += Number(row.debit || 0);
      summary.creditTotal += Number(row.credit || 0);
      summary.net += Number(row.amount || 0);
      summary.lastBalance = Number(row.balance_after ?? row.balanceAfter ?? summary.lastBalance ?? 0);
      return summary;
    }, { totalItems: 0, debitTotal: 0, creditTotal: 0, net: 0, lastBalance: 0 });
  }

  function queryLedgerRows(rows, query) {
    const filteredRows = filterLedgerRows(rows || [], query || {});
    const { rows: pagedRows, pagination } = paginateRows(filteredRows, query || {}, { pageSize: 20, maxPageSize: 100 });
    return {
      entries: pagedRows,
      pagination,
      summary: summarizeLedgerRows(filteredRows),
    };
  }


  function filterTreasuryRows(rows, query) {
    const search = String(query.search || '').trim().toLowerCase();
    const filter = String(query.filter || 'all').trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    return rows.filter((row) => {
      if (filter === 'in' && Number(row.amount || 0) <= 0) return false;
      if (filter === 'out' && Number(row.amount || 0) >= 0) return false;
      if (filter === 'expense' && String(row.txnType || row.type || '').toLowerCase() !== 'expense') return false;
      if (filter === 'today' && String(row.createdAt || row.date || '').slice(0, 10) !== today) return false;
      if (!search) return true;
      return [row.txnType, row.type, row.note, row.referenceType, row.createdByName, row.branchName, row.locationName]
        .some((value) => String(value || '').toLowerCase().includes(search));
    });
  }

  function summarizeTreasuryRows(rows) {
    return rows.reduce((summary, row) => {
      const amount = Number(row.amount || 0);
      if (amount > 0) summary.cashIn += amount;
      if (amount < 0) summary.cashOut += Math.abs(amount);
      summary.net += amount;
      return summary;
    }, { cashIn: 0, cashOut: 0, net: 0 });
  }

  function queryTreasuryRows(rows, query) {
    const filteredRows = filterTreasuryRows(rows || [], query || {});
    const { rows: pagedRows, pagination } = paginateRows(filteredRows, query || {}, { pageSize: 25, maxPageSize: 100 });
    return {
      treasury: pagedRows,
      pagination,
      summary: summarizeTreasuryRows(filteredRows),
    };
  }

  function filterAuditRows(rows, query) {
    const search = String(query.search || '').trim().toLowerCase();
    const mode = String(query.mode || 'all').trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    return rows.filter((row) => {
      const rowDate = String(row.createdAt || '').slice(0, 10);
      if (mode === 'today' && rowDate !== today) return false;
      if (mode === 'withdetails' && !String(row.details || '').trim()) return false;
      if (!search) return true;
      return [row.action, row.detailsSummary, row.details, row.createdByName].some((value) => String(value || '').toLowerCase().includes(search));
    });
  }

  function summarizeAuditRows(rows) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      distinctUsers: new Set(rows.map((row) => row.createdByName || 'guest')).size,
      todayCount: rows.filter((row) => String(row.createdAt || '').slice(0, 10) === today).length,
    };
  }

  function queryAuditRows(rows, query) {
    const filteredRows = filterAuditRows(rows || [], query || {});
    const { rows: pagedRows, pagination } = paginateRows(filteredRows, query || {}, { pageSize: 50, maxPageSize: 200 });
    return {
      auditLogs: pagedRows,
      pagination,
      summary: summarizeAuditRows(filteredRows),
    };
  }

  return {
    queryInventoryRows,
    queryCustomerBalanceRows,
    queryLedgerRows,
    queryTreasuryRows,
    queryAuditRows,
  };
}

module.exports = { buildReportQueryService };
