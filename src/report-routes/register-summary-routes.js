const { buildScopedRange, sendCsv, withReportError } = require('./common');

function buildSummaryCsvRows(payload) {
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
    { section: 'summary', metric: 'grossMarginPercent', value: summary.grossMarginPercent || 0 },
    { section: 'summary', metric: 'netOperatingProfit', value: summary.netOperatingProfit || 0 },
  ];
  topProducts.forEach((item, index) => rows.push({ section: 'top_product', metric: String(index + 1), value: item.name || '', qty: item.qty || 0, revenue: item.revenue || 0 }));
  return rows;
}

function registerSummaryRoutes({ app, authMiddleware, requirePermission, parseDateRange, buildDashboardOverview, reportSummary, csvFromRows }) {
  app.get('/api/dashboard/overview', authMiddleware, requirePermission('dashboard'), (req, res) => withReportError(res, 'Could not build dashboard overview', () => {
    res.json(buildDashboardOverview(buildScopedRange(parseDateRange, req.query || {})));
  }));

  app.get('/api/reports/summary', authMiddleware, requirePermission('reports'), (req, res) => withReportError(res, 'Could not build summary report', () => {
    res.json(reportSummary(buildScopedRange(parseDateRange, req.query || {})));
  }));

  app.get('/api/reports/summary.csv', authMiddleware, requirePermission('reports'), (req, res) => withReportError(res, 'Could not export summary report', () => {
    const payload = reportSummary(buildScopedRange(parseDateRange, req.query || {}));
    sendCsv(res, 'report-summary.csv', ['section', 'metric', 'value', 'qty', 'revenue'], buildSummaryCsvRows(payload), csvFromRows);
  }));
}

module.exports = { registerSummaryRoutes };
