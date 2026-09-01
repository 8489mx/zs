import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { formatCurrency } from '@/lib/format';
import type { Supplier } from '@/types/domain';

export function SuppliersRegisterCard(props: { search: string; setSearch: (value: string) => void; filterMode: "all" | "debt" | "withNotes"; setFilterMode: (value: "all" | "debt" | "withNotes") => void; setPage: (value: number) => void; copySuppliersSummary: () => Promise<void> | void; printSuppliersRegister: () => void; rows: Supplier[]; canPrint: boolean; summary?: { totalSuppliers?: number } | null; selectedSupplier: Supplier | null; totalBalance: number; selectedIds: string[]; setSelectedIds: (value: string[]) => void; setBulkDeleteOpen: (value: boolean) => void; canDelete: boolean; suppliersQuery: { isLoading: boolean; isError: boolean; error: unknown }; page: number; pageSize: number; setPageSize: (value: number) => void; setSelectedSupplier: (supplier: Supplier | null) => void; setSupplierToDelete: (supplier: Supplier | null) => void; onOpenCreate?: () => void; }) {
  return (
    <section className="document-prototype-section">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">الموردون الحاليون</h3>
        <div className="section-header-actions-group">
          {props.onOpenCreate && <Button variant="primary" onClick={props.onOpenCreate} className="section-header-action-btn">+ مورد جديد</Button>}
          <Button variant="secondary" onClick={() => { props.setSearch(''); props.setFilterMode('all'); props.setPage(1); }} className="section-header-action-btn" style={{ marginInlineStart: '6px' }}>إلغاء الفلاتر</Button>
        </div>
      </div>
      <p className="muted small section-header-subtitle">
        فلترة سريعة مع ملخصات وإمكانية التعديل والإضافة المباشرة.
      </p>
      <SearchToolbar
        search={props.search}
        onSearchChange={(value) => { props.setSearch(value); props.setPage(1); }}
        searchPlaceholder="ابحث بالاسم أو الهاتف أو العنوان أو الملاحظات"
        title="بحث وتصفية"
        description="فلترة سريعة لسجل الموردين مع إبقاء المورد المحدد والرصيد الحالي واضحين طوال الوقت."
        actions={<span className="nav-pill">{props.filterMode === 'all' ? 'كل الموردين' : props.filterMode === 'debt' ? 'عليهم رصيد' : 'لديهم ملاحظات'}</span>}
        meta={(
          <>
            <span className="toolbar-meta-pill">النتائج: {props.summary?.totalSuppliers || props.rows.length}</span>
            <span className="toolbar-meta-pill">الرصيد: {props.selectedSupplier ? formatCurrency(props.selectedSupplier.balance || 0) : formatCurrency(props.totalBalance)}</span>
            {props.selectedSupplier ? <span className="toolbar-meta-pill">المحدد: {props.selectedSupplier.name}</span> : null}
          </>
        )}
        onReset={() => { props.setSearch(''); props.setFilterMode('all'); props.setPage(1); }}
        resetLabel="تفريغ"
      >
        <div className="filter-chip-row toolbar-chip-row">
          <Button variant={props.filterMode === 'all' ? 'primary' : 'secondary'} onClick={() => { props.setFilterMode('all'); props.setPage(1); }}>الكل</Button>
          <Button variant={props.filterMode === 'debt' ? 'primary' : 'secondary'} onClick={() => { props.setFilterMode('debt'); props.setPage(1); }}>عليهم رصيد</Button>
          <Button variant={props.filterMode === 'withNotes' ? 'primary' : 'secondary'} onClick={() => { props.setFilterMode('withNotes'); props.setPage(1); }}>لديهم ملاحظات</Button>
        </div>
      </SearchToolbar>
      {props.selectedIds.length ? <div className="bulk-toolbar"><div className="bulk-toolbar-meta"><strong>تحديد نشط: {props.selectedIds.length}</strong><span className="muted small">يمكنك حذف الموردين المحددين دفعة واحدة أو مسح التحديد الحالي.</span></div><div className="actions compact-actions"><Button variant="secondary" onClick={() => props.setSelectedIds([])}>مسح التحديد</Button><Button variant="danger" onClick={() => props.setBulkDeleteOpen(true)} disabled={!props.canDelete}>حذف المحدد</Button></div></div> : null}
      <QueryFeedback isLoading={props.suppliersQuery.isLoading} isError={props.suppliersQuery.isError} error={props.suppliersQuery.error} isEmpty={!props.rows.length} loadingText="جاري تحميل الموردين..." errorTitle="تعذر تحميل الموردين" emptyTitle="لا توجد نتائج مطابقة" emptyHint="غيّر البحث أو أضف موردًا جديدًا.">
        <DataTable rows={props.rows as Supplier[]} rowKey={(supplier) => String(supplier.id)} onRowClick={(supplier) => props.setSelectedSupplier(supplier)} rowClassName={(supplier) => props.selectedSupplier?.id === supplier.id ? 'table-row-selected' : undefined} rowTitle={(supplier) => `عرض وتعديل: ${supplier.name}`} selection={{ selectedKeys: props.selectedIds, onChange: props.setSelectedIds, checkboxLabel: (supplier) => `تحديد المورد ${supplier.name}` }} pagination={{ page: props.page, pageSize: props.pageSize, totalItems: props.summary?.totalSuppliers || props.rows.length, onPageChange: props.setPage, onPageSizeChange: (nextPageSize) => { props.setPageSize(nextPageSize); props.setPage(1); }, itemLabel: 'مورد' }} columns={[{ key: 'name', header: 'المورد', cell: (supplier) => <div><strong>{supplier.name}</strong><div className="muted small">{supplier.phone || 'بدون هاتف'} · {supplier.address || 'بدون عنوان'}</div></div> }, { key: 'balance', header: 'الرصيد', cell: (supplier) => formatCurrency(supplier.balance || 0) }, { key: 'notes', header: 'ملاحظات', cell: (supplier) => supplier.notes || '—' }, { key: 'actions', header: 'إجراءات', cell: (supplier) => <div className="actions" style={{ flexWrap: 'nowrap' }}><Button variant="secondary" onClick={(event) => { event.stopPropagation(); props.setSelectedSupplier(supplier); }}>تعديل</Button><Button variant="danger" onClick={(event) => { event.stopPropagation(); props.setSupplierToDelete(supplier); }} disabled={!props.canDelete}>حذف</Button></div> }]} />
      </QueryFeedback>
    </section>
  );
}
