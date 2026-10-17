import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  const alertText = props.lowStockCount || props.outOfStockCount 
    ? `${props.lowStockCount} ${t('products.low_stock', 'منخفض')} • ${props.outOfStockCount} ${t('products.out_of_stock', 'نفد')}`
    : t('products.stock_sufficient', 'المخزون كافي');

  const items: StatsGridItem[] = [
    {
      key: 'total',
      label: t('products.total_products', 'إجمالي الأصناف'),
      value: `${props.total} ${t('products.items_count', 'صنف')}`,
    },
    {
      key: 'alerts',
      label: t('products.shortage_alerts', 'تنبيهات النواقص'),
      value: alertText,
    },
    {
      key: 'cost-value',
      label: t('products.inventory_cost', 'قيمة المخزون (تكلفة)'),
      value: formatCurrency(props.inventoryCost),
    },
    {
      key: 'sale-value',
      label: t('products.inventory_sale_value', 'القيمة البيعية التقديرية'),
      value: formatCurrency(props.inventorySaleValue),
    },
  ];

  return (
    <div style={{ marginBottom: '16px' }}>
      <StatsGrid items={items} />
    </div>
  );
}
