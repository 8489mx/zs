import { PageHeader } from '@/shared/components/page-header';
import { LoadingState } from '@/shared/ui/loading-state';
import { ErrorState } from '@/shared/ui/error-state';
import { CompactFirstRunSetupPrompt } from '@/shared/system/compact-first-run-setup-prompt';
import { FirstRunSetupChecklist } from '@/shared/system/first-run-setup-checklist';
import { useDashboardManagerOverview } from '@/features/dashboard/hooks/useDashboardManagerOverview';
import { useDashboardOverview } from '@/features/dashboard/hooks/useDashboardOverview';
import { useManagerActions } from '@/features/dashboard/hooks/useManagerActions';
import { DashboardHeroSection } from '@/features/dashboard/components/DashboardHeroSection';
import { DashboardSummaryGrid } from '@/features/dashboard/components/DashboardSummaryGrid';
import { DashboardDailyBrief } from '@/features/dashboard/components/DashboardDailyBrief';
import { DashboardDailyDecisionGrid } from '@/features/dashboard/components/DashboardDailyDecisionGrid';
import { DashboardCompactManagerActions } from '@/features/dashboard/components/DashboardCompactManagerActions';
import { DashboardMonthlySnapshot } from '@/features/dashboard/components/DashboardMonthlySnapshot';
import { ManagerNotificationsBell } from '@/features/dashboard/components/ManagerNotificationsBell';
import {
  buildDashboardAlerts,
  exportDashboardSnapshot,
  printDashboardSnapshot,
} from '@/features/dashboard/lib/dashboard-page.utils';

export function DashboardPage() {
  const overview = useDashboardOverview();
  const managerActions = useManagerActions(4);
  const managerOverview = useDashboardManagerOverview();

  if (overview.isLoading && !overview.data) {
    return (
      <div className="page-stack page-shell">
        <LoadingState title="جاري تحميل الرئيسية..." hint="نجهز لك مؤشرات البيع والمخزون والخزينة." className="status-surface-block" />
      </div>
    );
  }

  if (overview.isError && !overview.data) {
    return (
      <div className="page-stack page-shell">
        <ErrorState title="تعذر تحميل الرئيسية" error={overview.error} hint="تحقق من تشغيل الخادم أو أعد تحميل الصفحة." className="status-surface-block" />
      </div>
    );
  }

  if (!overview.data) return null;

  const { summary, stats, topToday, trends } = overview.data;
  const smartAlerts = buildDashboardAlerts(overview.data);

  return (
    <div className="page-stack dashboard-premium-shell dashboard-priority-shell">
      <PageHeader
        title="الرئيسية"
        description="لوحة تشغيل يومية مختصرة: راجع التنبيهات، مبيعات اليوم، الخزينة، وأهم ما يحتاج متابعة."
        badge={<span className="nav-pill">ملخص اليوم</span>}
        actions={(
          <div className="actions compact-actions dashboard-header-actions">
            <ManagerNotificationsBell />
            <button className="button button-secondary" onClick={() => exportDashboardSnapshot(overview.data)}>تصدير CSV</button>
            <button className="button button-secondary" onClick={() => printDashboardSnapshot(overview.data, smartAlerts)}>طباعة الملخص</button>
          </div>
        )}
      />

      <CompactFirstRunSetupPrompt />
      <FirstRunSetupChecklist />

      <DashboardDailyBrief
        insights={managerActions.data?.insights || []}
        salesTrend={trends.sales || []}
        purchasesTrend={trends.purchases || []}
        isLoading={managerActions.isLoading}
      />

      <DashboardCompactManagerActions
        insights={managerActions.data?.insights || []}
        isLoading={managerActions.isLoading}
        isError={managerActions.isError}
        error={managerActions.error}
      />

      <DashboardHeroSection
        todaySalesCount={Number(stats.todaySalesCount || 0)}
        todayPurchasesCount={Number(stats.todayPurchasesCount || 0)}
        activeOffers={Number(stats.activeOffers || 0)}
        todaySalesAmount={Number(stats.todaySalesAmount || 0)}
        treasuryNet={Number(summary.treasury.net || 0)}
        netOperatingProfit={Number(summary.commercial.netOperatingProfit || 0)}
      />

      <DashboardDailyDecisionGrid
        data={managerOverview.data}
        isLoading={managerOverview.isLoading}
        isError={managerOverview.isError}
        error={managerOverview.error}
      />

      <DashboardSummaryGrid
        todaySalesCount={Number(stats.todaySalesCount || 0)}
        todayPurchasesCount={Number(stats.todayPurchasesCount || 0)}
        todayExpenses={Number(summary.expenses.total || 0)}
        returnsTotal={Number(summary.returns.total || 0)}
        smartAlerts={smartAlerts}
        topToday={topToday}
        productsCount={Number(stats.productsCount || 0)}
        inventorySaleValue={Number(stats.inventorySaleValue || 0)}
        customerDebt={Number(stats.customerDebt || 0)}
        supplierDebt={Number(stats.supplierDebt || 0)}
      />

      <DashboardMonthlySnapshot data={managerOverview.data} />
    </div>
  );
}
