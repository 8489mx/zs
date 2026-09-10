import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { LoadingState } from '@/shared/ui/loading-state';
import { ErrorState } from '@/shared/ui/error-state';
import { FirstRunSetupChecklist } from '@/shared/system/first-run-setup-checklist';
import { TenantQuickStartChecklist } from '@/shared/system/TenantQuickStartChecklist';
import { SmartDemoOnboardingBanner } from '@/shared/system/SmartDemoOnboardingBanner';
import { useDashboardManagerOverview } from '@/features/dashboard/hooks/useDashboardManagerOverview';
import { useDashboardOverview } from '@/features/dashboard/hooks/useDashboardOverview';
import { useManagerActions } from '@/features/dashboard/hooks/useManagerActions';
import { DashboardExecutiveHero } from '@/features/dashboard/components/DashboardExecutiveHero';
import { ExecutiveBiGrid } from '@/features/dashboard/components/ExecutiveBiGrid';
import { DashboardDailyBrief } from '@/features/dashboard/components/DashboardDailyBrief';
import { DashboardDailyDecisionGrid } from '@/features/dashboard/components/DashboardDailyDecisionGrid';
import { formatCurrency } from '@/lib/format';
import { useHasFeature } from '@/shared/hooks/use-permission';
import { useAuthStore } from '@/stores/auth-store';
import { isPlatformAdmin } from '@/app/router/access';
import {
  buildDashboardAlerts,
  exportDashboardSnapshot,
  printDashboardSnapshot,
} from '@/features/dashboard/lib/dashboard-page.utils';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isMasterDeveloperUser = user?.role === 'super_admin' && String(user?.username || '').trim().toLowerCase() === 'zs';
  const isPlatformAdminUser = isPlatformAdmin(user) || isMasterDeveloperUser;
  const hasReportsFeature = useHasFeature('reports') || isPlatformAdminUser;

  if (!hasReportsFeature) {
    return <Navigate to="/pos" replace />;
  }

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
            <div className="actions compact-actions dashboard-header-actions" aria-label="إجراءات سريعة">
              <button className="button button-secondary" onClick={() => exportDashboardSnapshot(overview.data)}>تصدير Excel</button>
              <button className="button button-secondary" onClick={() => printDashboardSnapshot(overview.data, smartAlerts)}>طباعة الملخص</button>
            </div>
          )}
        />

        <FirstRunSetupChecklist />
        <TenantQuickStartChecklist />
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
                <div
                  className="top-selling-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '8px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {topToday.slice(0, 4).map((row, index) => (
                    <div
                      className="list-row top-selling-item"
                      key={row.productId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '22px',
                            height: '22px',
                            borderRadius: '6px',
                            background: index === 0 ? '#170e5e' : '#e2e8f0',
                            color: index === 0 ? '#ffffff' : '#475569',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong
                            title={row.name}
                            style={{
                              fontSize: '0.82rem',
                              color: '#0f172a',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.35,
                            }}
                          >
                            {row.name}
                          </strong>
                          <div className="muted small" style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                            مباع اليوم: <span style={{ fontWeight: 700, color: '#334155' }}>{row.qty}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'left', flexShrink: 0 }}>
                        <strong style={{ color: '#170e5e', fontSize: '0.88rem', fontWeight: 800, whiteSpace: 'nowrap', display: 'block' }}>
                          {formatCurrency(row.total)}
                        </strong>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>ج.م</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', fontSize: '0.84rem' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                {/* الصف الأول */}
                <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>قيمة المخزون (بيع)</span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatCurrency(Number(stats.inventorySaleValue || 0))}
                    </strong>
                  </div>
                  <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>إجمالي الأصناف</span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {stats.productsCount || 0} صنف
                    </strong>
                  </div>
                </div>

                {/* الصف الثاني */}
                <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>مستحقات العملاء</span>
                    <strong style={{ fontSize: '0.88rem', color: '#b91c1c', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatCurrency(Number(stats.customerDebt || 0))}
                    </strong>
                  </div>
                  <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>مستحقات الموردين</span>
                    <strong style={{ fontSize: '0.88rem', color: '#b91c1c', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatCurrency(Number(stats.supplierDebt || 0))}
                    </strong>
                  </div>
                </div>
              </div>
            </FormSection>

            {/* حركة العمليات اليومية - 3 في سطر واحد دائماً */}
            <FormSection title="حركة اليوم المالية" description="المصروفات والمشتريات والمرتجعات المسجلة." className="dashboard-premium-card">
              <div
                className="daily-movement-strip keep-grid-row"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'stretch',
                  gap: '6px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 4px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>فواتير الشراء</span>
                  <strong style={{ fontSize: '0.98rem', color: '#0f172a', fontWeight: 800, whiteSpace: 'nowrap' }}>{stats.todayPurchasesCount || 0}</strong>
                </div>
                <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 4px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>مصروفات اليوم</span>
                  <strong style={{ fontSize: '0.98rem', color: '#d97706', fontWeight: 800, whiteSpace: 'nowrap' }}>{formatCurrency(Number(summary.expenses.total || 0))}</strong>
                </div>
                <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 4px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>المرتجعات</span>
                  <strong style={{ fontSize: '0.98rem', color: '#0f172a', fontWeight: 800, whiteSpace: 'nowrap' }}>{formatCurrency(Number(summary.returns.total || 0))}</strong>
                </div>
              </div>
            </FormSection>
          </div>
        </div>
      </main>
    </div>
  );
}
