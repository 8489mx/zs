import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { PaginationControls } from '@/shared/components/pagination-controls';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { formatCurrency } from '@/lib/format';
import { SalesTable } from '@/features/sales/components/SalesTable';
import type { SalesListFilter } from '@/features/sales/api/sales.api';
import type { Sale } from '@/types/domain';

export type SalesPaymentFilter = SalesListFilter;

type Props = {
  search: string;
  viewFilter: SalesPaymentFilter;
  activeFilterLabel: string;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  totalSales: number;
  selectedSale: Sale | null | undefined;
  selectedSaleId: string;
  rows: Sale[];
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  canPrint: boolean;
  canEditInvoices: boolean;
  onSearchChange: (value: string) => void;
  onViewFilterChange: (value: SalesPaymentFilter) => void;
  onReset: () => void;
  onSelectSale: (saleId: string) => void;
  onCancelSale: (sale: Sale) => void;
  onExportCsv: () => void | Promise<void>;
  onPrintRegister: () => void | Promise<void>;
  onPrintSale: (sale: Sale) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function SalesRegisterCard(props: Props) {
  const {
    search,
    viewFilter,
    activeFilterLabel,
    totalItems,
    rangeStart,
    rangeEnd,
    totalSales,
    selectedSale,
    selectedSaleId,
    rows,
    page,
    pageSize,
    totalPages,
    isLoading,
    isError,
    error,
    canPrint,
    canEditInvoices,
    onSearchChange,
    onViewFilterChange,
    onReset,
    onSelectSale,
    onCancelSale,
    onExportCsv,
    onPrintRegister,
    onPrintSale,
    onPageChange,
    onPageSizeChange,
  } = props;

  return (
    <Card
      title="1. راجع سجل الفواتير"
      description="ابحث عن الفاتورة أولًا ثم اخترها لتظهر التفاصيل والإجراءات في العمود الجانبي."
      actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => void onExportCsv()} disabled={!totalItems}>تصدير CSV</Button><Button variant="secondary" onClick={() => void onPrintRegister()} disabled={!totalItems || !canPrint}>طباعة السجل</Button><span className="nav-pill">السجل</span></div>}
      className="workspace-panel sales-register-card"
    >
      <SearchToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={SINGLE_STORE_MODE ? 'ابحث بالرقم أو العميل أو الحالة أو المخزن' : 'ابحث بالرقم أو العميل أو الحالة أو الفرع'}
        actions={<span className="nav-pill">{activeFilterLabel}</span>}
        meta={(
          <>
            <span className="toolbar-meta-pill">النتائج: {totalItems}</span>
            <span className="toolbar-meta-pill">المعروض: {rangeStart}-{rangeEnd}</span>
            <span className="toolbar-meta-pill">الإجمالي: {formatCurrency(totalSales)}</span>
            <span className="toolbar-meta-pill">المحدد: {selectedSale ? (selectedSale.docNo || selectedSale.id) : 'لا يوجد'}</span>
          </>
        )}
        onReset={onReset}
        resetLabel="تفريغ"
      >
        <div className="filter-chip-row toolbar-chip-row">
          <div className="field sales-payment-filter-field">
            <span>طريقة الدفع</span>
            <select value={viewFilter} onChange={(event) => onViewFilterChange(event.target.value as SalesPaymentFilter)}>
              <option value="all">الكل</option>
              <option value="cash">نقدي</option>
              <option value="card">فيزا</option>
              <option value="credit">آجل</option>
              <option value="wallet">محفظة إلكترونية</option>
              <option value="instapay">InstaPay</option>
              <option value="mixed">مختلط</option>
            </select>
          </div>
        </div>
      </SearchToolbar>

      <QueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!rows.length && !isLoading}
        loadingText="جاري تحميل فواتير البيع..."
        emptyTitle="لا توجد فواتير مطابقة"
        emptyHint="غيّر البحث أو افتح الكاشير لإنشاء فاتورة جديدة."
      >
        <SalesTable
          rows={rows}
          selectedId={selectedSaleId}
          onSelect={(sale) => onSelectSale(sale.id)}
          onCancel={canEditInvoices ? onCancelSale : undefined}
          onPrint={canPrint ? onPrintSale : undefined}
        />
        <PaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={[15, 30, 50, 100]}
          totalItems={totalItems}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel="فاتورة"
        />
      </QueryFeedback>
    </Card>
  );
}
