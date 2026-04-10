import { PageHeader } from '@/shared/components/page-header';
import { SpotlightCardStrip } from '@/shared/components/spotlight-card-strip';
import { LoadingState } from '@/shared/ui/loading-state';
import { ErrorState } from '@/shared/ui/error-state';
import { CompactFirstRunSetupPrompt } from '@/shared/system/compact-first-run-setup-prompt';
import { FirstRunSetupChecklist } from '@/shared/system/first-run-setup-checklist';
import { useDashboardOverview } from '@/features/dashboard/hooks/useDashboardOverview';
import { DashboardHeroSection } from '@/features/dashboard/components/DashboardHeroSection';
import { DashboardMetricsSection } from '@/features/dashboard/components/DashboardMetricsSection';
import { DashboardSummaryGrid } from '@/features/dashboard/components/DashboardSummaryGrid';
import { DashboardOperationalGrid } from '@/features/dashboard/components/DashboardOperationalGrid';
import { DashboardRelationshipGrid } from '@/features/dashboard/components/DashboardRelationshipGrid';
import { DashboardTrendsGrid } from '@/features/dashboard/components/DashboardTrendsGrid';
import {
  buildDashboardAlerts,
  exportDashboardSnapshot,
  formatShortDate,
  printDashboardSnapshot,
} from '@/features/dashboard/lib/dashboard-page.utils';

export function DashboardPage() {
  const overview = useDashboardOverview();

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

  const { summary, stats, lowStock, topToday, topCustomers, topSuppliers, trends } = overview.data;
  const smartAlerts = buildDashboardAlerts(overview.data);
  const salesTrend = (trends.sales || []).map((row) => ({ ...row, label: formatShortDate(row.key) }));
  const purchasesTrend = (trends.purchases || []).map((row) => ({ ...row, label: formatShortDate(row.key) }));
  const focusCards = [
    { key: 'start', label: 'ابدأ من', value: Number(stats.todaySalesCount || 0) ? 'ملخص اليوم' : 'تنبيه البداية' },
    { key: 'sell', label: 'الرقم الأهم الآن', value: `${Number(stats.todaySalesCount || 0)} بيع اليوم` },
    { key: 'stock', label: 'راقب بعده', value: `${lowStock.length} أصناف تحتاج متابعة` },
    { key: 'cash', label: 'ثم راجع', value: `صافي الخزينة ${Number(summary.treasury.net || 0)}` },
  ];

  return (
    <div className="page-stack dashboard-premium-shell">
      <PageHeader
        title="الرئيسية"
        description="نظرة سريعة على البيع والربح والخزينة والمخزون في مكان واحد."
        badge={<span className="nav-pill">ملخص اليوم</span>}
        actions={(
          <div className="actions compact-actions">
            <button className="button button-secondary" onClick={() => exportDashboardSnapshot(overview.data)}>تصدير CSV</button>
            <button className="button button-secondary" onClick={() => printDashboardSnapshot(overview.data, smartAlerts)}>طباعة الملخص</button>
          </div>
        )}
      />

      <CompactFirstRunSetupPrompt />
      <FirstRunSetupChecklist />
      <SpotlightCardStrip cards={focusCards} ariaLabel="أولوية المشاهدة في الرئيسية" />

      <DashboardHeroSection
        todaySalesCount={Number(stats.todaySalesCount || 0)}
        todayPurchasesCount={Number(stats.todayPurchasesCount || 0)}
        activeOffers={Number(stats.activeOffers || 0)}
        todaySalesAmount={Number(stats.todaySalesAmount || 0)}
        treasuryNet={Number(summary.treasury.net || 0)}
        netOperatingProfit={Number(summary.commercial.netOperatingProfit || 0)}
      />

      <DashboardSummaryGrid
        todaySalesCount={Number(stats.todaySalesCount || 0)}
        todayPurchasesCount={Number(stats.todayPurchasesCount || 0)}
        todayExpenses={Number(summary.expenses.total || 0)}
        returnsTotal={Number(summary.returns.total || 0)}
        smartAlerts={smartAlerts}
        topToday={topToday}
      />

      <DashboardMetricsSection
        productsCount={Number(stats.productsCount || 0)}
        todayPurchasesAmount={Number(stats.todayPurchasesAmount || 0)}
        inventoryCost={Number(stats.inventoryCost || 0)}
        inventorySaleValue={Number(stats.inventorySaleValue || 0)}
        customerDebt={Number(stats.customerDebt || 0)}
        supplierDebt={Number(stats.supplierDebt || 0)}
      />

      <DashboardOperationalGrid
        nearCreditLimit={Number(stats.nearCreditLimit || 0)}
        aboveCreditLimit={Number(stats.aboveCreditLimit || 0)}
        highSupplierBalances={Number(stats.highSupplierBalances || 0)}
        customersCount={Number(stats.customersCount || 0)}
        suppliersCount={Number(stats.suppliersCount || 0)}
        cashIn={Number(summary.treasury.cashIn || 0)}
        cashOut={Number(summary.treasury.cashOut || 0)}
        treasuryNet={Number(summary.treasury.net || 0)}
        grossProfit={Number(summary.commercial.grossProfit || 0)}
      />

      <DashboardRelationshipGrid lowStock={lowStock} topCustomers={topCustomers} topSuppliers={topSuppliers} />

      <DashboardTrendsGrid
        salesTrend={salesTrend}
        purchasesTrend={purchasesTrend}
        customersCount={Number(stats.customersCount || 0)}
        suppliersCount={Number(stats.suppliersCount || 0)}
        expensesTotal={Number(summary.expenses.total || 0)}
        returnsCount={Number(summary.returns.count || 0)}
      />
    </div>
  );
}
