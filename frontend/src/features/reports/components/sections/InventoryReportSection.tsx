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
  printInventoryValueReport,
  printInventoryMovementsReport,
  locationId,
  inventorySearch,
  onInventorySearchChange,
  inventoryFilter,
  onInventoryFilterChange,
  deadStockDays = 60,
  onDeadStockDaysChange,
  onInventoryPageChange,
  onInventoryPageSizeChange,
  onInventoryFiltersReset
}: Pick<ReportsSectionContentProps, 'inventoryQuery' | 'accountingInventoryValue' | 'exportLowStock' | 'printInventoryValueReport' | 'printInventoryMovementsReport' | 'locationId' | 'inventorySearch' | 'onInventorySearchChange' | 'inventoryFilter' | 'onInventoryFilterChange' | 'deadStockDays' | 'onDeadStockDaysChange' | 'onInventoryPageChange' | 'onInventoryPageSizeChange' | 'onInventoryFiltersReset'>) {
  const rows = inventoryQuery.data?.rows || [];
  const pagination = inventoryQuery.data?.pagination;
  const summary = inventoryQuery.data?.summary;
  const inventoryTotals = accountingInventoryValue?.totals;
  const isDeadStock = inventoryFilter === 'dead';

  const tiedCapital = rows.reduce((sum, r) => sum + (r.stock * (r.costPrice || 0)), 0);
  const deadStockUnits = rows.reduce((sum, r) => sum + (r.stock || 0), 0);

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
      title={isDeadStock ? 'تحليل المخزون الراكد ورأس المال المجمد' : 'أصناف تحتاج متابعة'}
      description={
        isDeadStock
          ? `رصد الأصناف المتوفرة بالمخازن والتي لم تسجل أي حركة بيع خلال آخر ${deadStockDays} يوم، مع حساب رأس المال المعطل فيها.`
          : 'تبويب مستقل لمراجعة المخزون الحرج مع بحث وفلاتر وترقيم صفحات من الخادم، مع إبراز قيمة المخزون الحالية.'
      }
      actions={
        <div className="actions compact-actions">
          <Button
            variant={isDeadStock ? 'primary' : 'secondary'}
            onClick={() => onInventoryFilterChange(isDeadStock ? 'attention' : 'dead')}
            style={isDeadStock ? { background: '#170e5e', color: '#fff' } : undefined}
          >
            {isDeadStock ? 'العودة للمخزون الحرج' : 'تحليل المخزون الراكد ⚠️'}
          </Button>
          <Button variant="secondary" onClick={() => void exportLowStock()} disabled={!summary?.totalItems}>
            {isDeadStock ? 'تصدير الراكد Excel' : 'تصدير Excel'}
          </Button>
          <Button variant="secondary" onClick={() => void printInventoryValueReport()} disabled={!summary?.totalItems}>طباعة الجرد والقيمة</Button>
          <Button variant="secondary" onClick={() => void printInventoryMovementsReport(locationId, false)}>طباعة / PDF (ملخص)</Button>
          <Button variant="secondary" onClick={() => void printInventoryMovementsReport(locationId, true)}>طباعة / PDF (تفصيلي)</Button>
          <span className="nav-pill">{isDeadStock ? 'المخزون الراكد' : 'المخزون'}</span>
        </div>
      }
      className="reports-focus-card"
      isLoading={inventoryQuery.isLoading}
      isError={inventoryQuery.isError}
      error={inventoryQuery.error}
      isEmpty={!summary?.totalItems}
      loadingText={isDeadStock ? 'جاري فحص المخزون الراكد...' : 'جاري تحميل الأصناف الحرجة...'}
      emptyTitle={isDeadStock ? 'ممتاز! لا يوجد مخزون راكد' : 'لا توجد أصناف حرجة حاليًا'}
      emptyHint={isDeadStock ? `جميع الأصناف المتوفرة تم بيعها أو تحركت خلال آخر ${deadStockDays} يوم.` : 'المخزون الحالي في وضع جيد لهذه الفترة.'}
      preserveChildrenOnEmpty
      emptyAction={<Button variant="secondary" onClick={onInventoryFiltersReset}>إعادة الضبط</Button>}
    >
      {isDeadStock ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '12px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85em', color: '#64748b', marginBottom: '4px' }}>أصناف راكدة (الصفحة الحالية)</div>
              <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#dc2626' }}>{summary?.totalItems || rows.length} صنف</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85em', color: '#64748b', marginBottom: '4px' }}>إجمالي الوحدات المعطلة</div>
              <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#d97706' }}>{deadStockUnits} وحدة</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85em', color: '#64748b', marginBottom: '4px' }}>رأس المال المجمد التقديري</div>
              <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#170e5e' }}>{formatCurrency(tiedCapital)}</div>
            </div>
          </div>
          <div style={{ fontSize: '0.85em', color: '#475569', lineHeight: 1.6 }}>
            💡 <strong>توصية تشغيلية:</strong> تم تصفية الأصناف التي تمتلك أرصدة موجبة ولم تسجل أي حركة بيع معتمدة منذ <strong>{deadStockDays}</strong> يوم فأكثر. يُنصح بعمل عروض مجمعة (Bundles) أو خصومات تصفية لتسييل رأس المال وإعادة تدويره.
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}

      {!isDeadStock && locationHighlights.length ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginTop: '16px' }} aria-label="المخازن الأكثر احتياجًا للمتابعة">
          <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#1e293b' }}>أكثر المخازن احتياجًا للمتابعة</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {locationHighlights.slice(0, 3).map((location) => (
              <div key={location.locationId} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.05em', color: '#0f172a' }}>{location.locationName}</div>
                <div className="muted small" style={{ marginBottom: '8px' }}>{location.branchName || 'بدون فرع محدد'}</div>
                <div style={{ fontSize: '0.9em', color: '#334155' }}>أصناف تحتاج متابعة: <strong>{location.attentionItems}</strong></div>
                <div className="muted small" style={{ marginTop: '6px', fontSize: '0.8em' }}>إجمالي الكمية: {location.totalQty} · أصناف مرصودة: {location.trackedProducts}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="toolbar-grid compact-toolbar-grid" style={{ marginTop: '16px' }}>
        <Field label="بحث"><input value={inventorySearch} onChange={(event) => onInventorySearchChange(event.target.value)} placeholder="اسم الصنف / القسم / المورد" /></Field>
        <Field label="الحالة">
          <select value={inventoryFilter} onChange={(event) => onInventoryFilterChange(event.target.value as 'all' | 'attention' | 'low' | 'out' | 'dead')}>
            <option value="attention">يحتاج متابعة</option>
            <option value="all">الكل</option>
            <option value="low">منخفض</option>
            <option value="out">نافد</option>
            <option value="dead">مخزون راكد (بدون مبيعات)</option>
          </select>
        </Field>
        {isDeadStock ? (
          <Field label="فترة الركود">
            <select value={deadStockDays} onChange={(e) => onDeadStockDaysChange?.(Number(e.target.value))}>
              <option value={30}>30 يوم فأكثر</option>
              <option value={60}>60 يوم فأكثر (افتراضي)</option>
              <option value={90}>90 يوم فأكثر</option>
              <option value={180}>180 يوم فأكثر (نصف سنوي)</option>
            </select>
          </Field>
        ) : null}
        <div className="actions compact-actions" style={{ alignItems: 'end' }}><Button variant="secondary" onClick={onInventoryFiltersReset}>إعادة الضبط</Button></div>
      </div>

      <DataTable
        ariaLabel={isDeadStock ? 'تحليل المخزون الراكد' : 'أصناف تحتاج متابعة'}
        columns={
          isDeadStock
            ? [
                { key: 'name', header: 'الصنف', cell: (row) => row.name },
                { key: 'category', header: 'القسم', cell: (row) => row.category || '—' },
                { key: 'supplier', header: 'المورد', cell: (row) => row.supplier || '—' },
                { key: 'stock', header: 'الرصيد الراكد', cell: (row) => <strong>{row.stock}</strong> },
                { key: 'costPrice', header: 'التكلفة الفردية', cell: (row) => formatCurrency(row.costPrice || 0) },
                { key: 'tiedCapital', header: 'رأس المال المجمد', cell: (row) => <span style={{ color: '#b91c1c', fontWeight: 'bold' }}>{formatCurrency(row.stock * (row.costPrice || 0))}</span> },
                { key: 'retailPrice', header: 'سعر البيع', cell: (row) => formatCurrency(row.retailPrice || 0) },
                { key: 'topLocation', header: 'أكبر مخزن', cell: (row) => row.topLocationName ? `${row.topLocationName}${row.topLocationQty ? ` (${row.topLocationQty})` : ''}` : '—' },
                { key: 'status', header: 'الحالة', cell: () => <span className="nav-pill" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>راكد ({deadStockDays} يوم+)</span> },
              ]
            : [
                { key: 'name', header: 'الصنف', cell: (row) => row.name },
                { key: 'category', header: 'القسم', cell: (row) => row.category || '—' },
                { key: 'supplier', header: 'المورد', cell: (row) => row.supplier || '—' },
                { key: 'stock', header: 'المخزون', cell: (row) => row.stock },
                { key: 'minStock', header: 'الحد الأدنى', cell: (row) => row.minStock },
                { key: 'topLocation', header: 'أكبر مخزن', cell: (row) => row.topLocationName ? `${row.topLocationName}${row.topLocationQty ? ` (${row.topLocationQty})` : ''}` : '—' },
                { key: 'warehouses', header: 'توزيع المخازن', cell: (row) => row.locationsLabel || '—' },
                { key: 'status', header: 'الحالة', cell: (row) => row.status || 'ok' },
              ]
        }
        rows={rows}
        empty={<div className="muted small">{isDeadStock ? 'لا يوجد مخزون راكد يطابق البحث والفترة المحددة.' : 'لا توجد نتائج مطابقة.'}</div>}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.pageSize, totalItems: pagination.totalItems, onPageChange: onInventoryPageChange, onPageSizeChange: onInventoryPageSizeChange, itemLabel: 'صنف' } : undefined}
      />
    </QueryCard>
  );
}
