import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types/domain';

export function matchProductSearch(product: Product, search: string, categoryName = '', supplierName = '') {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const unitValues = Array.isArray(product.units) ? product.units.flatMap((unit) => [unit.name, unit.barcode]) : [];
  return [product.name, product.barcode, categoryName, supplierName, product.notes, ...unitValues]
    .some((value) => String(value || '').toLowerCase().includes(q));
}

export function getProductMetrics(products: Product[]) {
  const lowStock = products.filter((product) => product.stock <= product.minStock);
  const outOfStock = products.filter((product) => product.stock <= 0);
  return {
    total: products.length,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length
  };
}

export function getProductColumns(categoryNames: Record<string, string>, supplierNames: Record<string, string>) {
  return [
    {
      key: 'name',
      header: 'الصنف',
      cell: (product: Product) => (
        <div>
          <strong>{product.name}</strong>
          <div className="muted small">وحدات: {product.units.map((unit) => unit.name).join(' / ') || 'قطعة'}</div>
        </div>
      )
    },
    { key: 'barcode', header: 'الباركود', cell: (product: Product) => product.barcode || '—' },
    { key: 'category', header: 'القسم', cell: (product: Product) => categoryNames[product.categoryId] || '—' },
    { key: 'supplier', header: 'المورد', cell: (product: Product) => supplierNames[product.supplierId] || '—' },
    { key: 'cost', header: 'الشراء', cell: (product: Product) => formatCurrency(product.costPrice) },
    { key: 'retail', header: 'القطاعي', cell: (product: Product) => formatCurrency(product.retailPrice) },
    { key: 'wholesale', header: 'الجملة', cell: (product: Product) => formatCurrency(product.wholesalePrice) },
    {
      key: 'stock',
      header: 'المخزون',
      cell: (product: Product) => <span className={product.stock <= product.minStock ? 'low-stock-badge' : 'status-badge status-posted'}>{product.stock}</span>
    },
    { key: 'notes', header: 'ملاحظات', cell: (product: Product) => product.notes || '—' }
  ];
}
