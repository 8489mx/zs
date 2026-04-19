import type { Product } from '@/types/domain';
import { formatCurrency } from '@/lib/format';
import { resolveProductStatus, type StockStatus } from '@/lib/domain/inventory';

export type InventoryStatusFilter = 'all' | StockStatus;

export function filterInventoryRows(rows: Product[], search: string, statusFilter: InventoryStatusFilter) {
  const q = search.trim().toLowerCase();
  return rows.filter((product) => {
    const matchesSearch = !q || [product.name, product.barcode, product.styleCode, product.color, product.size].some((value) => String(value || '').toLowerCase().includes(q));
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
  const columns = [
    { key: 'name', header: 'الصنف', cell: (product: Product) => product.name },
    { key: 'barcode', header: 'الباركود', cell: (product: Product) => product.barcode || '—' },
    { key: 'stock', header: 'الرصيد', cell: (product: Product) => product.stock },
    { key: 'minStock', header: 'الحد الأدنى', cell: (product: Product) => product.minStock },
    {
      key: 'status',
      header: 'الحالة',
      cell: (product: Product) => {
        const status = resolveProductStatus(product);
        return <span className={`status-badge ${status === 'out' ? 'status-draft' : status === 'low' ? 'status-warning' : 'status-posted'}`}>{status === 'out' ? 'نافد' : status === 'low' ? 'منخفض' : 'سليم'}</span>;
      }
    }
  ];
  if (includeSensitivePricing) {
    columns.splice(4, 0, { key: 'costPrice', header: 'التكلفة', cell: (product: Product) => formatCurrency(product.costPrice) });
  }
  return columns;
}
