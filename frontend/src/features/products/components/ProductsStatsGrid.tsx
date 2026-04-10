import { formatCurrency } from '@/lib/format';

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
    <div className="stats-grid compact-grid workspace-stats-grid">
      <div className="stat-card"><span>إجمالي الأصناف</span><strong>{props.total}</strong></div>
      <div className="stat-card"><span>أصناف منخفضة</span><strong>{props.lowStockCount}</strong></div>
      <div className="stat-card"><span>أصناف نفدت</span><strong>{props.outOfStockCount}</strong></div>
      <div className="stat-card"><span>عدد الأصناف في الصفحة</span><strong>{props.visibleCount}</strong></div>
      <div className="stat-card"><span>قيمة المخزون</span><strong>{formatCurrency(props.inventoryCost)}</strong></div>
      <div className="stat-card"><span>قيمة البيع</span><strong>{formatCurrency(props.inventorySaleValue)}</strong></div>
      <div className="stat-card"><span>عروض نشطة/مسجلة</span><strong>{props.activeOffersCount}</strong></div>
      <div className="stat-card"><span>أسعار عملاء خاصة</span><strong>{props.customerPriceCount}</strong></div>
    </div>
  );
}
