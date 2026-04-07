import { Card } from '@/shared/ui/card';
import { formatCurrency } from '@/lib/format';

interface DashboardOperationalGridProps {
  nearCreditLimit: number;
  aboveCreditLimit: number;
  highSupplierBalances: number;
  customersCount: number;
  suppliersCount: number;
  cashIn: number;
  cashOut: number;
  treasuryNet: number;
  grossProfit: number;
}

export function DashboardOperationalGrid({
  nearCreditLimit,
  aboveCreditLimit,
  highSupplierBalances,
  customersCount,
  suppliersCount,
  cashIn,
  cashOut,
  treasuryNet,
  grossProfit,
}: DashboardOperationalGridProps) {
  return (
    <section className="dashboard-content-grid dashboard-content-grid-wide">
      <Card title="مؤشرات الإدارة" className="dashboard-premium-card dashboard-card-compact">
        <div className="metric-list">
          <div className="metric-row"><span>قربوا من الحد</span><strong>{nearCreditLimit}</strong></div>
          <div className="metric-row"><span>تجاوزوا الحد</span><strong>{aboveCreditLimit}</strong></div>
          <div className="metric-row"><span>موردون رصيدهم كبير</span><strong>{highSupplierBalances}</strong></div>
          <div className="metric-row"><span>إجمالي العملاء</span><strong>{customersCount}</strong></div>
          <div className="metric-row"><span>إجمالي الموردين</span><strong>{suppliersCount}</strong></div>
        </div>
      </Card>

      <Card title="ملخص السيولة" className="dashboard-premium-card dashboard-card-compact">
        <div className="metric-list">
          <div className="metric-row"><span>الوارد النقدي</span><strong>{formatCurrency(cashIn)}</strong></div>
          <div className="metric-row"><span>المنصرف النقدي</span><strong>{formatCurrency(cashOut)}</strong></div>
          <div className="metric-row"><span>رصيد الخزينة</span><strong>{formatCurrency(treasuryNet)}</strong></div>
          <div className="metric-row"><span>الربح الإجمالي</span><strong>{formatCurrency(grossProfit)}</strong></div>
        </div>
      </Card>
    </section>
  );
}
