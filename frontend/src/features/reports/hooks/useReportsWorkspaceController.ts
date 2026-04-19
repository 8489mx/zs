import { useReportsOverview } from '@/features/reports/hooks/useReportsOverview';
import { useReportInventoryPage } from '@/features/reports/hooks/useReportInventoryPage';
import { useCustomerBalancesPage } from '@/features/reports/hooks/useCustomerBalancesPage';
import { useEmployeeReportsPage } from '@/features/reports/hooks/useEmployeeReportsPage';
import { useReportsWorkspaceActions } from '@/features/reports/hooks/useReportsWorkspaceActions';
import { useReportsWorkspaceMetrics } from '@/features/reports/hooks/useReportsWorkspaceMetrics';
import { useReportsWorkspaceState } from '@/features/reports/hooks/useReportsWorkspaceState';
import type { ReportsSectionKey } from '@/features/reports/pages/reports.page-config';
import { formatPercent } from '@/features/reports/lib/reports-format';

export function useReportsWorkspaceController(currentSection: ReportsSectionKey) {
  const state = useReportsWorkspaceState();
  const { reportQuery } = useReportsOverview(state.submittedRange.from, state.submittedRange.to);
  const inventoryQuery = useReportInventoryPage({ page: state.inventoryPage, pageSize: state.inventoryPageSize, search: state.inventorySearch, filter: state.inventoryFilter });
  const balancesQuery = useCustomerBalancesPage({ page: state.balancesPage, pageSize: state.balancesPageSize, search: state.balancesSearch, filter: state.balancesFilter });
  const employeesQuery = useEmployeeReportsPage({
    page: state.employeesPage,
    pageSize: state.employeesPageSize,
    search: state.employeeSearch,
    userId: state.selectedEmployeeId || undefined,
    role: state.employeeRole,
    activityType: state.employeeActivityType,
    from: state.submittedRange.from,
    to: state.submittedRange.to,
  });

  const report = reportQuery.data ?? null;
  const metrics = useReportsWorkspaceMetrics({
    currentSection,
    submittedRange: state.submittedRange,
    report,
    inventoryQuery,
    balancesQuery,
  });
  const actions = useReportsWorkspaceActions({
    report,
    submittedRange: state.submittedRange,
    rangeDays: metrics.rangeDays,
    executiveRows: metrics.executiveRows,
    topProducts: metrics.topProducts,
    inventorySearch: state.inventorySearch,
    inventoryFilter: state.inventoryFilter,
    balancesSearch: state.balancesSearch,
    balancesFilter: state.balancesFilter,
  });

  return {
    report,
    reportQuery,
    inventoryQuery,
    balancesQuery,
    employeesQuery,
    from: state.from,
    to: state.to,
    rangeDays: metrics.rangeDays,
    executiveRows: metrics.executiveRows,
    reportHealthRows: metrics.reportHealthRows,
    operatingSignalRows: metrics.operatingSignalRows,
    topProducts: metrics.topProducts,
    salesDailyAverage: metrics.salesDailyAverage,
    purchaseDailyAverage: metrics.purchaseDailyAverage,
    returnRatePercent: metrics.returnRatePercent,
    spotlightCards: metrics.spotlightCards,
    movementBars: metrics.movementBars,
    sectionMeta: metrics.sectionMeta,
    sectionGuidanceCards: metrics.sectionGuidanceCards,
    inventorySearch: state.inventorySearch,
    inventoryFilter: state.inventoryFilter,
    balancesSearch: state.balancesSearch,
    balancesFilter: state.balancesFilter,
    setFrom: state.setFrom,
    setTo: state.setTo,
    applyPreset: state.applyPresetDays,
    applyTodayPreset: state.applyTodayPreset,
    resetRange: state.resetRange,
    applyRange: () => state.setSubmittedRange({ from: state.from, to: state.to }),
    onInventorySearchChange: (value: string) => { state.setInventorySearch(value); state.setInventoryPage(1); },
    onInventoryFilterChange: (value: 'all' | 'attention' | 'low' | 'out') => { state.setInventoryFilter(value); state.setInventoryPage(1); },
    onInventoryPageChange: state.setInventoryPage,
    onInventoryPageSizeChange: (value: number) => { state.setInventoryPageSize(value); state.setInventoryPage(1); },

    onInventoryFiltersReset: () => { state.setInventorySearch(''); state.setInventoryFilter('attention'); state.setInventoryPage(1); },
    onBalancesFiltersReset: () => { state.setBalancesSearch(''); state.setBalancesFilter('all'); state.setBalancesPage(1); },
    onEmployeesFiltersReset: () => {
      state.setEmployeeSearch('');
      state.setSelectedEmployeeId('');
      state.setEmployeeRole('all');
      state.setEmployeeActivityType('all');
      state.setEmployeesPage(1);
    },
    onBalancesSearchChange: (value: string) => { state.setBalancesSearch(value); state.setBalancesPage(1); },
    onBalancesFilterChange: (value: 'all' | 'high-balance' | 'over-limit') => { state.setBalancesFilter(value); state.setBalancesPage(1); },
    onBalancesPageChange: state.setBalancesPage,
    onBalancesPageSizeChange: (value: number) => { state.setBalancesPageSize(value); state.setBalancesPage(1); },
    employeeSearch: state.employeeSearch,
    selectedEmployeeId: state.selectedEmployeeId,
    employeeRole: state.employeeRole,
    employeeActivityType: state.employeeActivityType,
    onEmployeeSearchChange: (value: string) => { state.setEmployeeSearch(value); state.setEmployeesPage(1); },
    onSelectedEmployeeIdChange: (value: string) => { state.setSelectedEmployeeId(value); state.setEmployeesPage(1); },
    onEmployeeRoleChange: (value: 'all' | 'super_admin' | 'admin' | 'cashier') => { state.setEmployeeRole(value); state.setEmployeesPage(1); },
    onEmployeeActivityTypeChange: (value: 'all' | 'sales' | 'returns' | 'purchases' | 'expenses' | 'shifts' | 'audit') => { state.setEmployeeActivityType(value); state.setEmployeesPage(1); },
    onEmployeesPageChange: state.setEmployeesPage,
    onEmployeesPageSizeChange: (value: number) => { state.setEmployeesPageSize(value); state.setEmployeesPage(1); },
    formatPercent,
    ...actions,
  };
}
