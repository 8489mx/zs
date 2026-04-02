import { QueryCard } from '@/components/shared/QueryCard';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Field } from '@/components/ui/Field';
import { ReportMetricCard } from '@/features/reports/components/ReportMetricCard';
import { relativePercent } from '@/features/reports/lib/reports-format';
import type { ReportsSectionContentProps } from '@/features/reports/components/reports-section.types';

export function InventoryReportSection({
  inventoryQuery,
  exportLowStock,
  printLowStockList,
  inventorySearch,
  onInventorySearchChange,
  inventoryFilter,
  onInventoryFilterChange,
  onInventoryPageChange,
  onInventoryPageSizeChange
}: Pick<ReportsSectionContentProps, 'inventoryQuery' | 'exportLowStock' | 'printLowStockList' | 'inventorySearch' | 'onInventorySearchChange' | 'inventoryFilter' | 'onInventoryFilterChange' | 'onInventoryPageChange' | 'onInventoryPageSizeChange'>) {
  const rows = inventoryQuery.data?.rows || [];
  const pagination = inventoryQuery.data?.pagination;
  const summary = inventoryQuery.data?.summary;
  const values = [summary?.totalItems || 0, summary?.outOfStock || 0, summary?.lowStock || 0, summary?.healthy || 0];

  return (
    <QueryCard
      title="أصناف تحتاج متابعة"
      description="تبويب مستقل لمراجعة المخزون الحرج مع بحث وفلاتر وترقيم صفحات من الخادم."
      actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => void exportLowStock()} disabled={!summary?.totalItems}>تصدير CSV</Button><Button variant="secondary" onClick={() => void printLowStockList()} disabled={!summary?.totalItems}>طباعة</Button><span className="nav-pill">المخزون</span></div>}
      className="reports-focus-card"
      isLoading={inventoryQuery.isLoading}
      isError={inventoryQuery.isError}
      error={inventoryQuery.error}
      isEmpty={!summary?.totalItems}
      loadingText="جاري تحميل الأصناف الحرجة..."
      emptyTitle="لا توجد أصناف حرجة حاليًا"
      emptyHint="المخزون الحالي في وضع جيد لهذه الفترة."
    >
      <div className="reports-spotlight-grid section-spotlight-grid compact-spotlight-grid">
        <ReportMetricCard label="إجمالي النتائج" value={summary?.totalItems || 0} helper="ضمن الفلتر الحالي" tone="primary" progress={relativePercent(summary?.totalItems || 0, values)} />
        <ReportMetricCard label="نافد" value={summary?.outOfStock || 0} helper="يحتاج شراء فورًا" tone="danger" progress={relativePercent(summary?.outOfStock || 0, values)} />
        <ReportMetricCard label="منخفض" value={summary?.lowStock || 0} helper="قريب من الحد الأدنى" tone="warning" progress={relativePercent(summary?.lowStock || 0, values)} />
        <ReportMetricCard label="سليم" value={summary?.healthy || 0} helper="أصناف مستقرة" tone="success" progress={relativePercent(summary?.healthy || 0, values)} />
      </div>
      <div className="toolbar-grid compact-toolbar-grid">
        <Field label="بحث"><input value={inventorySearch} onChange={(event) => onInventorySearchChange(event.target.value)} placeholder="اسم الصنف / القسم / المورد" /></Field>
        <Field label="الحالة"><select value={inventoryFilter} onChange={(event) => onInventoryFilterChange(event.target.value as 'all' | 'attention' | 'low' | 'out')}><option value="attention">يحتاج متابعة</option><option value="all">الكل</option><option value="low">منخفض</option><option value="out">نافد</option></select></Field>
      </div>
      <DataTable
        ariaLabel="أصناف تحتاج متابعة"
        columns={[
          { key: 'name', header: 'الصنف', cell: (row) => row.name },
          { key: 'category', header: 'القسم', cell: (row) => row.category || '—' },
          { key: 'supplier', header: 'المورد', cell: (row) => row.supplier || '—' },
          { key: 'stock', header: 'المخزون', cell: (row) => row.stock },
          { key: 'minStock', header: 'الحد الأدنى', cell: (row) => row.minStock },
          { key: 'status', header: 'الحالة', cell: (row) => row.status || 'ok' },
        ]}
        rows={rows}
        empty={<div className="muted small">لا توجد نتائج مطابقة.</div>}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.pageSize, totalItems: pagination.totalItems, onPageChange: onInventoryPageChange, onPageSizeChange: onInventoryPageSizeChange, itemLabel: 'صنف' } : undefined}
      />
    </QueryCard>
  );
}
