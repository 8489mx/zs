import { StatsGrid } from '@/shared/components/stats-grid';
import { formatCurrency } from '@/lib/format';

interface CashDrawerStatsGridProps {
  totalItems: number;
  openShiftCount: number;
  openShiftLabel?: string;
  totalVariance: number;
  canViewSensitiveTotals?: boolean;
}

export function CashDrawerStatsGrid(props: CashDrawerStatsGridProps) {
  const canViewSensitiveTotals = props.canViewSensitiveTotals !== false;

  const items = [
    { key: 'totalShifts', label: 'إجمالي الورديات', value: props.totalItems },
    { key: 'openShifts', label: 'ورديات مفتوحة', value: props.openShiftCount },
    { key: 'activeShift', label: 'الوردية النشطة', value: props.openShiftLabel || 'لا يوجد' },
    { key: 'totalVariance', label: 'إجمالي الفروقات', value: canViewSensitiveTotals ? formatCurrency(props.totalVariance) : '—' },
  ] as const;

  return <StatsGrid items={items} />;
}
