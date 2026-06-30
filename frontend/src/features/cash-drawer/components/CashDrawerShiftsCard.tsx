import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { CashierShift } from '@/types/domain';

interface CashDrawerShiftsCardProps {
  search: string;
  onSearchChange: (value: string) => void;
  shiftFilter: 'all' | 'open' | 'closed' | 'pending_review' | 'variance' | 'today';
  onShiftFilterChange: (value: 'all' | 'open' | 'closed' | 'pending_review' | 'variance' | 'today') => void;
  onReset: () => void;
  onCopySummary: () => void;
  onExportRows: () => void;
  onPrintRows: () => void;
  onReviewShift?: (shift: CashierShift) => void;
  canReviewPending?: boolean;
  pendingReviewCount?: number;
  totalItems: number;
  rows: CashierShift[];
  canViewSensitiveTotals?: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  page: number;
  pageSize: number;
  totalPaginationItems: number;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
}

function getDisplaySaleReturnCashRefundTotal(row: CashierShift): number {
  const rawTotal = Number(row.saleReturnCashRefundTotal || 0);
  if (rawTotal > 0) return rawTotal;
  const inferredTotal = Number(row.openingCash || 0) + Number(row.cashSalesTotal || 0) + Number(row.serviceCashTotal || 0) + Number(row.cashDrawerMovementTotal || 0) - Number(row.expectedCash || 0);
  return Math.max(0, Number(inferredTotal.toFixed(2)));
}

function getShiftStatusLabel(status: string) {
  if (status === 'open') return 'مفتوحة';
  if (status === 'pending_review') return 'في انتظار مراجعة المدير';
  if (status === 'closed') return 'مغلقة';
  return status || 'غير محدد';
}

export function CashDrawerShiftsCard(props: CashDrawerShiftsCardProps) {
  const canViewSensitiveTotals = props.canViewSensitiveTotals !== false;
  const canReviewPending = props.canReviewPending === true && typeof props.onReviewShift === 'function';
  const searchPlaceholder = SINGLE_STORE_MODE
    ? 'ابحث باسم المستخدم أو رقم المرجع أو المخزن'
    : 'ابحث باسم المستخدم أو رقم المرجع أو الفرع أو المخزن';

  const baseColumns = [
    {
      key: 'shiftName',
      header: 'وردية نقطة البيع',
      cell: (row: CashierShift) => (
        <div className="page-stack" style={{ gap: 4 }}>
          <strong>{row.openedByName || row.docNo || row.id || '—'}</strong>
          <span className="muted small">المرجع الداخلي: {row.docNo || row.id || '—'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row: CashierShift) => {
        const status = String(row.status || '');
        if (status === 'pending_review') return <span className="cash-drawer-pending-badge">في انتظار مراجعة المدير</span>;
        return getShiftStatusLabel(status);
      },
    },
    ...(!SINGLE_STORE_MODE ? [{ key: 'branch', header: 'الفرع', cell: (row: CashierShift) => row.branchName || '—' }] : []),
    { key: 'location', header: 'المخزن', cell: (row: CashierShift) => row.locationName || '—' },
    { key: 'opening', header: 'رصيد الفتح', cell: (row: CashierShift) => formatCurrency(row.openingCash) },
  ];

  const sensitiveColumns = canViewSensitiveTotals ? [
    { key: 'cashSales', header: 'مبيعات نقدي', cell: (row: CashierShift) => formatCurrency(row.cashSalesTotal || 0) },
    { key: 'cardSales', header: 'مبيعات فيزا', cell: (row: CashierShift) => formatCurrency(row.cardSalesTotal || 0) },
    { key: 'serviceCash', header: 'خدمات نقدي', cell: (row: CashierShift) => formatCurrency(row.serviceCashTotal || 0) },
    { key: 'serviceCard', header: 'خدمات فيزا', cell: (row: CashierShift) => formatCurrency(row.serviceCardTotal || 0) },
    { key: 'saleReturnCash', header: 'مرتجعات نقدي', cell: (row: CashierShift) => formatCurrency(getDisplaySaleReturnCashRefundTotal(row)) },
    { key: 'saleReturnCard', header: 'مرتجعات فيزا', cell: (row: CashierShift) => formatCurrency(row.saleReturnCardRefundTotal || 0) },
    { key: 'salesTotal', header: 'إجمالي المبيعات', cell: (row: CashierShift) => formatCurrency(row.shiftSalesTotal || 0) },
    { key: 'expected', header: 'نقدية متوقعة', cell: (row: CashierShift) => formatCurrency(row.expectedCash) },
    { key: 'counted', header: 'المعدود', cell: (row: CashierShift) => formatCurrency(row.countedCash || 0) },
    { key: 'variance', header: 'الفرق', cell: (row: CashierShift) => formatCurrency(row.variance) },
  ] : [
    { key: 'counted', header: 'النقدية المعدودة', cell: (row: CashierShift) => formatCurrency(row.countedCash || 0) },
  ];

  const trailingColumns = [
    { key: 'openBy', header: 'فتح بواسطة', cell: (row: CashierShift) => row.openedByName || '—' },
    { key: 'date', header: 'تاريخ الفتح', cell: (row: CashierShift) => formatDate(row.createdAt) },
    ...(canReviewPending ? [{
      key: 'reviewAction',
      header: 'إجراءات',
      cell: (row: CashierShift) => (String(row.status || '') === 'pending_review' ? <Button variant="secondary" onClick={() => props.onReviewShift?.(row)}>مراجعة الإغلاق</Button> : '—'),
    }] : []),
  ];

  return (
    <Card
      title="ورديات نقطة البيع الحالية"
      actions={canViewSensitiveTotals ? (
        <div className="actions compact-actions">
          <Button variant="secondary" onClick={props.onCopySummary} disabled={!props.totalItems}>نسخ الملخص</Button>
          <Button variant="secondary" onClick={props.onExportRows} disabled={!props.totalItems}>تصدير Excel</Button>
          <Button variant="secondary" onClick={props.onPrintRows} disabled={!props.totalItems}>طباعة النتائج</Button>
        </div>
      ) : undefined}
      className="cash-drawer-shifts-card"
    >
      <div className="filter-chip-row">
        <Button variant={props.shiftFilter === 'all' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('all')}>الكل</Button>
        <Button variant={props.shiftFilter === 'open' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('open')}>مفتوحة</Button>
        <Button variant={props.shiftFilter === 'closed' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('closed')}>مغلقة</Button>
        {canReviewPending ? (
          <Button variant={props.shiftFilter === 'pending_review' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('pending_review')}>
            في انتظار مراجعة المدير{typeof props.pendingReviewCount === 'number' ? ` (${props.pendingReviewCount})` : ''}
          </Button>
        ) : null}
        <Button variant={props.shiftFilter === 'variance' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('variance')}>بفروقات</Button>
        <Button variant={props.shiftFilter === 'today' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('today')}>اليوم</Button>
      </div>
      <SearchToolbar search={props.search} onSearchChange={props.onSearchChange} searchPlaceholder={searchPlaceholder}>
        <Button variant="secondary" onClick={props.onReset}>إعادة الضبط</Button>
      </SearchToolbar>
      <QueryFeedback
        isLoading={props.isLoading}
        isError={props.isError}
        error={props.error}
        isEmpty={!props.totalItems}
        loadingText="جاري تحميل ورديات نقطة البيع..."
        errorTitle="تعذر تحميل ورديات نقطة البيع"
        emptyTitle="لا توجد ورديات نقطة بيع مطابقة حاليًا"
        emptyHint="افتح وردية نقطة بيع جديدة أو وسّع شروط البحث الحالية."
      >
        <DataTable
          rows={props.rows}
          pagination={{
            page: props.page,
            pageSize: props.pageSize,
            totalItems: props.totalPaginationItems,
            onPageChange: props.onPageChange,
            onPageSizeChange: props.onPageSizeChange,
            pageSizeOptions: [10, 20, 50, 100],
            itemLabel: 'وردية نقطة بيع',
          }}
          columns={[...baseColumns, ...sensitiveColumns, ...trailingColumns]}
        />
      </QueryFeedback>
    </Card>
  );
}
