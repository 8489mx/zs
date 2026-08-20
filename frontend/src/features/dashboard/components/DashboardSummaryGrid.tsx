import { Link } from 'react-router-dom';
import { FormSection } from '@/shared/components/form-section';
import { EmptyState } from '@/shared/ui/empty-state';
import { formatCurrency } from '@/lib/format';
import type { DashboardAlert } from '@/features/dashboard/lib/dashboard-page.utils';
import type { DashboardTopItem } from '@/features/dashboard/api/dashboard.types';

interface DashboardSummaryGridProps {
  todaySalesCount?: number;
  todayPurchasesCount: number;
  todayExpenses: number;
  returnsTotal: number;
  smartAlerts: DashboardAlert[];
  topToday: DashboardTopItem[];
  productsCount: number;
  inventorySaleValue: number;
  customerDebt: number;
  supplierDebt: number;
}

export function DashboardSummaryGrid({
  todayPurchasesCount,
  todayExpenses,
  returnsTotal,
  smartAlerts,
  topToday,
  productsCount,
  inventorySaleValue,
  customerDebt,
  supplierDebt,
}: DashboardSummaryGridProps) {
  const alerts = smartAlerts.length
    ? smartAlerts
    : [{ cls: 'alert-info', title: 'الوضع مستقر', text: 'لا توجد تنبيهات مخزون حاليًا' }];

  const alertAction = (alert: DashboardAlert) => {
    if (alert.title.includes('مخزون')) return { to: '/inventory', label: 'راجع المخزون' };
    if (alert.title.includes('الائتمان')) return { to: '/customers', label: 'كشف العملاء' };
    if (alert.title.includes('مورد')) return { to: '/suppliers', label: 'كشف الموردين' };
    if (alert.title.includes('عروض')) return { to: '/products', label: 'راجع الأصناف' };
    return { to: '/reports', label: 'مراجعة التفاصيل' };
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginBottom: '16px' }}>
      <FormSection title="أعلى أصناف اليوم مبيعاً" className="dashboard-premium-card dashboard-card-compact dashboard-secondary-zone-card">
        {topToday.length ? (
          <div className="list-stack">
            {topToday.slice(0, 5).map((row) => (
              <div className="list-row" key={row.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{row.name}</strong>
                  <div className="muted small">كمية اليوم: {row.qty}</div>
                </div>
                <strong style={{ color: '#0f172a' }}>{formatCurrency(row.total)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد مبيعات اليوم بعد" hint="ابدأ من نقطة البيع لتسجيل أول فاتورة" className="dashboard-empty-state" />
        )}
      </FormSection>

      <FormSection title="تنبيهات المخزون والائتمان" className="dashboard-premium-card dashboard-card-compact dashboard-secondary-zone-card">
        <div className="dashboard-alert-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.map((alert) => (
            <div key={`${alert.title}-${alert.text}`} className={`alert-card ${alert.cls}`} style={{ padding: '10px 12px', borderRadius: '8px' }}>
              <strong>{alert.title}</strong>
              <div className="muted small">{alert.text}</div>
              <Link className="button button-secondary dashboard-alert-action" to={alertAction(alert).to} style={{ marginTop: '6px', display: 'inline-block' }}>{alertAction(alert).label}</Link>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="الحسابات المستحقة والمخزون" className="dashboard-premium-card dashboard-card-compact dashboard-secondary-zone-card">
        <div className="metric-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}><span>عدد الأصناف الإجمالي</span><strong>{productsCount}</strong></div>
          <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}><span>قيمة المخزون بالبيع</span><strong>{formatCurrency(inventorySaleValue)}</strong></div>
          <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}><span>مستحقات على العملاء</span><strong style={{ color: '#b91c1c' }}>{formatCurrency(customerDebt)}</strong></div>
          <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span>مستحقات للموردين</span><strong style={{ color: '#b91c1c' }}>{formatCurrency(supplierDebt)}</strong></div>
        </div>
      </FormSection>

      <FormSection title="حركة العمليات اليومية" className="dashboard-premium-card dashboard-card-compact dashboard-secondary-zone-card">
        <div className="metric-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}><span>فواتير الشراء اليوم</span><strong>{todayPurchasesCount}</strong></div>
          <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}><span>مصروفات اليوم</span><strong>{formatCurrency(todayExpenses)}</strong></div>
          <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span>إجمالي المرتجعات</span><strong>{formatCurrency(returnsTotal)}</strong></div>
        </div>
      </FormSection>
    </div>
  );
}
