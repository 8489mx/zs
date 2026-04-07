import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { PaginationControls } from '@/shared/components/pagination-controls';
import { formatCurrency } from '@/lib/format';
import { PurchasesTable } from '@/features/purchases/components/PurchasesTable';
import { printPurchaseDocument } from '@/features/purchases/lib/purchases-workspace.helpers';
import type { Purchase } from '@/types/domain';
import type { PurchasesListSummary } from '@/features/purchases/api/purchases.api';

interface Props {
  search: string;
  setSearch: (value: string) => void;
  activeFilterLabel: string;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  summary: PurchasesListSummary | null | undefined;
  selectedPurchase: Purchase | null;
  viewFilter: 'all' | 'cash' | 'credit' | 'cancelled';
  setViewFilter: (value: 'all' | 'cash' | 'credit' | 'cancelled') => void;
  resetPurchasesView: () => void;
  exportPurchasesCsv: () => Promise<void> | void;
  printPurchasesRegister: () => Promise<void> | void;
  purchasesQuery: { purchasesQuery: { isLoading: boolean; isError: boolean; error: unknown } };
  rows: Purchase[];
  selectedPurchaseId: string;
  setSelectedPurchaseId: (value: string) => void;
  canEditInvoices: boolean;
  canPrint: boolean;
  setPurchaseToEdit: (value: Purchase | null) => void;
  setPurchaseToCancel: (value: Purchase | null) => void;
  pagination: { page?: number; totalPages?: number; pageSize?: number } | null | undefined;
  page: number;
  pageSize: number;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
}

export function PurchasesRegisterCard(props: Props) {
  const queryState = props.purchasesQuery.purchasesQuery;
  return (
    <Card title="سجل فواتير الشراء" description="حافظنا على نفس أدوات السجل لكن نقلناها إلى سطح أكثر هدوءًا: البحث، الفلاتر، التصدير، والطباعة كلها في مسار واحد." actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => void props.exportPurchasesCsv()} disabled={!props.totalItems}>تصدير CSV</Button><Button variant="secondary" onClick={() => void props.printPurchasesRegister()} disabled={!props.totalItems}>طباعة السجل</Button><span className="nav-pill">السجل</span></div>} className="workspace-panel purchases-register-card">
      <SearchToolbar
        search={props.search}
        onSearchChange={props.setSearch}
        searchPlaceholder="ابحث بالرقم أو المورد أو الحالة أو الفرع"
        title="بحث وتصفية"
        description="فلترة سريعة لسجل المشتريات مع إبقاء الإجراء الحالي واضحًا في أعلى الجدول."
        actions={<span className="nav-pill">{props.activeFilterLabel}</span>}
        meta={<><span className="toolbar-meta-pill">النتائج: {props.totalItems}</span><span className="toolbar-meta-pill">المعروض: {props.rangeStart}-{props.rangeEnd}</span><span className="toolbar-meta-pill">الإجمالي: {formatCurrency(props.summary?.totalAmount || 0)}</span><span className="toolbar-meta-pill">المحدد: {props.selectedPurchase ? (props.selectedPurchase.docNo || props.selectedPurchase.id) : 'لا يوجد'}</span></>}
        onReset={props.resetPurchasesView}
        resetLabel="تفريغ"
      >
        <div className="filter-chip-row toolbar-chip-row">
          <Button variant={props.viewFilter === 'all' ? 'primary' : 'secondary'} onClick={() => props.setViewFilter('all')}>الكل</Button>
          <Button variant={props.viewFilter === 'cash' ? 'primary' : 'secondary'} onClick={() => props.setViewFilter('cash')}>نقدي</Button>
          <Button variant={props.viewFilter === 'credit' ? 'primary' : 'secondary'} onClick={() => props.setViewFilter('credit')}>آجل</Button>
          <Button variant={props.viewFilter === 'cancelled' ? 'primary' : 'secondary'} onClick={() => props.setViewFilter('cancelled')}>ملغاة</Button>
        </div>
      </SearchToolbar>
      <QueryFeedback isLoading={queryState.isLoading} isError={queryState.isError} error={queryState.error} isEmpty={!props.rows.length && !queryState.isLoading} loadingText="جاري تحميل فواتير الشراء..." emptyTitle="لا توجد فواتير شراء مطابقة" emptyHint="أضف أول فاتورة من نموذج الإنشاء أعلاه أو غيّر البحث الحالي.">
        <PurchasesTable
          rows={props.rows}
          selectedId={props.selectedPurchaseId}
          onSelect={(purchase) => props.setSelectedPurchaseId(purchase.id)}
          onEdit={props.canEditInvoices ? (purchase) => { props.setSelectedPurchaseId(purchase.id); props.setPurchaseToEdit(purchase); } : undefined}
          onCancel={props.canEditInvoices ? (purchase) => props.setPurchaseToCancel(purchase) : undefined}
          onPrint={props.canPrint ? (purchase) => printPurchaseDocument(purchase) : undefined}
        />
        <PaginationControls page={props.pagination?.page || props.page} totalPages={props.pagination?.totalPages || 1} pageSize={props.pagination?.pageSize || props.pageSize} pageSizeOptions={[15, 25, 50, 100]} totalItems={props.totalItems} rangeStart={props.rangeStart} rangeEnd={props.rangeEnd} onPageChange={props.setPage} onPageSizeChange={(nextPageSize) => { props.setPageSize(nextPageSize); props.setPage(1); }} itemLabel="فاتورة" />
      </QueryFeedback>
    </Card>
  );
}
