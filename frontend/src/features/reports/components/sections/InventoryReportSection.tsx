import { QueryCard } from '@/shared/components/query-card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { relativePercent } from '@/features/reports/lib/reports-format';
import { formatCurrency } from '@/lib/format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';

export function InventoryReportSection({
  inventoryQuery,
  accountingInventoryValue,
  exportLowStock,
  printLowStockList,
  inventorySearch,
  onInventorySearchChange,
  inventoryFilter,
  onInventoryFilterChange,
  onInventoryPageChange,
  onInventoryPageSizeChange,
  onInventoryFiltersReset
}: Pick<ReportsSectionContentProps, 'inventoryQuery' | 'accountingInventoryValue' | 'exportLowStock' | 'printLowStockList' | 'inventorySearch' | 'onInventorySearchChange' | 'inventoryFilter' | 'onInventoryFilterChange' | 'onInventoryPageChange' | 'onInventoryPageSizeChange' | 'onInventoryFiltersReset'>) {
  const rows = inventoryQuery.data?.rows || [];
  const pagination = inventoryQuery.data?.pagination;
  const summary = inventoryQuery.data?.summary;
  const inventoryTotals = accountingInventoryValue?.totals;
  const values = [
    summary?.totalItems || 0,
    summary?.outOfStock || 0,
    summary?.lowStock || 0,
    summary?.healthy || 0,
    inventoryTotals?.totalInventoryValue || 0,
    inventoryTotals?.totalRetailPotentialValue || 0,
  ];
  const locationHighlights = summary?.locationHighlights || [];

  return (
    <QueryCard
      title="أصناف تحتاج متابعة"
      description="تبويب مستقل لمراجعة المخزون الحرج مع بحث وفلاتر وترقيم صفحات من الخادم، مع إبراز قيمة المخزون الحالية."
      actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => void exportLowStock()} disabled={!summary?.totalItems}>تصدير CSV</Button><Button variant="secondary" onClick={() => void printLowStockList()} disabled={!summary?.totalItems}>طباعة</Button><span className="nav-pill">المخزون</span></div>}
      className="reports-focus-card"
      isLoading={inventoryQuery.isLoading}
      isError={inventoryQuery.isError}
      error={inventoryQuery.error}
      isEmpty={!summary?.totalItems}
      loadingText="جاري تحميل الأصناف الحرجة..."
      emptyTitle="لا توجد أصناف حرجة حاليًا"
      emptyHint="المخزون الحالي في وضع جيد لهذه الفترة."
      preserveChildrenOnEmpty
      emptyAction={<Button variant="secondary" onClick={onInventoryFiltersReset}>إعادة الضبط</Button>}
    >
      <div className="reports-spotlight-grid section-spotlight-grid compact-spotlight-grid">
        <ReportMetricCard label="إجمالي النتائج" value={summary?.totalItems || 0} helper="ضمن الفلتر الحالي" tone="primary" progress={relativePercent(summary?.totalItems || 0, values)} />
        <ReportMetricCard label="نافد" value={summary?.outOfStock || 0} helper="يحتاج شراء فورًا" tone="danger" progress={relativePercent(summary?.outOfStock || 0, values)} />
        <ReportMetricCard label="منخفض" value={summary?.lowStock || 0} helper="قريب من الحد الأدنى" tone="warning" progress={relativePercent(summary?.lowStock || 0, values)} />
        <ReportMetricCard label="سليم" value={summary?.healthy || 0} helper={`مواقع مرصودة: ${summary?.trackedLocations || 0}`} tone="success" progress={relativePercent(summary?.healthy || 0, values)} />
        <ReportMetricCard label="قيمة المخزون" value={inventoryTotals?.totalInventoryValue || 0} helper="حسب تكلفة الشراء الحالية" tone="primary" formatter={formatCurrency} progress={relativePercent(inventoryTotals?.totalInventoryValue || 0, values)} />
        <ReportMetricCard label="قيمة البيع التقديرية" value={inventoryTotals?.totalRetailPotentialValue || 0} helper="ليست ربحًا محققًا" tone="success" formatter={formatCurrency} progress={relativePercent(inventoryTotals?.totalRetailPotentialValue || 0, values)} />
      </div>
      {inventoryTotals ? (
        <div className="metric-list reports-metric-list">
          <div className="metric-row"><span>الهامش التقديري</span><strong>{formatCurrency(inventoryTotals.totalPotentialGrossMargin || 0)}</strong></div>
          <div className="metric-row"><span>أصناف منتهية</span><strong>{inventoryTotals.zeroStockCount || 0}</strong></div>
          <div className="metric-row"><span>أصناف قليلة المخزون</span><strong>{inventoryTotals.lowStockCount || 0}</strong></div>
        </div>
      ) : null}
      {locationHighlights.length ? (
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 space-y-2" aria-label="المخازن الأكثر احتياجًا للمتابعة">
          <div className="text-sm font-semibold">أكثر المخازن احتياجًا للمتابعة</div>
          <div className="grid gap-2 md:grid-cols-3">
            {locationHighlights.slice(0, 3).map((location) => (
              <div key={location.locationId} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                <div className="font-medium">{location.locationName}</div>
                <div className="muted small">{location.branchName || 'بدون فرع محدد'}</div>
                <div className="mt-1">أصناف تحتاج متابعة: <strong>{location.attentionItems}</strong></div>
                <div className="muted small">إجمالي الكمية: {location.totalQty} · أصناف مرصودة: {location.trackedProducts}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="toolbar-grid compact-toolbar-grid">
        <Field label="بحث"><input value={inventorySearch} onChange={(event) => onInventorySearchChange(event.target.value)} placeholder="اسم الصنف / القسم / المورد" /></Field>
        <Field label="الحالة"><select value={inventoryFilter} onChange={(event) => onInventoryFilterChange(event.target.value as 'all' | 'attention' | 'low' | 'out')}><option value="attention">يحتاج متابعة</option><option value="all">الكل</option><option value="low">منخفض</option><option value="out">نافد</option></select></Field>
        <div className="actions compact-actions" style={{ alignItems: 'end' }}><Button variant="secondary" onClick={onInventoryFiltersReset}>إعادة الضبط</Button></div>
      </div>
      <DataTable
        ariaLabel="أصناف تحتاج متابعة"
        columns={[
          { key: 'name', header: 'الصنف', cell: (row) => row.name },
          { key: 'category', header: 'القسم', cell: (row) => row.category || '—' },
          { key: 'supplier', header: 'المورد', cell: (row) => row.supplier || '—' },
          { key: 'stock', header: 'المخزون', cell: (row) => row.stock },
          { key: 'minStock', header: 'الحد الأدنى', cell: (row) => row.minStock },
          { key: 'topLocation', header: 'أكبر مخزن', cell: (row) => row.topLocationName ? `${row.topLocationName}${row.topLocationQty ? ` (${row.topLocationQty})` : ''}` : '—' },
          { key: 'warehouses', header: 'توزيع المخازن', cell: (row) => row.locationsLabel || '—' },
          { key: 'status', header: 'الحالة', cell: (row) => row.status || 'ok' },
        ]}
        rows={rows}
        empty={<div className="muted small">لا توجد نتائج مطابقة.</div>}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.pageSize, totalItems: pagination.totalItems, onPageChange: onInventoryPageChange, onPageSizeChange: onInventoryPageSizeChange, itemLabel: 'صنف' } : undefined}
      />
    </QueryCard>
  );
}
