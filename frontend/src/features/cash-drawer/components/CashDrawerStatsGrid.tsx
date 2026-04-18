import { formatCurrency } from '@/lib/format';

interface CashDrawerStatsGridProps {
  totalItems: number;
  openShiftCount: number;
  openShiftLabel?: string;
  totalVariance: number;
}

export function CashDrawerStatsGrid(props: CashDrawerStatsGridProps) {
  return (
    <div className="stats-grid compact-grid">
      <div className="stat-card"><span>إجمالي الورديات</span><strong>{props.totalItems}</strong></div>
      <div className="stat-card"><span>ورديات مفتوحة</span><strong>{props.openShiftCount}</strong></div>
      <div className="stat-card"><span>الوردية النشطة</span><strong>{props.openShiftLabel || 'لا يوجد'}</strong></div>
      <div className="stat-card"><span>إجمالي الفروقات</span><strong>{formatCurrency(props.totalVariance)}</strong></div>
    </div>
  );
}
