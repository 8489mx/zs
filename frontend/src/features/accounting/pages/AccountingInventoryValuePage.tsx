import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { ReportMetricCard } from '@/shared/components/report-metric-card';
import { CustomSelect } from '@/shared/ui/custom-select';
import { formatCurrency } from '@/lib/format';

import { accountingApi, type InventoryValueItem } from '@/features/accounting/api/accounting.api';
import { catalogApi } from '@/lib/api/catalog';

function statusLabel(status: InventoryValueItem['status']) {
  if (status === 'negative_stock') return 'مخزون بالسالب';
  if (status === 'out_of_stock') return 'منتهي';
  if (status === 'low_stock') return 'قليل المخزون';
  return 'متوفر';
}

export function AccountingInventoryValuePage() {
  const { t } = useTranslation();
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
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader title={t('accounting.accounting_inventory_value_page.s0', "قيمة المخزون")} description={t('accounting.accounting_inventory_value_page.s1', "تقرير مبسط يوضح قيمة البضاعة الموجودة حاليًا وتوزيعها على الأصناف.")} />

        <FormSection title={t('accounting.accounting_inventory_value_page.s2', "فلاتر التقرير")}>
        <div className="grid-3" style={{ alignItems: 'end' }}>
          <label className="field stack gap-8">
            <span>{t('accounting.accounting_inventory_value_page.s3', "بحث باسم الصنف أو الباركود")}</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('accounting.accounting_inventory_value_page.s4', "اكتب اسم الصنف أو الباركود")} />
          </label>
          <div className="field stack gap-8">
            <span>{t('accounting.accounting_inventory_value_page.s5', "التصنيف")}</span>
            <CustomSelect
              value={categoryId}
              onChange={(val) => setCategoryId(val)}
              options={[
                { value: '', label: t('accounting.accounting_inventory_value_page.s6', "كل التصنيفات") },
                ...(categoriesQuery.data || []).map((category) => ({ value: category.id, label: category.name })),
              ]}
            />
          </div>
          <div className="field stack gap-8">
            <span>{t('accounting.accounting_inventory_value_page.s7', "المورد")}</span>
            <CustomSelect
              value={supplierId}
              onChange={(val) => setSupplierId(val)}
              options={[
                { value: '', label: t('accounting.accounting_inventory_value_page.s8', "كل الموردين") },
                ...(suppliersQuery.data || []).map((supplier) => ({ value: supplier.id, label: supplier.name })),
              ]}
            />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <label className="checkbox" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} />
            {t('accounting.accounting_inventory_value_page.s9', "عرض الأصناف قليلة المخزون فقط")}
          </label>
          <label className="checkbox" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={zeroStockOnly} onChange={(event) => setZeroStockOnly(event.target.checked)} />
            {t('accounting.accounting_inventory_value_page.s10', "عرض الأصناف المنتهية فقط")}
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
            {t('accounting.accounting_inventory_value_page.s11', "تطبيق")}
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
            {t('accounting.accounting_inventory_value_page.s12', "إعادة ضبط")}
          </button>
        </div>
        </FormSection>

        <FormSection title={t('accounting.accounting_inventory_value_page.s13', "ملخص قيمة المخزون")}>
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!totals}
          loadingText={t('accounting.accounting_inventory_value_page.s14', "جاري تحميل تقرير قيمة المخزون...")}
          errorTitle={t('accounting.accounting_inventory_value_page.s15', "تعذر تحميل تقرير قيمة المخزون")}
          emptyTitle={t('accounting.accounting_inventory_value_page.s16', "لا توجد بيانات مطابقة للفلاتر")}
        >
          {stats.length ? (
            <div className="reports-workspace">
              <div className="reports-spotlight-grid compact-spotlight-grid">
                {stats.map((stat) => (
                  <ReportMetricCard key={stat.key} label={stat.label as string} value={Number(stat.value) || 0} tone={stat.key === 'cost' ? 'success' : stat.key === 'zero' ? 'danger' : stat.key === 'low' ? 'warning' : 'primary'} />
                ))}
              </div>
            </div>
          ) : null}
        </QueryFeedback>
        </FormSection>

        <FormSection title={t('accounting.accounting_inventory_value_page.s17', "تفاصيل الأصناف")}>
        <DataTable<InventoryValueItem>
          data={rows}
          getRowKey={(row) => row.productId}
          emptyMessage={t('accounting.accounting_inventory_value_page.s18', "لا توجد أصناف مطابقة للفلاتر الحالية")}
          defaultSort={{ columnId: 'inventoryValue', direction: 'desc' }}
          columns={[
            { id: 'name', header: t('accounting.accounting_inventory_value_page.s19', "الصنف"), sortable: true, sortValue: (row) => row.productName || '', render: (row) => row.productName || '-' },
            { id: 'barcode', header: t('accounting.accounting_inventory_value_page.s20', "الباركود"), sortable: true, sortValue: (row) => row.barcode || '', render: (row) => row.barcode || '-' },
            { id: 'category', header: t('accounting.accounting_inventory_value_page.s21', "التصنيف"), sortable: true, sortValue: (row) => row.categoryName || '', render: (row) => row.categoryName || '-' },
            { id: 'supplier', header: t('accounting.accounting_inventory_value_page.s22', "المورد"), sortable: true, sortValue: (row) => row.supplierName || '', render: (row) => row.supplierName || '-' },
            { id: 'qty', header: t('accounting.accounting_inventory_value_page.s23', "الكمية الحالية"), align: 'end', sortable: true, sortValue: (row) => row.quantityOnHand, render: (row) => String(row.quantityOnHand) },
            { id: 'unitCost', header: t('accounting.accounting_inventory_value_page.s24', "تكلفة الوحدة"), align: 'end', sortable: true, sortValue: (row) => row.unitCost, render: (row) => formatCurrency(row.unitCost) },
            { id: 'inventoryValue', header: t('accounting.accounting_inventory_value_page.s25', "قيمة المخزون"), align: 'end', sortable: true, sortValue: (row) => row.inventoryValue, render: (row) => formatCurrency(row.inventoryValue) },
            { id: 'retailPrice', header: t('accounting.accounting_inventory_value_page.s26', "سعر البيع"), align: 'end', sortable: true, sortValue: (row) => row.unitRetailPrice, render: (row) => formatCurrency(row.unitRetailPrice) },
            { id: 'retailValue', header: t('accounting.accounting_inventory_value_page.s27', "قيمة البيع التقديرية"), align: 'end', sortable: true, sortValue: (row) => row.retailPotentialValue, render: (row) => formatCurrency(row.retailPotentialValue) },
            { id: 'status', header: t('accounting.accounting_inventory_value_page.s28', "الحالة"), sortable: true, sortValue: (row) => statusLabel(row.status), render: (row) => statusLabel(row.status) },
          ]}
        />
        </FormSection>

        <div className="muted" style={{ paddingInline: '24px' }}>{t('accounting.accounting_inventory_value_page.s29', "القيم تقديرية حسب تكلفة الشراء الحالية وسعر البيع الحالي، وليست ربحًا محققًا.")}</div>
      </main>
    </div>
  );
}
