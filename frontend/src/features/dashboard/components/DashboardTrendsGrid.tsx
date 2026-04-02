import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/format';

interface DashboardTrendRow {
  key: string;
  label: string;
  value: number;
}

interface DashboardTrendsGridProps {
  salesTrend: DashboardTrendRow[];
  purchasesTrend: DashboardTrendRow[];
  customersCount: number;
  suppliersCount: number;
  expensesTotal: number;
  returnsCount: number;
}

function TrendList({ title, rows }: { title: string; rows: DashboardTrendRow[] }) {
  const maxValue = Math.max(...rows.map((row) => row.value), 0);

  return (
    <Card title={title} className="dashboard-premium-card dashboard-trend-card">
      <div className="list-stack">
        {rows.map((row) => (
          <div key={row.key} className="list-row stacked-row dashboard-trend-row">
            <div>
              <strong>{row.label}</strong>
              <div className="muted small">{formatCurrency(row.value)}</div>
            </div>
            <div className="dashboard-mini-bar-wrap">
              <div className="dashboard-mini-bar-track">
                <div
                  className="dashboard-mini-bar-fill"
                  style={{ width: `${maxValue ? Math.max(10, Math.round((row.value / maxValue) * 100)) : 0}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DashboardTrendsGrid({
  salesTrend,
  purchasesTrend,
  customersCount,
  suppliersCount,
  expensesTotal,
  returnsCount,
}: DashboardTrendsGridProps) {
  return (
    <section className="dashboard-content-grid">
      <TrendList title="المبيعات اليومية · آخر 7 أيام" rows={salesTrend} />
      <TrendList title="المشتريات اليومية · آخر 7 أيام" rows={purchasesTrend} />
      <Card title="ملخص الذمم" className="dashboard-premium-card dashboard-card-compact">
        <div className="metric-list">
          <div className="metric-row"><span>العملاء</span><strong>{customersCount}</strong></div>
          <div className="metric-row"><span>الموردون</span><strong>{suppliersCount}</strong></div>
          <div className="metric-row"><span>المصروفات</span><strong>{formatCurrency(expensesTotal)}</strong></div>
          <div className="metric-row"><span>عدد المرتجعات</span><strong>{returnsCount}</strong></div>
        </div>
      </Card>
    </section>
  );
}
