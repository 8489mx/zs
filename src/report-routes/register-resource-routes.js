const { respondReportError } = require('./shared');

function registerResourceRoutes({ app, authMiddleware, requirePermission, inventoryReport, customerBalanceReport, customerLedgerReport, supplierLedgerReport, reportQueryService, relationalTreasury, relationalAuditLogs }) {
  app.get('/api/reports/inventory', authMiddleware, requirePermission('reports'), (req, res) => {
    const payload = inventoryReport();
    const query = req.query || {};
    if (query.page || query.pageSize || query.search || query.filter) {
      return res.json(reportQueryService.queryInventoryRows(Array.isArray(payload.items) ? payload.items : [], query));
    }
    res.json(payload);
  });

  app.get('/api/reports/customer-balances', authMiddleware, requirePermission('reports'), (req, res) => {
    const rows = customerBalanceReport();
    const query = req.query || {};
    if (query.page || query.pageSize || query.search || query.filter) {
      return res.json(reportQueryService.queryCustomerBalanceRows(rows, query));
    }
    res.json({ customers: rows });
  });

  app.get('/api/reports/customers/:id/ledger', authMiddleware, requirePermission('reports'), (req, res) => {
    try {
      const payload = customerLedgerReport(Number(req.params.id || 0));
      const query = req.query || {};
      if (query.page || query.pageSize || query.search) {
        return res.json({ customer: payload.customer, ...reportQueryService.queryLedgerRows(payload.entries || [], query) });
      }
      res.json(payload);
    } catch (err) {
      respondReportError(res, err, 'Could not build customer ledger');
    }
  });

  app.get('/api/reports/suppliers/:id/ledger', authMiddleware, requirePermission('reports'), (req, res) => {
    try {
      const payload = supplierLedgerReport(Number(req.params.id || 0));
      const query = req.query || {};
      if (query.page || query.pageSize || query.search) {
        return res.json({ supplier: payload.supplier, ...reportQueryService.queryLedgerRows(payload.entries || [], query) });
      }
      res.json(payload);
    } catch (err) {
      respondReportError(res, err, 'Could not build supplier ledger');
    }
  });

  app.get('/api/treasury-transactions', authMiddleware, requirePermission('treasury'), (req, res) => {
    res.json(reportQueryService.queryTreasuryRows(relationalTreasury() || [], req.query || {}));
  });

  app.get('/api/audit-logs', authMiddleware, requirePermission('audit'), (req, res) => {
    res.json(reportQueryService.queryAuditRows(relationalAuditLogs() || [], req.query || {}));
  });
}

module.exports = { registerResourceRoutes };
