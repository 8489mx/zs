function buildReportRouteContext(runtime, services) {
  return {
    app: runtime.app,
    authMiddleware: services.authMiddleware,
    requirePermission: runtime.requirePermission,
    parseDateRange: services.parseDateRange,
    reportSummary: services.accountingReportingService.reportSummary,
    inventoryReport: services.accountingReportingService.inventoryReport,
    customerBalanceReport: services.accountingReportingService.customerBalanceReport,
    customerLedgerReport: services.accountingReportingService.customerLedgerReport,
    supplierLedgerReport: services.accountingReportingService.supplierLedgerReport,
    relationalTreasury: services.relationalReadModels.relationalTreasury,
    relationalAuditLogs: services.relationalReadModels.relationalAuditLogs,
    buildDashboardOverview: services.dashboardOverviewService.buildDashboardOverview,
    csvFromRows: services.diagnostics.csvFromRows,
  };
}

function buildAdminRouteContext(runtime, services) {
  return {
    app: runtime.app,
    authMiddleware: services.authMiddleware,
    adminOnly: services.adminOnly,
    requireAnyPermission: runtime.requireAnyPermission,
    buildDiagnostics: services.diagnostics.buildDiagnostics,
    buildMaintenanceReport: services.diagnostics.buildMaintenanceReport,
    buildSupportSnapshot: services.diagnostics.buildSupportSnapshot,
    buildLaunchReadiness: services.diagnostics.buildLaunchReadiness,
    buildUatReadiness: services.diagnostics.buildUatReadiness,
    buildOperationalReadiness: services.diagnostics.buildOperationalReadiness,
    cleanupExpiredSessions: services.diagnostics.cleanupExpiredSessions,
    reconcileAllBalances: services.diagnostics.reconcileAllBalances,
    reconcileCustomerBalances: services.diagnostics.reconcileCustomerBalances,
    reconcileSupplierBalances: services.diagnostics.reconcileSupplierBalances,
    relationalCustomers: services.relationalReadModels.relationalCustomers,
    relationalSuppliers: services.relationalReadModels.relationalSuppliers,
    addAuditLog: services.supporting.addAuditLog,
  };
}

function buildHealthRouteContext(runtime, services) {
  return {
    app: runtime.app,
    config: runtime.config,
    buildDiagnostics: services.diagnostics.buildDiagnostics,
    logger: runtime.logger,
  };
}

module.exports = { buildReportRouteContext, buildAdminRouteContext, buildHealthRouteContext };
