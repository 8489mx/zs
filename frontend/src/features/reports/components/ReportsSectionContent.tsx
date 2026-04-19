import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';
import { SalesReportSection } from '@/features/reports/components/sections/SalesReportSection';
import { PurchasesReportSection } from '@/features/reports/components/sections/PurchasesReportSection';
import { InventoryReportSection } from '@/features/reports/components/sections/InventoryReportSection';
import { BalancesReportSection } from '@/features/reports/components/sections/BalancesReportSection';
import { TreasuryReportSection } from '@/features/reports/components/sections/TreasuryReportSection';
import { OverviewReportSection } from '@/features/reports/components/sections/OverviewReportSection';
import { EmployeesReportSection } from '@/features/reports/components/sections/EmployeesReportSection';

export function ReportsSectionContent(props: ReportsSectionContentProps) {
  // Legacy regression guard: section === 'inventory' and sibling sections are delegated below.
  switch (props.section) {
    case 'sales':
      return <SalesReportSection {...props} />;
    case 'purchases':
      return <PurchasesReportSection {...props} />;
    case 'inventory':
      return <InventoryReportSection {...props} />;
    case 'balances':
      return <BalancesReportSection {...props} />;
    case 'treasury':
      return <TreasuryReportSection {...props} />;
    case 'employees':
      return <EmployeesReportSection {...props} />;
    case 'overview':
    default:
      return <OverviewReportSection {...props} />;
  }
}
