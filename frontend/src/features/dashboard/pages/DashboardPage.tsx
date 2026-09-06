import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { LoadingState } from '@/shared/ui/loading-state';
import { ErrorState } from '@/shared/ui/error-state';
import { FirstRunSetupChecklist } from '@/shared/system/first-run-setup-checklist';
import { SmartDemoOnboardingBanner } from '@/shared/system/SmartDemoOnboardingBanner';
import { useDashboardManagerOverview } from '@/features/dashboard/hooks/useDashboardManagerOverview';
import { useDashboardOverview } from '@/features/dashboard/hooks/useDashboardOverview';
import { useManagerActions } from '@/features/dashboard/hooks/useManagerActions';
import { DashboardExecutiveHero } from '@/features/dashboard/components/DashboardExecutiveHero';
import { ExecutiveBiGrid } from '@/features/dashboard/components/ExecutiveBiGrid';
import { DashboardDailyBrief } from '@/features/dashboard/components/DashboardDailyBrief';
import { DashboardDailyDecisionGrid } from '@/features/dashboard/components/DashboardDailyDecisionGrid';
import { formatCurrency } from '@/lib/format';
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
  const totalStockAlerts = Number(overview.data.summary.lowStockCount || 0) + Number(overview.data.summary.outOfStockCount || 0);

  return (
    <div className="page-stack page-shell dashboard-premium-shell" dir="rtl">
      <main className="document-prototype-column" style={{ width: '100%', paddingBottom: '100px' }}>
        <PageHeader
          title="لوحة التحكم اليومية"
          description="مؤشرات الأداء المباشرة، القرارات المطلوبة، وحركة المبيعات والخزينة اليومية."
          badge={<span className="nav-pill">ملخص اليوم</span>}
          actions={(
            <div className="actions compact-actions dashboard-header-actions">
              <button className="button button-secondary" onClick={() => exportDashboardSnapshot(overview.data)}>تصدير Excel</button>
              <button className="button button-secondary" onClick={() => printDashboardSnapshot(overview.data, smartAlerts)}>طباعة الملخص</button>
            </div>
          )}
        />

        <FirstRunSetupChecklist />
        <SmartDemoOnboardingBanner />

        {/* 1. البانر التنفيذي والترحيب الذكي */}
        <DashboardExecutiveHero
          salesTrend={overview.data.trends?.sales}
          purchasesTrend={overview.data.trends?.purchases}
          todaySalesAmount={Number(stats.todaySalesAmount || 0)}
          todaySalesCount={Number(stats.todaySalesCount || 0)}
          treasuryNet={Number(summary.treasury.net || 0)}
          totalStockAlerts={totalStockAlerts}
        />

        {/* 2. لوحات ذكاء الأعمال والرسوم البيانية المتقدمة (Executive BI Charts) */}
        <ExecutiveBiGrid
          overviewData={overview.data}
          managerData={managerOverview.data}
          isLoading={managerOverview.isLoading}
        />

        {/* 3. الهيكل الثنائي المتوازن للداشبورد */}
        <div className="dashboard-balanced-grid">
          
          {/* العمود الرئيسي (الأيمن) */}
          <div className="page-stack" style={{ gap: '16px' }}>
            {/* مركز اتخاذ القرارات التفاعلي */}
            <DashboardDailyDecisionGrid
              data={managerOverview.data}
              topSuppliers={overview.data.topSuppliers}
              totalSupplierDebt={Number(stats.supplierDebt || 0)}
              isLoading={managerOverview.isLoading}
              isError={managerOverview.isError}
              error={managerOverview.error}
            />

            {/* أعلى الأصناف مبيعاً اليوم */}
            <FormSection title="أعلى أصناف اليوم مبيعاً" description="الأصناف الأكثر طلباً وحركة خلال فواتير اليوم." actions={<span className="nav-pill">اليوم</span>} className="dashboard-premium-card">
              {topToday.length ? (
                <div className="list-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                  {topToday.slice(0, 4).map((row) => (
                    <div className="list-row" key={row.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <div>
                        <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{row.name}</strong>
                        <div className="muted small" style={{ fontSize: '0.74rem', color: '#64748b' }}>مباع اليوم: {row.qty}</div>
                      </div>
                      <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{formatCurrency(row.total)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', fontSize: '0.84rem' }}>
                  لا توجد مبيعات مسجلة اليوم بعد
                </div>
              )}
            </FormSection>
          </div>

          {/* العمود الجانبي (الأيسر) */}
          <div className="page-stack" style={{ gap: '16px' }}>
            {/* الموجز التنفيذي والتنبيهات العاجلة */}
            <DashboardDailyBrief
              insights={managerActions.data?.insights || []}
              isLoading={managerActions.isLoading}
            />

            {/* الحسابات المستحقة والمخزون - شبكة ثنائية 2x2 */}
            <FormSection title="الحسابات والمخزون" description="مؤشرات مديونيات العملاء والموردين وقيمة المخزون." className="dashboard-premium-card">
              <div className="metric-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#475569' }}>قيمة المخزون (بيع)</span>
                  <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{formatCurrency(Number(stats.inventorySaleValue || 0))}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#475569' }}>إجمالي الأصناف</span>
                  <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{stats.productsCount || 0} صنف</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#475569' }}>مستحقات العملاء</span>
                  <strong style={{ fontSize: '0.86rem', color: '#b91c1c' }}>{formatCurrency(Number(stats.customerDebt || 0))}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#475569' }}>مستحقات الموردين</span>
                  <strong style={{ fontSize: '0.86rem', color: '#b91c1c' }}>{formatCurrency(Number(stats.supplierDebt || 0))}</strong>
                </div>
              </div>
            </FormSection>

            {/* حركة العمليات اليومية - 3 في سطر واحد */}
            <FormSection title="حركة اليوم المالية" description="المصروفات والمشتريات والمرتجعات المسجلة." className="dashboard-premium-card">
              <div className="metric-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>فواتير الشراء</span>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{stats.todayPurchasesCount || 0}</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>مصروفات اليوم</span>
                  <strong style={{ fontSize: '0.9rem', color: '#d97706' }}>{formatCurrency(Number(summary.expenses.total || 0))}</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>المرتجعات</span>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{formatCurrency(Number(summary.returns.total || 0))}</strong>
                </div>
              </div>
            </FormSection>
          </div>
        </div>
      </main>
    </div>
  );
}
