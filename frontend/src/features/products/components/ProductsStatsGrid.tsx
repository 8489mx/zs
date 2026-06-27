import { formatCurrency } from '@/lib/format';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';

interface ProductsStatsGridProps {
  total: number;
  lowStockCount: number;
  outOfStockCount: number;
  visibleCount: number;
  inventoryCost: number;
  inventorySaleValue: number;
  activeOffersCount: number;
  customerPriceCount: number;
}

export function ProductsStatsGrid(props: ProductsStatsGridProps) {
  return (
    <div className="reports-workspace">
      <div className="reports-spotlight-grid compact-spotlight-grid">
        <ReportMetricCard label="إجمالي الأصناف" value={props.total} tone="primary" />
        <ReportMetricCard label="أصناف منخفضة" value={props.lowStockCount} tone="warning" />
        <ReportMetricCard label="أصناف نفدت" value={props.outOfStockCount} tone="danger" />
        <ReportMetricCard label="قيمة المخزون" value={props.inventoryCost} formatter={formatCurrency} tone="primary" />
        <ReportMetricCard label="قيمة البيع" value={props.inventorySaleValue} formatter={formatCurrency} tone="success" />
        <ReportMetricCard label="عروض نشطة" value={props.activeOffersCount} tone="primary" />
      </div>
    </div>
  );
}
