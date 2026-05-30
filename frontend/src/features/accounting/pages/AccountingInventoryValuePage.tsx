import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { StatsGrid } from '@/shared/components/stats-grid';
import { formatCurrency } from '@/lib/format';
import { Card } from '@/shared/ui/card';
import { accountingApi, type InventoryValueItem } from '@/features/accounting/api/accounting.api';
import { catalogApi } from '@/lib/api/catalog';

function statusLabel(status: InventoryValueItem['status']) {
  if (status === 'negative_stock') return 'مخزون بالسالب';
  if (status === 'out_of_stock') return 'منتهي';
  if (status === 'low_stock') return 'قليل المخزون';
  return 'متوفر';
}

export function AccountingInventoryValuePage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [zeroStockOnly, setZeroStockOnly] = useState(false);

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedCategoryId, setAppliedCategoryId] = useState('');
  const [appliedSupplierId, setAppliedSupplierId] = useState('');
  const [appliedLowStockOnly, setAppliedLowStockOnly] = useState(false);
  const [appliedZeroStockOnly, setAppliedZeroStockOnly] = useState(false);

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: () => catalogApi.categories() });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: () => catalogApi.suppliers() });

  const query = useQuery({
    queryKey: [
      'accounting',
      'inventory-value',
      appliedSearch,
      appliedCategoryId,
      appliedSupplierId,
      appliedLowStockOnly,
      appliedZeroStockOnly,
    ],
    queryFn: () =>
      accountingApi.inventoryValue({
        search: appliedSearch || undefined,
        category_id: appliedCategoryId || undefined,
        supplier_id: appliedSupplierId || undefined,
        low_stock_only: appliedLowStockOnly ? 'true' : undefined,
        zero_stock_only: appliedZeroStockOnly ? 'true' : undefined,
      }),
  });

  const totals = query.data?.totals;
  const rows = query.data?.items || [];
  const stats = useMemo(() => {
    if (!totals) return [];
    return [
      { key: 'cost', label: 'قيمة المخزون بالتكلفة', value: formatCurrency(totals.totalInventoryValue) },
      { key: 'sale', label: 'قيمة البيع التقديرية', value: formatCurrency(totals.totalRetailPotentialValue) },
      { key: 'margin', label: 'الهامش التقديري', value: formatCurrency(totals.totalPotentialGrossMargin) },
      { key: 'items', label: 'عدد الأصناف', value: String(totals.itemCount) },
      { key: 'low', label: 'أصناف قليلة المخزون', value: String(totals.lowStockCount) },
      { key: 'zero', label: 'أصناف منتهية', value: String(totals.zeroStockCount) },
    ];
  }, [totals]);

  return (
    <div className="page-stack page-shell">
      <PageHeader title="قيمة المخزون" description="تقرير مبسط يوضح قيمة البضاعة الموجودة حاليًا وتوزيعها على الأصناف." />

      <Card title="فلاتر التقرير">
        <div className="grid-3" style={{ alignItems: 'end' }}>
          <label className="field stack gap-8">
            <span>بحث باسم الصنف أو الباركود</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اكتب اسم الصنف أو الباركود" />
          </label>
          <label className="field stack gap-8">
            <span>التصنيف</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">كل التصنيفات</option>
              {(categoriesQuery.data || []).map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="field stack gap-8">
            <span>المورد</span>
            <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">كل الموردين</option>
              {(suppliersQuery.data || []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <label className="checkbox" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} />
            عرض الأصناف قليلة المخزون فقط
          </label>
          <label className="checkbox" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={zeroStockOnly} onChange={(event) => setZeroStockOnly(event.target.checked)} />
            عرض الأصناف المنتهية فقط
          </label>
          <button
            type="button"
            className="button"
            onClick={() => {
              setAppliedSearch(search.trim());
              setAppliedCategoryId(categoryId);
              setAppliedSupplierId(supplierId);
              setAppliedLowStockOnly(lowStockOnly);
              setAppliedZeroStockOnly(zeroStockOnly);
            }}
          >
            تطبيق
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setSearch('');
              setCategoryId('');
              setSupplierId('');
              setLowStockOnly(false);
              setZeroStockOnly(false);
              setAppliedSearch('');
              setAppliedCategoryId('');
              setAppliedSupplierId('');
              setAppliedLowStockOnly(false);
              setAppliedZeroStockOnly(false);
            }}
          >
            إعادة ضبط
          </button>
        </div>
      </Card>

      <Card title="ملخص قيمة المخزون">
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!totals}
          loadingText="جاري تحميل تقرير قيمة المخزون..."
          errorTitle="تعذر تحميل تقرير قيمة المخزون"
          emptyTitle="لا توجد بيانات مطابقة للفلاتر"
        >
          {stats.length ? <StatsGrid items={stats} /> : null}
        </QueryFeedback>
      </Card>

      <Card title="تفاصيل الأصناف">
        <DataTable<InventoryValueItem>
          data={rows}
          getRowKey={(row) => row.productId}
          emptyMessage="لا توجد أصناف مطابقة للفلاتر الحالية"
          defaultSort={{ columnId: 'inventoryValue', direction: 'desc' }}
          columns={[
            { id: 'name', header: 'الصنف', sortable: true, sortValue: (row) => row.productName || '', render: (row) => row.productName || '-' },
            { id: 'barcode', header: 'الباركود', sortable: true, sortValue: (row) => row.barcode || '', render: (row) => row.barcode || '-' },
            { id: 'category', header: 'التصنيف', sortable: true, sortValue: (row) => row.categoryName || '', render: (row) => row.categoryName || '-' },
            { id: 'supplier', header: 'المورد', sortable: true, sortValue: (row) => row.supplierName || '', render: (row) => row.supplierName || '-' },
            { id: 'qty', header: 'الكمية الحالية', align: 'end', sortable: true, sortValue: (row) => row.quantityOnHand, render: (row) => String(row.quantityOnHand) },
            { id: 'unitCost', header: 'تكلفة الوحدة', align: 'end', sortable: true, sortValue: (row) => row.unitCost, render: (row) => formatCurrency(row.unitCost) },
            { id: 'inventoryValue', header: 'قيمة المخزون', align: 'end', sortable: true, sortValue: (row) => row.inventoryValue, render: (row) => formatCurrency(row.inventoryValue) },
            { id: 'retailPrice', header: 'سعر البيع', align: 'end', sortable: true, sortValue: (row) => row.unitRetailPrice, render: (row) => formatCurrency(row.unitRetailPrice) },
            { id: 'retailValue', header: 'قيمة البيع التقديرية', align: 'end', sortable: true, sortValue: (row) => row.retailPotentialValue, render: (row) => formatCurrency(row.retailPotentialValue) },
            { id: 'status', header: 'الحالة', sortable: true, sortValue: (row) => statusLabel(row.status), render: (row) => statusLabel(row.status) },
          ]}
        />
      </Card>

      <div className="muted">القيم تقديرية حسب تكلفة الشراء الحالية وسعر البيع الحالي، وليست ربحًا محققًا.</div>
    </div>
  );
}
