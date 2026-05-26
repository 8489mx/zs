import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
import { formatCurrency } from '@/lib/format';
import type { DashboardManagerOverviewPayload } from '@/features/dashboard/api/dashboard.types';

interface DashboardMonthlySnapshotProps {
  data?: DashboardManagerOverviewPayload;
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return 'غير متاح';
  const formatted = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(Number(value));
  return `${Number(value) > 0 ? '+' : ''}${formatted}%`;
}

export function DashboardMonthlySnapshot({ data }: DashboardMonthlySnapshotProps) {
  if (!data) return null;

  const hasMonthlyActivity = Number(data.salesLast30.count || 0) > 0
    || Number(data.salesLast30.total || 0) > 0
    || Number(data.profitSummary.netProfit || 0) !== 0;

  return (
    <Card
      title="لمحة شهرية مختصرة"
      description="أرقام كافية للاتجاه العام، والتفاصيل الكاملة مكانها التقارير."
      actions={<Link className="button button-secondary" to="/reports">عرض التقارير</Link>}
      className="dashboard-premium-card dashboard-card-compact dashboard-monthly-snapshot-card"
    >
      {hasMonthlyActivity ? (
        <div className="dashboard-monthly-snapshot-grid">
          <div className="manager-overview-metric">
            <span>مبيعات آخر 30 يوم</span>
            <strong>{formatCurrency(data.salesLast30.total)}</strong>
            <small>{formatPercent(data.salesLast30.comparisonPercent)} عن الفترة السابقة</small>
          </div>
          <div className="manager-overview-metric">
            <span>صافي الربح</span>
            <strong>{formatCurrency(data.profitSummary.netProfit)}</strong>
            <small>بعد تكلفة البضاعة والمصروفات</small>
          </div>
          <div className="manager-overview-metric">
            <span>متوسط الفاتورة</span>
            <strong>{formatCurrency(data.salesLast30.averageInvoice)}</strong>
            <small>{data.salesLast30.count} فاتورة في آخر 30 يوم</small>
          </div>
        </div>
      ) : (
        <div className="dashboard-inline-empty dashboard-monthly-empty">لا توجد بيانات شهرية كافية حاليًا.</div>
      )}
    </Card>
  );
}
