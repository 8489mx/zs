import { Card } from '@/shared/ui/card';
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
  const alerts = smartAlerts.length ? smartAlerts : [{ cls: 'alert-info', title: 'الوضع مستقر', text: 'لا توجد تنبيهات حرجة حاليًا' }];

  return (
    <section className="dashboard-content-grid dashboard-content-grid-summary-merged">
      <Card title="ملخص اليوم" className="dashboard-premium-card dashboard-card-compact">
        <div className="metric-list">
          <div className="metric-row"><span>فواتير البيع اليوم</span><strong>{todaySalesCount}</strong></div>
          <div className="metric-row"><span>فواتير الشراء اليوم</span><strong>{todayPurchasesCount}</strong></div>
          <div className="metric-row"><span>مصروفات الفترة</span><strong>{formatCurrency(todayExpenses)}</strong></div>
          <div className="metric-row"><span>إجمالي المرتجعات</span><strong>{formatCurrency(returnsTotal)}</strong></div>
        </div>
      </Card>

      <Card title="تنبيهات سريعة" className="dashboard-premium-card dashboard-card-compact">
        <div className="dashboard-alert-grid">
          {alerts.map((alert) => (
            <div key={`${alert.title}-${alert.text}`} className={`alert-card ${alert.cls}`}>
              <strong>{alert.title}</strong>
              <div className="muted small">{alert.text}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="أعلى أصناف اليوم" className="dashboard-premium-card dashboard-card-compact">
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
          <EmptyState title="لا توجد حركة بيع اليوم" hint="ستظهر هنا أعلى الأصناف مبيعًا بمجرد تسجيل مبيعات اليوم." className="dashboard-empty-state" />
        )}
      </Card>

      <Card title="المخزون والذمم" className="dashboard-premium-card dashboard-card-compact">
        <div className="metric-list">
          <div className="metric-row"><span>عدد الأصناف</span><strong>{productsCount}</strong></div>
          <div className="metric-row"><span>قيمة المخزون بالبيع</span><strong>{formatCurrency(inventorySaleValue)}</strong></div>
          <div className="metric-row"><span>ديون العملاء</span><strong>{formatCurrency(customerDebt)}</strong></div>
          <div className="metric-row"><span>ديون الموردين</span><strong>{formatCurrency(supplierDebt)}</strong></div>
        </div>
      </Card>
    </section>
  );
}
