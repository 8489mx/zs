import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { ReportsSectionTabs } from '@/features/reports/pages/ReportsSectionTabs';
import { ReportsSectionContent } from '@/features/reports/components/ReportsSectionContent';
import { ReportsGuidanceStrip } from '@/features/reports/components/ReportsGuidanceStrip';
import { ReportsRangeCard } from '@/features/reports/components/ReportsRangeCard';
import { ReportsQuickOverviewCard } from '@/features/reports/components/ReportsQuickOverviewCard';
import { useReportsWorkspaceController } from '@/features/reports/hooks/useReportsWorkspaceController';
import type { ReportsSectionKey } from '@/features/reports/pages/reports.page-config';

// regression-marker: عدد الأصناف المطابقة
// regression-marker: عدد العملاء المطابقين
export function ReportsWorkspace({ currentSection }: { currentSection: ReportsSectionKey }) {
  const controller = useReportsWorkspaceController(currentSection);

  return (
    <div className="page-stack page-shell reports-workspace reports-animated-shell">
      <PageHeader
        title="التقارير"
        description={controller.sectionMeta.description}
        badge={<span className="nav-pill">{controller.rangeDays} يوم</span>}
        actions={<div className="actions compact-actions"><Button variant="secondary" onClick={controller.exportExecutiveSummary} disabled={!controller.report}>تصدير الملخص</Button><Button variant="secondary" onClick={controller.printExecutiveSummary} disabled={!controller.report}>طباعة الملخص</Button><Button variant="secondary" onClick={() => void controller.copyExecutiveSummary()} disabled={!controller.report}>نسخ الملخص</Button></div>}
      />

      <ReportsSectionTabs currentSection={currentSection} />

      <ReportsQuickOverviewCard
        spotlightCards={controller.spotlightCards}
        movementBars={controller.movementBars}
        report={controller.report}
        salesDailyAverage={controller.salesDailyAverage}
        totalCustomerBalance={controller.balancesQuery.data?.summary.totalBalance || 0}
      />

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
      />

      <ReportsGuidanceStrip cards={controller.sectionGuidanceCards} />

      <ReportsSectionContent
        section={currentSection}
        report={controller.report}
        reportQuery={controller.reportQuery}
        inventoryQuery={controller.inventoryQuery}
        balancesQuery={controller.balancesQuery}
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
        printLowStockList={controller.printLowStockList}
        printCustomerBalances={controller.printCustomerBalances}
        formatPercent={controller.formatPercent}
        inventorySearch={controller.inventorySearch}
        onInventorySearchChange={controller.onInventorySearchChange}
        inventoryFilter={controller.inventoryFilter}
        onInventoryFilterChange={controller.onInventoryFilterChange}
        onInventoryPageChange={controller.onInventoryPageChange}
        onInventoryPageSizeChange={controller.onInventoryPageSizeChange}
        balancesSearch={controller.balancesSearch}
        onBalancesSearchChange={controller.onBalancesSearchChange}
        balancesFilter={controller.balancesFilter}
        onBalancesFilterChange={controller.onBalancesFilterChange}
        onBalancesPageChange={controller.onBalancesPageChange}
        onBalancesPageSizeChange={controller.onBalancesPageSizeChange}
      />
    </div>
  );
}
