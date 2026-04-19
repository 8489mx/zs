import type { Customer, ReportSummary } from '@/types/domain';
import type { EmployeeReportRow, EmployeeReportsSummary, ReportInventoryRow } from '@/features/reports/api/reports.api';
import type { ReportsSectionKey } from '@/features/reports/pages/reports.page-config';

export type PagedQuery<TSummary, TRow> = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data?: {
    rows: TRow[];
    summary: TSummary;
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      rangeStart: number;
      rangeEnd: number;
    };
  };
};

export type ReportsSectionContentProps = {
  section: ReportsSectionKey;
  report: ReportSummary | null | undefined;
  reportQuery: { isLoading: boolean; isError: boolean; error: unknown };
  inventoryQuery: PagedQuery<{ totalItems: number; outOfStock: number; lowStock: number; healthy: number; trackedLocations?: number; locationHighlights?: Array<{ locationId: string; locationName: string; branchId?: string; branchName?: string; totalQty: number; trackedProducts: number; attentionItems: number; lowStockItems: number; outOfStockItems: number }> }, ReportInventoryRow>;
  balancesQuery: PagedQuery<{ totalItems: number; totalBalance: number; overLimit: number; highBalance: number }, Customer>;
  executiveRows: Array<[string, number]>;
  operatingSignalRows: Array<{ label: string; value: string }>;
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  rangeDays: number;
  salesDailyAverage: number;
  purchaseDailyAverage: number;
  returnRatePercent: number;
  exportTopProducts: () => void | Promise<void>;
  printTopProducts: () => void | Promise<void>;
  exportLowStock: () => void | Promise<void>;
  exportCustomerBalances: () => void | Promise<void>;
  printLowStockList: () => void | Promise<void>;
  printCustomerBalances: () => void | Promise<void>;
  formatPercent: (value: number) => string;
  inventorySearch: string;
  onInventorySearchChange: (value: string) => void;
  inventoryFilter: 'all' | 'attention' | 'low' | 'out';
  onInventoryFilterChange: (value: 'all' | 'attention' | 'low' | 'out') => void;
  onInventoryPageChange: (page: number) => void;
  onInventoryPageSizeChange: (pageSize: number) => void;
  balancesSearch: string;
  onBalancesSearchChange: (value: string) => void;
  balancesFilter: 'all' | 'high-balance' | 'over-limit';
  onBalancesFilterChange: (value: 'all' | 'high-balance' | 'over-limit') => void;
  onBalancesPageChange: (page: number) => void;
  onBalancesPageSizeChange: (pageSize: number) => void;

  employeesQuery: PagedQuery<EmployeeReportsSummary, EmployeeReportRow>;
  employeeSearch: string;
  onEmployeeSearchChange: (value: string) => void;
  selectedEmployeeId: string;
  onSelectedEmployeeIdChange: (value: string) => void;
  employeeRole: 'all' | 'super_admin' | 'admin' | 'cashier';
  onEmployeeRoleChange: (value: 'all' | 'super_admin' | 'admin' | 'cashier') => void;
  employeeActivityType: 'all' | 'sales' | 'returns' | 'purchases' | 'expenses' | 'shifts' | 'audit';
  onEmployeeActivityTypeChange: (value: 'all' | 'sales' | 'returns' | 'purchases' | 'expenses' | 'shifts' | 'audit') => void;
  onEmployeesPageChange: (page: number) => void;
  onEmployeesPageSizeChange: (pageSize: number) => void;
  onEmployeesFiltersReset: () => void;
  onInventoryFiltersReset: () => void;
  onBalancesFiltersReset: () => void;
};
