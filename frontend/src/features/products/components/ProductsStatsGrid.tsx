import { formatCurrency } from '@/lib/format';
import { StatsGrid, type StatsGridItem } from '@/shared/components/stats-grid';

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
  const alertText = props.lowStockCount || props.outOfStockCount 
    ? `${props.lowStockCount} منخفض • ${props.outOfStockCount} نفد`
    : 'المخزون كافي';

  const items: StatsGridItem[] = [
    {
      key: 'total',
      label: 'إجمالي الأصناف',
      value: `${props.total} صنف`,
    },
    {
      key: 'alerts',
      label: 'تنبيهات النواقص',
      value: alertText,
    },
    {
      key: 'cost-value',
      label: 'قيمة المخزون (تكلفة)',
      value: formatCurrency(props.inventoryCost),
    },
    {
      key: 'sale-value',
      label: 'القيمة البيعية التقديرية',
      value: formatCurrency(props.inventorySaleValue),
    },
  ];

  return (
    <div style={{ marginBottom: '16px' }}>
      <StatsGrid items={items} />
    </div>
  );
}
