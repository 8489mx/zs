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
  shiftFilter: 'all' | 'open' | 'closed' | 'variance' | 'today';
  onShiftFilterChange: (value: 'all' | 'open' | 'closed' | 'variance' | 'today') => void;
  onReset: () => void;
  onCopySummary: () => void;
  onExportRows: () => void;
  onPrintRows: () => void;
  totalItems: number;
  rows: CashierShift[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  page: number;
  pageSize: number;
  totalPaginationItems: number;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
}

export function CashDrawerShiftsCard(props: CashDrawerShiftsCardProps) {
  return (
    <Card
      title="الورديات الحالية"
      actions={
        <div className="actions compact-actions">
          <Button variant="secondary" onClick={props.onCopySummary} disabled={!props.totalItems}>نسخ الملخص</Button>
          <Button variant="secondary" onClick={props.onExportRows} disabled={!props.totalItems}>تصدير CSV</Button>
          <Button variant="secondary" onClick={props.onPrintRows} disabled={!props.totalItems}>طباعة النتائج</Button>
        </div>
      }
      className="cash-drawer-shifts-card"
    >
      <div className="filter-chip-row">
        <Button variant={props.shiftFilter === 'all' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('all')}>الكل</Button>
        <Button variant={props.shiftFilter === 'open' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('open')}>مفتوحة</Button>
        <Button variant={props.shiftFilter === 'closed' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('closed')}>مغلقة</Button>
        <Button variant={props.shiftFilter === 'variance' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('variance')}>بفروقات</Button>
        <Button variant={props.shiftFilter === 'today' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('today')}>اليوم</Button>
      </div>
      <SearchToolbar search={props.search} onSearchChange={props.onSearchChange} searchPlaceholder={SINGLE_STORE_MODE ? 'ابحث برقم الوردية أو المخزن أو المنفذ' : 'ابحث برقم الوردية أو الفرع أو الموقع أو المنفذ'}>
        <Button variant="secondary" onClick={props.onReset}>إعادة الضبط</Button>
      </SearchToolbar>
      <QueryFeedback
        isLoading={props.isLoading}
        isError={props.isError}
        error={props.error}
        isEmpty={!props.totalItems}
        loadingText="جاري تحميل الورديات..."
        errorTitle="تعذر تحميل الورديات"
        emptyTitle="لا توجد ورديات مطابقة حاليًا"
        emptyHint="افتح وردية جديدة أو وسّع شروط البحث الحالية."
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
            itemLabel: 'وردية'
          }}
          columns={[
            { key: 'docNo', header: 'رقم الوردية', cell: (row: CashierShift) => row.docNo || row.id },
            { key: 'status', header: 'الحالة', cell: (row: CashierShift) => row.status === 'open' ? 'مفتوحة' : 'مغلقة' },
            ...(!SINGLE_STORE_MODE ? [{ key: 'branch', header: 'الفرع', cell: (row: CashierShift) => row.branchName || '—' }] : []),
            { key: 'location', header: SINGLE_STORE_MODE ? 'المخزن' : 'الموقع', cell: (row: CashierShift) => row.locationName || '—' },
            { key: 'opening', header: 'رصيد الفتح', cell: (row: CashierShift) => formatCurrency(row.openingCash) },
            { key: 'expected', header: 'المتوقع', cell: (row: CashierShift) => formatCurrency(row.expectedCash) },
            { key: 'counted', header: 'المعدود', cell: (row: CashierShift) => formatCurrency(row.countedCash || 0) },
            { key: 'variance', header: 'الفرق', cell: (row: CashierShift) => formatCurrency(row.variance) },
            { key: 'openBy', header: 'فتح بواسطة', cell: (row: CashierShift) => row.openedByName || '—' },
            { key: 'date', header: 'تاريخ الفتح', cell: (row: CashierShift) => formatDate(row.createdAt) }
          ]}
        />
      </QueryFeedback>
    </Card>
  );
}
