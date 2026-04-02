const { sendCsv, withReportError } = require('./common');

function registerLedgerRoutes({ app, authMiddleware, requirePermission, customerBalanceReport, customerLedgerReport, supplierLedgerReport, reportQueryService, csvFromRows }) {
  app.get('/api/reports/customer-balances', authMiddleware, requirePermission('reports'), (req, res) => {
    const rows = customerBalanceReport();
    const query = req.query || {};
    if (query.page || query.pageSize || query.search || query.filter) {
      return res.json(reportQueryService.queryCustomerBalanceRows(rows, query));
    }
    return res.json({ customers: rows });
  });

  app.get('/api/reports/customer-balances.csv', authMiddleware, requirePermission('reports'), (req, res) => {
    const rows = customerBalanceReport().map((item) => ({
      id: item.id,
      name: item.name,
      phone: item.phone || '',
      balance: item.balance || 0,
      creditLimit: item.creditLimit || 0,
      availableCredit: item.availableCredit || 0,
    }));
    sendCsv(res, 'report-customer-balances.csv', ['id', 'name', 'phone', 'balance', 'creditLimit', 'availableCredit'], rows, csvFromRows);
  });

  app.get('/api/reports/customers/:id/ledger', authMiddleware, requirePermission('reports'), (req, res) => withReportError(res, 'Could not build customer ledger', () => {
    const payload = customerLedgerReport(Number(req.params.id || 0));
    const query = req.query || {};
    if (query.page || query.pageSize || query.search) {
      return res.json({ customer: payload.customer, ...reportQueryService.queryLedgerRows(payload.entries || [], query) });
    }
    return res.json(payload);
  }));

  app.get('/api/reports/customers/:id/ledger.csv', authMiddleware, requirePermission('reports'), (req, res) => withReportError(res, 'Could not export customer ledger', () => {
    const payload = customerLedgerReport(Number(req.params.id || 0));
    const rows = (payload.entries || []).map((entry) => ({
      customer: payload.customer?.name || '',
      date: entry.created_at || entry.date || '',
      docNo: entry.doc_no || '',
      entryType: entry.entry_type || '',
      note: entry.note || '',
      debit: entry.debit || 0,
      credit: entry.credit || 0,
      balanceAfter: entry.balance_after || 0,
    }));
    sendCsv(res, `customer-ledger-${req.params.id}.csv`, ['customer', 'date', 'docNo', 'entryType', 'note', 'debit', 'credit', 'balanceAfter'], rows, csvFromRows);
  }));

  app.get('/api/reports/suppliers/:id/ledger', authMiddleware, requirePermission('reports'), (req, res) => withReportError(res, 'Could not build supplier ledger', () => {
    const payload = supplierLedgerReport(Number(req.params.id || 0));
    const query = req.query || {};
    if (query.page || query.pageSize || query.search) {
      return res.json({ supplier: payload.supplier, ...reportQueryService.queryLedgerRows(payload.entries || [], query) });
    }
    return res.json(payload);
  }));

  app.get('/api/reports/suppliers/:id/ledger.csv', authMiddleware, requirePermission('reports'), (req, res) => withReportError(res, 'Could not export supplier ledger', () => {
    const payload = supplierLedgerReport(Number(req.params.id || 0));
    const rows = (payload.entries || []).map((entry) => ({
      supplier: payload.supplier?.name || '',
      date: entry.created_at || entry.date || '',
      docNo: entry.doc_no || '',
      entryType: entry.entry_type || '',
      note: entry.note || '',
      debit: entry.debit || 0,
      credit: entry.credit || 0,
      balanceAfter: entry.balance_after || 0,
    }));
    sendCsv(res, `supplier-ledger-${req.params.id}.csv`, ['supplier', 'date', 'docNo', 'entryType', 'note', 'debit', 'credit', 'balanceAfter'], rows, csvFromRows);
  }));
}

module.exports = { registerLedgerRoutes };
