function registerAdminRoutes(deps) {
  const {
    app,
    authMiddleware,
    adminOnly,
    requireAnyPermission,
    buildDiagnostics,
    buildMaintenanceReport,
    buildSupportSnapshot,
    buildLaunchReadiness,
    buildUatReadiness,
    buildOperationalReadiness,
    cleanupExpiredSessions,
    reconcileAllBalances,
    reconcileCustomerBalances,
    reconcileSupplierBalances,
    relationalCustomers,
    relationalSuppliers,
    addAuditLog,
  } = deps;

  app.get('/api/admin/diagnostics', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    res.json(buildDiagnostics());
  });

  app.get('/api/admin/maintenance-report', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    res.json(buildMaintenanceReport());
  });

  app.get('/api/admin/support-snapshot', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    res.json(buildSupportSnapshot());
  });

  app.get('/api/admin/launch-readiness', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    res.json(buildLaunchReadiness());
  });

  app.get('/api/admin/uat-readiness', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    res.json(buildUatReadiness());
  });

  app.post('/api/admin/maintenance/cleanup-expired-sessions', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    const result = cleanupExpiredSessions();
    addAuditLog('تنظيف الجلسات المنتهية', `تم حذف ${result.deletedSessions} جلسة منتهية`, req.user.id);
    res.json(result);
  });

  app.post('/api/admin/maintenance/reconcile-balances', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    const result = reconcileAllBalances();
    addAuditLog('مطابقة الأرصدة مع الدفاتر', `تم تحديث ${result.updatedTotal} رصيد (عملاء وموردين)`, req.user.id);
    res.json({ ...result, customers: relationalCustomers(), suppliers: relationalSuppliers(), maintenance: buildMaintenanceReport(), readiness: buildLaunchReadiness() });
  });

  app.post('/api/admin/maintenance/reconcile-customers', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    const result = reconcileCustomerBalances();
    addAuditLog('مطابقة أرصدة العملاء', `تم تحديث ${result.updated} عميل من دفتر الحركة`, req.user.id);
    res.json({ ...result, customers: relationalCustomers(), maintenance: buildMaintenanceReport(), readiness: buildLaunchReadiness() });
  });

  app.post('/api/admin/maintenance/reconcile-suppliers', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    const result = reconcileSupplierBalances();
    addAuditLog('مطابقة أرصدة الموردين', `تم تحديث ${result.updated} مورد من دفتر الحركة`, req.user.id);
    res.json({ ...result, suppliers: relationalSuppliers(), maintenance: buildMaintenanceReport(), readiness: buildLaunchReadiness() });
  });

  app.get('/api/admin/operational-readiness', authMiddleware, adminOnly, requireAnyPermission(['canManageSettings', 'settings']), (req, res) => {
    try {
      res.json(buildOperationalReadiness());
    } catch (err) {
      res.status(500).json({ error: err.message || 'Could not build operational readiness report' });
    }
  });
}

function registerHealthRoute(deps) {
  const { app, config, buildDiagnostics, logger } = deps;
  app.get('/api/health', (req, res) => {
    try {
      const diagnostics = buildDiagnostics();
      const payload = {
        ok: true,
        service: 'z-systems-pos',
        database: 'up',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
      };
      if (config.healthExposeDetails) {
        payload.version = diagnostics.version;
        payload.security = {
          legacyStateWriteEnabled: config.allowLegacyStateWrite,
          sameOriginProtection: config.enforceSameOriginWrites
        };
        payload.logging = {
          enabled: config.requestLogging,
          level: config.logLevel,
          format: config.logFormat
        };
        payload.databaseFile = diagnostics.database.file;
      }
      res.json(payload);
    } catch (err) {
      logger.warn('health_check_failed', { error: err });
      res.status(503).json({ ok: false, service: 'z-systems-pos', database: 'down', error: err.message || 'Health check failed' });
    }
  });
}

module.exports = { registerAdminRoutes, registerHealthRoute };
