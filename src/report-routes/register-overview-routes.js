const { buildScopedRange, respondReportError } = require('./shared');

function registerOverviewRoutes({ app, authMiddleware, requirePermission, parseDateRange, buildDashboardOverview, reportSummary }) {
  app.get('/api/dashboard/overview', authMiddleware, requirePermission('dashboard'), (req, res) => {
    try {
      res.json(buildDashboardOverview(buildScopedRange(parseDateRange, req.query || {})));
    } catch (err) {
      respondReportError(res, err, 'Could not build dashboard overview');
    }
  });

  app.get('/api/reports/summary', authMiddleware, requirePermission('reports'), (req, res) => {
    try {
      res.json(reportSummary(buildScopedRange(parseDateRange, req.query || {})));
    } catch (err) {
      respondReportError(res, err, 'Could not build summary report');
    }
  });
}

module.exports = { registerOverviewRoutes };
