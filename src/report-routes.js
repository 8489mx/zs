const { buildReportQueryService } = require('./report-query-service');

function sendCsv(res, filename, headers, rows, csvFromRows) {
  const csv = csvFromRows(headers, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + csv);
}

function registerReportRoutes(deps) {
  const {
    app,
    authMiddleware,
    requirePermission,
    parseDateRange,
    reportSummary,
    inventoryReport,
    customerBalanceReport,
    customerLedgerReport,
    supplierLedgerReport,
    relationalTreasury,
    relationalAuditLogs,
    buildDashboardOverview,
    csvFromRows,
  } = deps;

  const reportQueryService = buildReportQueryService();

  app.get('/api/dashboard/overview', authMiddleware, requirePermission('dashboard'), (req, res) => {
    try {
      const range = Object.assign({}, parseDateRange(req.query || {}), {
        branchId: req.query && req.query.branchId ? String(req.query.branchId) : '',
        locationId: req.query && req.query.locationId ? String(req.query.locationId) : '',
      });
      res.json(buildDashboardOverview(range));
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message || 'Could not build dashboard overview' });
    }
  });

  app.get('/api/reports/summary', authMiddleware, requirePermission('reports'), (req, res) => {
    try {
      const range = Object.assign({}, parseDateRange(req.query || {}), {
        branchId: req.query && req.query.branchId ? String(req.query.branchId) : '',
        locationId: req.query && req.query.locationId ? String(req.query.locationId) : '',
      });
      res.json(reportSummary(range));
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message || 'Could not build summary report' });
    }
  });

  app.get('/api/reports/summary.csv', authMiddleware, requirePermission('reports'), (req, res) => {
    try {
      const payload = reportSummary(Object.assign({}, parseDateRange(req.query || {}), {
        branchId: req.query && req.query.branchId ? String(req.query.branchId) : '',
        locationId: req.query && req.query.locationId ? String(req.query.locationId) : '',
      }));
      const summary = payload.summary || {};
      const topProducts = Array.isArray(payload.topProducts) ? payload.topProducts.slice(0, 20) : [];
      const rows = [
        { section: 'summary', metric: 'from', value: payload.range?.from || '' },
        { section: 'summary', metric: 'to', value: payload.range?.to || '' },
        { section: 'summary', metric: 'salesCount', value: summary.salesCount || 0 },
        { section: 'summary', metric: 'salesTotal', value: summary.salesTotal || 0 },
        { section: 'summary', metric: 'purchasesCount', value: summary.purchasesCount || 0 },
        { section: 'summary', metric: 'purchasesTotal', value: summary.purchasesTotal || 0 },
        { section: 'summary', metric: 'expensesTotal', value: summary.expensesTotal || 0 },
        { section: 'summary', metric: 'returnsTotal', value: summary.returnsTotal || 0 },
        { section: 'summary', metric: 'cashIn', value: summary.cashIn || 0 },
        { section: 'summary', metric: 'cashOut', value: summary.cashOut || 0 },
        { section: 'summary', metric: 'netCashFlow', value: summary.netCashFlow || 0 },
        { section: 'summary', metric: 'grossProfit', value: summary.grossProfit || 0 },
        { section: 'summary', metric: 'cogs', value: summary.cogs || 0 },
        { section: 'summary', metric: 'grossProfit', value: summary.grossProfit || 0 },
        { section: 'summary', metric: 'grossMarginPercent', value: summary.grossMarginPercent || 0 },
        { section: 'summary', metric: 'netOperatingProfit', value: summary.netOperatingProfit || 0 },
      ];
      topProducts.forEach((item, index) => rows.push({ section: 'top_product', metric: String(index + 1), value: item.name || '', qty: item.qty || 0, revenue: item.revenue || 0 }));
      sendCsv(res, 'report-summary.csv', ['section', 'metric', 'value', 'qty', 'revenue'], rows, csvFromRows);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message || 'Could not export summary report' });
    }
  });

  app.get('/api/reports/inventory', authMiddleware, requirePermission('reports'), (req, res) => {
    const payload = inventoryReport();
    const query = req.query || {};
    if (query.page || query.pageSize || query.search || query.filter) {
      return res.json(reportQueryService.queryInventoryRows(Array.isArray(payload.items) ? payload.items : [], query));
    }
    res.json(payload);
  });

  app.get('/api/reports/inventory.csv', authMiddleware, requirePermission('reports'), (req, res) => {
    const payload = inventoryReport();
    const items = Array.isArray(payload.items) ? payload.items : [];
    const rows = items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.categoryName || '',
      supplier: item.supplierName || '',
      stockQty: item.stockQty || 0,
      minStock: item.minStock || 0,
      retailPrice: item.retailPrice || 0,
      costPrice: item.costPrice || 0,
      status: item.status || '',
    }));
    sendCsv(res, 'report-inventory.csv', ['id', 'name', 'category', 'supplier', 'stockQty', 'minStock', 'retailPrice', 'costPrice', 'status'], rows, csvFromRows);
  });

  app.get('/api/reports/customer-balances', authMiddleware, requirePermission('reports'), (req, res) => {
    const rows = customerBalanceReport();
    const query = req.query || {};
    if (query.page || query.pageSize || query.search || query.filter) {
      return res.json(reportQueryService.queryCustomerBalanceRows(rows, query));
    }
    res.json({ customers: rows });
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

  app.get('/api/reports/customers/:id/ledger', authMiddleware, requirePermission('reports'), (req, res) => {
    try {
      const payload = customerLedgerReport(Number(req.params.id || 0));
      const query = req.query || {};
      if (query.page || query.pageSize || query.search) {
        return res.json({ customer: payload.customer, ...reportQueryService.queryLedgerRows(payload.entries || [], query) });
      }
      res.json(payload);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message || 'Could not build customer ledger' });
    }
  });

  app.get('/api/reports/customers/:id/ledger.csv', authMiddleware, requirePermission('reports'), (req, res) => {
    try {
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
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message || 'Could not export customer ledger' });
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
      res.status(err.statusCode || 400).json({ error: err.message || 'Could not build supplier ledger' });
    }
  });

  app.get('/api/reports/suppliers/:id/ledger.csv', authMiddleware, requirePermission('reports'), (req, res) => {
    try {
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
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message || 'Could not export supplier ledger' });
    }
  });

  app.get('/api/treasury-transactions', authMiddleware, requirePermission('treasury'), (req, res) => {
    res.json(reportQueryService.queryTreasuryRows(relationalTreasury() || [], req.query || {}));
  });

  app.get('/api/audit-logs', authMiddleware, requirePermission('audit'), (req, res) => {
    res.json(reportQueryService.queryAuditRows(relationalAuditLogs() || [], req.query || {}));
  });
}

module.exports = { registerReportRoutes };
