import i18n from '@/lib/i18n';
import type { Product } from '@/types/domain';
import { formatCurrency } from '@/lib/format';
import { resolveProductStatus, type StockStatus } from '@/lib/domain/inventory';

export type InventoryStatusFilter = 'all' | StockStatus;

export function filterInventoryRows(rows: Product[], search: string, statusFilter: InventoryStatusFilter) {
  const q = search.trim().toLowerCase();
  return rows.filter((product) => {
    const matchesSearch =
      !q ||
      [
        product.name,
        product.barcode,
        product.styleCode,
        product.color,
        product.size,
        product.categoryName,
        product.supplierName,
        product.defaultLocationName,
        ...(product.activeLocationNames || []),
      ].some((value) => String(value || '').toLowerCase().includes(q));
    if (!matchesSearch) return false;
    const status = resolveProductStatus(product);
    return statusFilter === 'all' ? true : status === statusFilter;
  });
}

export function buildInventorySummary(products: Product[], includeSensitivePricing = true) {
  return {
    total: products.length,
    outOfStock: products.filter((product) => resolveProductStatus(product) === 'out'),
    lowStock: products.filter((product) => resolveProductStatus(product) === 'low'),
    inventoryValue: includeSensitivePricing
      ? products.reduce((sum, product) => sum + (Number(product.stock || 0) * Number(product.costPrice || 0)), 0)
      : null
  };
}

export function getInventoryColumns(includeSensitivePricing = true) {
  const isEn = i18n.language === 'en';
  const columns = [
    { key: 'name', header: isEn ? 'Product' : 'الصنف', cell: (product: Product) => product.name },
    { key: 'barcode', header: isEn ? 'Barcode' : 'الباركود', cell: (product: Product) => product.barcode || '—' },
    { key: 'stock', header: isEn ? 'Balance' : 'الرصيد', cell: (product: Product) => product.stock },
    { key: 'minStock', header: isEn ? 'Min. Stock' : 'الحد الأدنى', cell: (product: Product) => product.minStock },
    {
      key: 'status',
      header: isEn ? 'Status' : 'الحالة',
      cell: (product: Product) => {
        const status = resolveProductStatus(product);
        const label = status === 'out'
          ? (isEn ? 'Out of Stock' : 'نافد')
          : status === 'low'
          ? (isEn ? 'Low Stock' : 'منخفض')
          : (isEn ? 'Normal' : 'سليم');
        return <span className={`status-badge ${status === 'out' ? 'status-draft' : status === 'low' ? 'status-warning' : 'status-posted'}`}>{label}</span>;
      }
    }
  ];
  if (includeSensitivePricing) {
    columns.splice(4, 0, { key: 'costPrice', header: isEn ? 'Cost' : 'التكلفة', cell: (product: Product) => formatCurrency(product.costPrice) });
  }
  return columns;
}
