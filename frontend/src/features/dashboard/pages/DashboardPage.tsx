import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { LoadingState } from '@/shared/ui/loading-state';
import { ErrorState } from '@/shared/ui/error-state';
import { FirstRunSetupChecklist } from '@/shared/system/first-run-setup-checklist';
import { useDashboardManagerOverview } from '@/features/dashboard/hooks/useDashboardManagerOverview';
import { useDashboardOverview } from '@/features/dashboard/hooks/useDashboardOverview';
import { useManagerActions } from '@/features/dashboard/hooks/useManagerActions';
import { DashboardMetricCard } from '@/features/dashboard/components/DashboardMetricCard';
import { DashboardSummaryGrid } from '@/features/dashboard/components/DashboardSummaryGrid';
import { DashboardDailyBrief } from '@/features/dashboard/components/DashboardDailyBrief';
import { DashboardDailyDecisionGrid } from '@/features/dashboard/components/DashboardDailyDecisionGrid';
import { DashboardMonthlySnapshot } from '@/features/dashboard/components/DashboardMonthlySnapshot';
import {
  buildDashboardAlerts,
  exportDashboardSnapshot,
  formatInteger,
  printDashboardSnapshot,
} from '@/features/dashboard/lib/dashboard-page.utils';

export function DashboardPage() {
  const overview = useDashboardOverview();
  const managerActions = useManagerActions(4);
  const managerOverview = useDashboardManagerOverview();

  if (overview.isLoading && !overview.data) {
    return (
      <div className="page-stack page-shell" dir="rtl">
        <LoadingState title="جاري تحميل ملخص اليوم..." hint="نجهز لك مؤشرات المبيعات والخزينة والمخزون." className="status-surface-block" />
      </div>
    );
  }

  if (overview.isError && !overview.data) {
    return (
      <div className="page-stack page-shell" dir="rtl">
        <ErrorState title="تعذر تحميل ملخص اليوم" error={overview.error} hint="تحقق من اتصال النظام ثم أعد المحاولة." className="status-surface-block" />
      </div>
    );
  }

  if (!overview.data) return null;

  const { summary, stats, topToday } = overview.data;
  const smartAlerts = buildDashboardAlerts(overview.data);
  const quickActions = [
    { to: '/pos', label: 'نقطة البيع', hint: 'ابدأ تسجيل فاتورة' },
    { to: '/treasury', label: 'تسجيل مصروف', hint: 'متابعة مصروفات اليوم' },
    { to: '/inventory', label: 'مراجعة المخزون', hint: 'الأصناف المنخفضة والراكدة' },
    { to: '/reports', label: 'تقرير اليوم', hint: 'ملخص الأداء اليومي' },
  ];

  return (
    <div className="page-stack page-shell dashboard-premium-shell dashboard-priority-shell" dir="rtl">
      <main className="document-prototype-column" style={{ maxWidth: '1100px', paddingBottom: '100px' }}>
        <PageHeader
          title="ملخص اليوم"
          description="نظرة سريعة على المبيعات والخزينة والمخزون والتنبيهات المهمة."
          badge={<span className="nav-pill">Daily Summary</span>}
          actions={(
            <div className="actions compact-actions dashboard-header-actions">
              <button className="button button-secondary" onClick={() => exportDashboardSnapshot(overview.data)}>تصدير Excel</button>
              <button className="button button-secondary" onClick={() => printDashboardSnapshot(overview.data, smartAlerts)}>طباعة الملخص</button>
            </div>
          )}
        />

        <FirstRunSetupChecklist />

        {/* 1. المؤشرات الرئيسية - الأهم */}
        <FormSection title="مؤشرات اليوم" description="أهم أرقام التشغيل دفعة واحدة بدون تمرير أو بحث." actions={<span className="nav-pill">KPIs</span>}>
          <section className="dashboard-daily-kpi-grid dashboard-primary-kpi-grid" aria-label="ملخص التشغيل">
            <DashboardMetricCard label="مبيعات اليوم" value={Number(stats.todaySalesAmount || 0)} helper="إجمالي البيع المسجل اليوم" tone="primary" />
            <DashboardMetricCard label="عدد فواتير اليوم" value={Number(stats.todaySalesCount || 0)} helper="عدد فواتير البيع" tone="success" formatter={formatInteger} />
            <DashboardMetricCard label="صافي الخزينة" value={Number(summary.treasury.net || 0)} helper="الوضع النقدي الحالي" tone={Number(summary.treasury.net || 0) >= 0 ? 'success' : 'danger'} />
            <DashboardMetricCard label="مصروفات اليوم" value={Number(summary.expenses.total || 0)} helper="إجمالي المصروفات" tone="warning" />
            <DashboardMetricCard label="تنبيهات المخزون" value={Number(overview.data.summary.lowStockCount || 0) + Number(overview.data.summary.outOfStockCount || 0)} helper="أصناف نافدة أو منخفضة" tone={(Number(overview.data.summary.lowStockCount || 0) + Number(overview.data.summary.outOfStockCount || 0)) > 0 ? 'danger' : 'success'} formatter={formatInteger} />
          </section>
        </FormSection>

        {/* 2. إجراءات سريعة */}
        <FormSection title="إجراءات سريعة" description="اختصارات للانتقال الفوري إلى أكثر الأقسام استخدامًا." actions={<span className="nav-pill">Quick Actions</span>}>
          <section className="dashboard-quick-actions-grid" aria-label="إجراءات سريعة">
            {quickActions.map((action) => (
              <Link key={action.to} className="dashboard-quick-action" to={action.to}>
                <strong>{action.label}</strong>
                <span>{action.hint}</span>
              </Link>
            ))}
          </section>
        </FormSection>

        {/* 3. الملخص التنفيذي السريع - تنبيهات عاجلة */}
        <DashboardDailyBrief
          insights={managerActions.data?.insights || []}
          isLoading={managerActions.isLoading}
        />

        {/* 4. قرارات تحتاج مراجعة */}
        <FormSection title="قرارات تحتاج مراجعة" description="أهم ما يجب اتخاذ قرار فيه اليوم بناءً على حركة المخزون والعملاء والربحية." actions={<span className="nav-pill">Action Center</span>}>
          <DashboardDailyDecisionGrid
            data={managerOverview.data}
            isLoading={managerOverview.isLoading}
            isError={managerOverview.isError}
            error={managerOverview.error}
          />
        </FormSection>

        {/* 5. ملخص التشغيل والتنبيهات والأصناف */}
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

        {/* 6. اللمحة الشهرية - الأقل إلحاحًا */}
        <DashboardMonthlySnapshot data={managerOverview.data} />
      </main>
    </div>
  );
}
