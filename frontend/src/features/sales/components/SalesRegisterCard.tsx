import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QueryFeedback } from '@/components/shared/QueryFeedback';
import { SearchToolbar } from '@/components/shared/SearchToolbar';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { formatCurrency } from '@/lib/format';
import { SalesTable } from '@/features/sales/components/SalesTable';
import type { Sale } from '@/types/domain';

type Props = {
  search: string;
  viewFilter: 'all' | 'cash' | 'credit' | 'cancelled';
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
  salesNextStep: string;
  onSearchChange: (value: string) => void;
  onViewFilterChange: (value: 'all' | 'cash' | 'credit' | 'cancelled') => void;
  onReset: () => void;
  onSelectSale: (saleId: string) => void;
  onEditSale: (sale: Sale) => void;
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
    salesNextStep,
    onSearchChange,
    onViewFilterChange,
    onReset,
    onSelectSale,
    onEditSale,
    onCancelSale,
    onExportCsv,
    onPrintRegister,
    onPrintSale,
    onPageChange,
    onPageSizeChange,
  } = props;

  return (
    <Card title="سجل فواتير البيع" actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => void onExportCsv()} disabled={!totalItems}>تصدير CSV</Button><Button variant="secondary" onClick={() => void onPrintRegister()} disabled={!totalItems || !canPrint}>طباعة السجل</Button><span className="nav-pill">السجل</span></div>} className="workspace-panel sales-register-card">
      <SearchToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={SINGLE_STORE_MODE ? 'ابحث بالرقم أو العميل أو الحالة أو المخزن' : 'ابحث بالرقم أو العميل أو الحالة أو الفرع'}
        title="بحث وتصفية"
        description="فلترة سريعة لسجل المبيعات مع إبقاء الإجراء الحالي واضحًا في أعلى الجدول."
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
          <Button variant={viewFilter === 'all' ? 'primary' : 'secondary'} onClick={() => onViewFilterChange('all')}>الكل</Button>
          <Button variant={viewFilter === 'cash' ? 'primary' : 'secondary'} onClick={() => onViewFilterChange('cash')}>نقدي</Button>
          <Button variant={viewFilter === 'credit' ? 'primary' : 'secondary'} onClick={() => onViewFilterChange('credit')}>آجل</Button>
          <Button variant={viewFilter === 'cancelled' ? 'primary' : 'secondary'} onClick={() => onViewFilterChange('cancelled')}>ملغاة</Button>
        </div>
      </SearchToolbar>

      <div className="sales-action-strip">
        <div className="sales-action-card"><span>أفضل خطوة الآن</span><strong>{salesNextStep}</strong></div>
        <div className="sales-action-card"><span>نتائج النطاق</span><strong>{totalItems} فاتورة مطابقة</strong></div>
        <div className="sales-action-card"><span>المستند المحدد</span><strong>{selectedSale ? (selectedSale.docNo || selectedSale.id) : 'لم يتم التحديد بعد'}</strong></div>
      </div>

      <QueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!rows.length && !isLoading}
        loadingText="جاري تحميل فواتير البيع..."
        emptyTitle="لا توجد فواتير بيع مطابقة"
        emptyHint="جرّب إزالة البحث أو أنشئ فاتورة جديدة من شاشة نقطة البيع."
      >
        <SalesTable
          rows={rows}
          selectedId={selectedSaleId}
          onSelect={(sale) => onSelectSale(sale.id)}
          onEdit={canEditInvoices ? onEditSale : undefined}
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
