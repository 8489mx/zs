import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { ReportsSectionTabs } from '@/features/reports/pages/ReportsSectionTabs';
import { ReportsSectionContent } from '@/features/reports/components/ReportsSectionContent';
import { ReportsRangeCard } from '@/features/reports/components/ReportsRangeCard';
import { useReportsWorkspaceController } from '@/features/reports/hooks/useReportsWorkspaceController';
import type { ReportsSectionKey } from '@/features/reports/pages/reports.page-config';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { referenceDataApi } from '@/services/reference-data.api';

export function ReportsWorkspace({ currentSection }: { currentSection: ReportsSectionKey }) {
  const controller = useReportsWorkspaceController(currentSection);
  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: referenceDataApi.locations });

  return (
    <div className="page-stack page-shell reports-workspace reports-animated-shell reports-workspace--compact" dir="rtl">
      <main className="document-prototype-column" style={{ maxWidth: '1100px', paddingBottom: '100px' }}>
      <PageHeader
        title="التقارير"
        description="اختر القسم والفترة ثم راجع التقرير مباشرة بدون صفوف تمهيدية إضافية."
        badge={<span className="nav-pill">{controller.rangeDays} يوم</span>}
        actions={(
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={controller.exportExecutiveSummary} disabled={!controller.report}>تصدير الملخص</Button>
            <Button variant="secondary" onClick={controller.printExecutiveSummary} disabled={!controller.report}>طباعة الملخص</Button>
            <Button variant="secondary" onClick={() => void controller.copyExecutiveSummary()} disabled={!controller.report}>نسخ الملخص</Button>
          </div>
        )}
      />

      <ReportsSectionTabs currentSection={currentSection} />

      <ReportsRangeCard
        from={controller.from}
        to={controller.to}
        onFromChange={controller.setFrom}
        onToChange={controller.setTo}
        onApply={controller.applyRange}
        onPresetToday={controller.applyTodayPreset}
        onPreset7={() => controller.applyPreset(7)}
        onPreset30={() => controller.applyPreset(30)}
        onReset={controller.resetRange}
        healthRows={controller.reportHealthRows}
        locationId={controller.locationId}
        onLocationChange={controller.setLocationId}
        locations={locationsQuery.data}
      />

      <ReportsSectionContent
        section={currentSection}
        report={controller.report}
        reportQuery={controller.reportQuery}
        accountingFinancialSummary={controller.accountingFinancialSummary}
        accountingCashMovement={controller.accountingCashMovement}
        accountingReceivablesPayables={controller.accountingReceivablesPayables}
        accountingInventoryValue={controller.accountingInventoryValue}
        inventoryQuery={controller.inventoryQuery}
        balancesQuery={controller.balancesQuery}
        employeesQuery={controller.employeesQuery}
        executiveRows={controller.executiveRows}
        operatingSignalRows={controller.operatingSignalRows}
        topProducts={controller.topProducts}
        rangeDays={controller.rangeDays}
        salesDailyAverage={controller.salesDailyAverage}
        purchaseDailyAverage={controller.purchaseDailyAverage}
        returnRatePercent={controller.returnRatePercent}
        exportTopProducts={controller.exportTopProducts}
        printTopProducts={controller.printTopProducts}
        exportLowStock={controller.exportLowStock}
        exportCustomerBalances={controller.exportCustomerBalances}
        printInventoryValueReport={controller.printInventoryValueReport}
        printInventoryMovementsReport={controller.printInventoryMovementsReport}
        locationId={controller.locationId}
        printCustomerBalances={controller.printCustomerBalances}
        formatPercent={controller.formatPercent}
        inventorySearch={controller.inventorySearch}
        onInventorySearchChange={controller.onInventorySearchChange}
        inventoryFilter={controller.inventoryFilter}
        onInventoryFilterChange={controller.onInventoryFilterChange}
        onInventoryPageChange={controller.onInventoryPageChange}
        onInventoryPageSizeChange={controller.onInventoryPageSizeChange}
        onInventoryFiltersReset={controller.onInventoryFiltersReset}
        balancesSearch={controller.balancesSearch}
        onBalancesSearchChange={controller.onBalancesSearchChange}
        balancesFilter={controller.balancesFilter}
        onBalancesFilterChange={controller.onBalancesFilterChange}
        onBalancesPageChange={controller.onBalancesPageChange}
        onBalancesPageSizeChange={controller.onBalancesPageSizeChange}
        onBalancesFiltersReset={controller.onBalancesFiltersReset}
        employeeSearch={controller.employeeSearch}
        onEmployeeSearchChange={controller.onEmployeeSearchChange}
        selectedEmployeeId={controller.selectedEmployeeId}
        onSelectedEmployeeIdChange={controller.onSelectedEmployeeIdChange}
        employeeRole={controller.employeeRole}
        onEmployeeRoleChange={controller.onEmployeeRoleChange}
        employeeActivityType={controller.employeeActivityType}
        onEmployeeActivityTypeChange={controller.onEmployeeActivityTypeChange}
        onEmployeesPageChange={controller.onEmployeesPageChange}
        onEmployeesPageSizeChange={controller.onEmployeesPageSizeChange}
        onEmployeesFiltersReset={controller.onEmployeesFiltersReset}
      />
      </main>
    </div>
  );
}
