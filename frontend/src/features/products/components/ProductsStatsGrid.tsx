import { CSSProperties } from 'react';
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

const gridStyle: CSSProperties = {
  gap: 12,
};

const cardStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 14,
};

const labelStyle: CSSProperties = {
  fontSize: '11px',
  lineHeight: 1.3,
};

const valueStyle: CSSProperties = {
  marginTop: 6,
  fontSize: '14px',
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card" style={cardStyle}>
      <span style={labelStyle}>{label}</span>
      <strong style={valueStyle}>{value}</strong>
    </div>
  );
}

export function ProductsStatsGrid(props: ProductsStatsGridProps) {
  return (
    <div className="stats-grid compact-grid workspace-stats-grid" style={gridStyle}>
      <StatCard label="إجمالي الأصناف" value={props.total} />
      <StatCard label="أصناف منخفضة" value={props.lowStockCount} />
      <StatCard label="أصناف نفدت" value={props.outOfStockCount} />
      <StatCard label="عدد الأصناف في الصفحة" value={props.visibleCount} />
      <StatCard label="قيمة المخزون" value={formatCurrency(props.inventoryCost)} />
      <StatCard label="قيمة البيع" value={formatCurrency(props.inventorySaleValue)} />
      <StatCard label="عروض نشطة/مسجلة" value={props.activeOffersCount} />
      <StatCard label="أسعار عملاء خاصة" value={props.customerPriceCount} />
    </div>
  );
}
