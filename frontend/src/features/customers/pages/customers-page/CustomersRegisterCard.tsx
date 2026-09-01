import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { formatCurrency } from '@/lib/format';
import type { Customer } from '@/types/domain';

interface CustomersRegisterCardProps {
  search: string;
  setSearch: (value: string) => void;
  filterMode: 'all' | 'vip' | 'debt' | 'cash';
  setFilterMode: (value: 'all' | 'vip' | 'debt' | 'cash') => void;
  setPage: (value: number) => void;
  copyCustomersSummary: () => Promise<void> | void;
  printCustomersRegister: () => void;
  rows: Customer[];
  canPrint: boolean;
  summary?: { totalCustomers?: number } | null;
  selectedCustomer: Customer | null;
  totalBalance: number;
  selectedIds: string[];
  setSelectedIds: (value: string[]) => void;
  setBulkDeleteOpen: (value: boolean) => void;
  canDelete: boolean;
  customersQuery: { isLoading: boolean; isError: boolean; error: unknown };
  page: number;
  pageSize: number;
  setPageSize: (value: number) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setCustomerToDelete: (customer: Customer | null) => void;
  onOpenCreate?: () => void;
}

export function CustomersRegisterCard(props: CustomersRegisterCardProps) {
  return (
    <section className="document-prototype-section">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">العملاء الحاليون</h3>
        <div className="section-header-actions-group">
          {props.onOpenCreate && <Button variant="primary" onClick={props.onOpenCreate} className="section-header-action-btn">+ عميل جديد</Button>}
          <Button variant="secondary" onClick={() => { props.setSearch(''); props.setFilterMode('all'); props.setPage(1); }} className="section-header-action-btn" style={{ marginInlineStart: '6px' }}>إلغاء الفلاتر</Button>
        </div>
      </div>
      <p className="muted small section-header-subtitle">
        فلترة سريعة مع ملخصات وإمكانية التعديل والإضافة المباشرة.
      </p>
      <SearchToolbar
        search={props.search}
        onSearchChange={(value) => { props.setSearch(value); props.setPage(1); }}
        searchPlaceholder="ابحث بالاسم أو الهاتف أو العنوان أو النوع"
        title="بحث وتصفية"
        description="ابدأ بالفلتر المناسب ثم اختر العميل المطلوب لتظهر لوحة التعديل فورًا."
        actions={<span className="nav-pill">{props.filterMode === 'all' ? 'كل العملاء' : props.filterMode === 'vip' ? 'VIP' : props.filterMode === 'debt' ? 'عليهم رصيد' : 'نقدي'}</span>}
        meta={(
          <>
            <span className="toolbar-meta-pill">النتائج: {props.summary?.totalCustomers || props.rows.length}</span>
            <span className="toolbar-meta-pill">الرصيد: {props.selectedCustomer ? formatCurrency(props.selectedCustomer.balance || 0) : formatCurrency(props.totalBalance)}</span>
            {props.selectedCustomer ? <span className="toolbar-meta-pill">المحدد: {props.selectedCustomer.name}</span> : null}
          </>
        )}
        onReset={() => { props.setSearch(''); props.setFilterMode('all'); props.setPage(1); }}
        resetLabel="تفريغ"
      >
        <div className="filter-chip-row toolbar-chip-row">
          <Button variant={props.filterMode === 'all' ? 'primary' : 'secondary'} onClick={() => { props.setFilterMode('all'); props.setPage(1); }}>الكل</Button>
          <Button variant={props.filterMode === 'vip' ? 'primary' : 'secondary'} onClick={() => { props.setFilterMode('vip'); props.setPage(1); }}>VIP</Button>
          <Button variant={props.filterMode === 'debt' ? 'primary' : 'secondary'} onClick={() => { props.setFilterMode('debt'); props.setPage(1); }}>عليهم رصيد</Button>
          <Button variant={props.filterMode === 'cash' ? 'primary' : 'secondary'} onClick={() => { props.setFilterMode('cash'); props.setPage(1); }}>نقدي</Button>
        </div>
      </SearchToolbar>
      {props.selectedIds.length ? <div className="bulk-toolbar"><div className="bulk-toolbar-meta"><strong>تحديد نشط: {props.selectedIds.length}</strong><span className="muted small">يمكنك حذف العملاء المحددين دفعة واحدة أو مسح التحديد الحالي.</span></div><div className="actions compact-actions"><Button variant="secondary" onClick={() => props.setSelectedIds([])}>مسح التحديد</Button><Button variant="danger" onClick={() => props.setBulkDeleteOpen(true)} disabled={!props.canDelete}>حذف المحدد</Button></div></div> : null}
      <QueryFeedback isLoading={props.customersQuery.isLoading} isError={props.customersQuery.isError} error={props.customersQuery.error} isEmpty={!props.rows.length} loadingText="جاري تحميل العملاء..." errorTitle="تعذر تحميل العملاء" emptyTitle="لا توجد نتائج مطابقة" emptyHint="جرّب تغيير الفلاتر أو أضف عميلًا جديدًا.">
        <DataTable rows={props.rows as Customer[]} rowKey={(customer) => String(customer.id)} onRowClick={(customer) => props.setSelectedCustomer(customer)} rowClassName={(customer) => props.selectedCustomer?.id === customer.id ? 'table-row-selected' : undefined} rowTitle={(customer) => `عرض وتعديل: ${customer.name}`} selection={{ selectedKeys: props.selectedIds, onChange: props.setSelectedIds, checkboxLabel: (customer) => `تحديد العميل ${customer.name}` }} pagination={{ page: props.page, pageSize: props.pageSize, totalItems: props.summary?.totalCustomers || props.rows.length, onPageChange: props.setPage, onPageSizeChange: (nextPageSize) => { props.setPageSize(nextPageSize); props.setPage(1); }, itemLabel: 'عميل' }} columns={[{ key: 'name', header: 'العميل', cell: (customer) => <div><strong>{customer.name}</strong><div className="muted small">{customer.phone || 'بدون هاتف'} · {customer.address || 'بدون عنوان'}</div></div> }, { key: 'type', header: 'النوع', cell: (customer) => {
          if (customer.type === 'vip') return <span style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', fontSize: '12px', display: 'inline-block' }}>VIP مميز</span>;
          if (customer.type === 'credit') return <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', fontSize: '12px', display: 'inline-block' }}>آجل</span>;
          if (customer.type === 'wholesale') return <span style={{ background: '#dcfce7', color: '#166534', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', fontSize: '12px', display: 'inline-block' }}>جملة</span>;
          return <span style={{ background: '#f1f5f9', color: '#475569', fontWeight: 500, padding: '2px 8px', borderRadius: '6px', fontSize: '12px', display: 'inline-block' }}>عادي</span>;
        } }, { key: 'balance', header: 'الرصيد', cell: (customer) => formatCurrency(customer.balance || 0) }, { key: 'creditLimit', header: 'حد الائتمان', cell: (customer) => formatCurrency(customer.creditLimit || 0) }, { key: 'actions', header: 'إجراءات', cell: (customer) => <div className="actions" style={{ flexWrap: 'nowrap' }}><Button variant="secondary" onClick={(event) => { event.stopPropagation(); props.setSelectedCustomer(customer); }}>تعديل</Button><Button variant="danger" onClick={(event) => { event.stopPropagation(); props.setCustomerToDelete(customer); }} disabled={!props.canDelete}>حذف</Button></div> }]} />
      </QueryFeedback>
    </section>
  );
}
