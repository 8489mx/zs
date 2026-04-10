import { Card } from '@/shared/ui/card';
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
}

export function CustomersRegisterCard(props: CustomersRegisterCardProps) {
  return (
    <Card title="العملاء الحاليون" description="فلترة سريعة مع ملخصات وطباعة للسجل الحالي." actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => { props.setSearch(''); props.setFilterMode('all'); props.setPage(1); }}>إلغاء الفلاتر</Button><Button variant="secondary" onClick={() => void props.copyCustomersSummary()} disabled={!props.summary?.totalCustomers}>نسخ الملخص</Button><Button variant="secondary" onClick={props.printCustomersRegister} disabled={!props.rows.length || !props.canPrint}>طباعة السجل</Button><span className="nav-pill">السجل</span></div>}>
      <SearchToolbar
        search={props.search}
        onSearchChange={(value) => { props.setSearch(value); props.setPage(1); }}
        searchPlaceholder="ابحث بالاسم أو الهاتف أو العنوان أو النوع"
        title="بحث وتصفية"
        description="ابدأ بالفلتر المناسب ثم اختر العميل المطلوب لتظهر لوحة التعديل فورًا."
        actions={<span className="nav-pill">{props.filterMode === 'all' ? 'كل العملاء' : props.filterMode === 'vip' ? 'VIP' : props.filterMode === 'debt' ? 'عليهم رصيد' : 'نقدي'}</span>}
        meta={<><span className="toolbar-meta-pill">النتائج: {props.summary?.totalCustomers || props.rows.length}</span><span className="toolbar-meta-pill">المحدد: {props.selectedCustomer?.name || 'لا يوجد'}</span><span className="toolbar-meta-pill">الرصيد: {props.selectedCustomer ? formatCurrency(props.selectedCustomer.balance || 0) : formatCurrency(props.totalBalance)}</span></>}
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
        <DataTable rows={props.rows as Customer[]} rowKey={(customer) => String(customer.id)} onRowClick={(customer) => props.setSelectedCustomer(customer)} rowClassName={(customer) => props.selectedCustomer?.id === customer.id ? 'table-row-selected' : undefined} rowTitle={(customer) => `عرض وتعديل: ${customer.name}`} selection={{ selectedKeys: props.selectedIds, onChange: props.setSelectedIds, checkboxLabel: (customer) => `تحديد العميل ${customer.name}` }} pagination={{ page: props.page, pageSize: props.pageSize, totalItems: props.summary?.totalCustomers || props.rows.length, onPageChange: props.setPage, onPageSizeChange: (nextPageSize) => { props.setPageSize(nextPageSize); props.setPage(1); }, itemLabel: 'عميل' }} columns={[{ key: 'name', header: 'العميل', cell: (customer) => <div><strong>{customer.name}</strong><div className="muted small">{customer.phone || 'بدون هاتف'} · {customer.address || 'بدون عنوان'}</div></div> }, { key: 'type', header: 'النوع', cell: (customer) => customer.type === 'vip' ? 'مميز' : 'نقدي' }, { key: 'balance', header: 'الرصيد', cell: (customer) => formatCurrency(customer.balance || 0) }, { key: 'creditLimit', header: 'حد الائتمان', cell: (customer) => formatCurrency(customer.creditLimit || 0) }, { key: 'actions', header: 'إجراءات', cell: (customer) => <div className="actions"><Button variant="secondary" onClick={(event) => { event.stopPropagation(); props.setSelectedCustomer(customer); }}>تعديل</Button><Button variant="danger" onClick={(event) => { event.stopPropagation(); props.setCustomerToDelete(customer); }} disabled={!props.canDelete}>حذف</Button></div> }]} />
      </QueryFeedback>
    </Card>
  );
}
