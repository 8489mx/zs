import { Link } from 'react-router-dom';
import { FormSection } from '@/shared/components/form-section';
import { EmptyState } from '@/shared/ui/empty-state';
import { formatCurrency } from '@/lib/format';
import type { DashboardAlert } from '@/features/dashboard/lib/dashboard-page.utils';
import type { DashboardTopItem } from '@/features/dashboard/api/dashboard.types';

interface DashboardSummaryGridProps {
  todaySalesCount: number;
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
  todaySalesCount,
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
    <div className="page-stack">
      <FormSection title="ملخص التشغيل" className="dashboard-premium-card dashboard-card-compact dashboard-secondary-zone-card">
        <div className="metric-list">
          <div className="metric-row"><span>فواتير البيع اليوم</span><strong>{todaySalesCount}</strong></div>
          <div className="metric-row"><span>فواتير الشراء اليوم</span><strong>{todayPurchasesCount}</strong></div>
          <div className="metric-row"><span>مصروفات اليوم</span><strong>{formatCurrency(todayExpenses)}</strong></div>
          <div className="metric-row"><span>إجمالي المرتجعات</span><strong>{formatCurrency(returnsTotal)}</strong></div>
        </div>
      </FormSection>

      <FormSection title="تنبيهات المخزون والحسابات" className="dashboard-premium-card dashboard-card-compact dashboard-secondary-zone-card">
        <div className="dashboard-alert-grid">
          {alerts.map((alert) => (
            <div key={`${alert.title}-${alert.text}`} className={`alert-card ${alert.cls}`}>
              <strong>{alert.title}</strong>
              <div className="muted small">{alert.text}</div>
              <Link className="button button-secondary dashboard-alert-action" to={alertAction(alert).to}>{alertAction(alert).label}</Link>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="أعلى أصناف اليوم" className="dashboard-premium-card dashboard-card-compact dashboard-secondary-zone-card">
        {topToday.length ? (
          <div className="list-stack">
            {topToday.slice(0, 5).map((row) => (
              <div className="list-row" key={row.productId}>
                <div>
                  <strong>{row.name}</strong>
                  <div className="muted small">كمية اليوم: {row.qty}</div>
                </div>
                <strong>{formatCurrency(row.total)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد مبيعات اليوم بعد" hint="ابدأ من نقطة البيع لتسجيل أول فاتورة" className="dashboard-empty-state" />
        )}
      </FormSection>

      <FormSection title="الحسابات المستحقة والمخزون" className="dashboard-premium-card dashboard-card-compact dashboard-secondary-zone-card">
        <div className="metric-list">
          <div className="metric-row"><span>عدد الأصناف</span><strong>{productsCount}</strong></div>
          <div className="metric-row"><span>قيمة المخزون بالبيع</span><strong>{formatCurrency(inventorySaleValue)}</strong></div>
          <div className="metric-row"><span>العملاء عليهم</span><strong>{formatCurrency(customerDebt)}</strong></div>
          <div className="metric-row"><span>الموردين لهم</span><strong>{formatCurrency(supplierDebt)}</strong></div>
        </div>
      </FormSection>
    </div>
  );
}
