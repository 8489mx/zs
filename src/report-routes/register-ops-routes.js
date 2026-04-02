function registerOpsRoutes({ app, authMiddleware, requirePermission, relationalTreasury, relationalAuditLogs, reportQueryService }) {
  app.get('/api/treasury-transactions', authMiddleware, requirePermission('treasury'), (req, res) => {
    res.json(reportQueryService.queryTreasuryRows(relationalTreasury() || [], req.query || {}));
  });

  app.get('/api/audit-logs', authMiddleware, requirePermission('audit'), (req, res) => {
    res.json(reportQueryService.queryAuditRows(relationalAuditLogs() || [], req.query || {}));
  });
}

module.exports = { registerOpsRoutes };
