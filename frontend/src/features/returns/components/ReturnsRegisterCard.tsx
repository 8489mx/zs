import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { formatCurrency, formatDate } from '@/lib/format';
import { getReturnDateValue, returnTypeLabel } from '@/features/returns/lib/returns-workspace.helpers';
import type { ReturnRecord } from '@/types/domain';

type Props = {
  search: string;
  viewFilter: 'all' | 'sales' | 'purchase' | 'today';
  page: number;
  pageSize: number;
  rows: ReturnRecord[];
  totalItems: number;
  selectedReturnId: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onReset: () => void;
  onFilterChange: (value: 'all' | 'sales' | 'purchase' | 'today') => void;
  onSelectReturn: (id: string) => void;
  onPrintReturn: (row: ReturnRecord) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function ReturnsRegisterCard({
  search,
  viewFilter,
  page,
  pageSize,
  rows,
  totalItems,
  selectedReturnId,
  isLoading,
  onSearchChange,
  onReset,
  onFilterChange,
  onSelectReturn,
  onPrintReturn,
  onPageChange,
  onPageSizeChange,
}: Props) {
  return (
    <Card title="سجل المرتجعات" actions={<span className="nav-pill">السجل</span>} className="workspace-panel returns-register-card">
      <SearchToolbar search={search} onSearchChange={onSearchChange} searchPlaceholder="ابحث برقم المستند أو الصنف أو الملاحظات">
        <Button variant="secondary" onClick={onReset}>إعادة الضبط</Button>
      </SearchToolbar>
      <div className="filter-chip-row">
        <Button variant={viewFilter === 'all' ? 'primary' : 'secondary'} onClick={() => onFilterChange('all')}>الكل</Button>
        <Button variant={viewFilter === 'sales' ? 'primary' : 'secondary'} onClick={() => onFilterChange('sales')}>مرتجع بيع</Button>
        <Button variant={viewFilter === 'purchase' ? 'primary' : 'secondary'} onClick={() => onFilterChange('purchase')}>مرتجع شراء</Button>
        <Button variant={viewFilter === 'today' ? 'primary' : 'secondary'} onClick={() => onFilterChange('today')}>اليوم</Button>
      </div>
      {isLoading ? <div className="loading-card">جاري تحميل المرتجعات...</div> : rows.length ? (
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.id)}
          rowClassName={(row) => selectedReturnId === String(row.id) ? 'table-row-selected' : ''}
          onRowClick={(row) => onSelectReturn(String(row.id))}
          rowTitle={() => 'انقر لعرض تفاصيل المرتجع'}
          pagination={{
            page,
            pageSize,
            totalItems,
            onPageChange,
            onPageSizeChange: (nextPageSize) => { onPageSizeChange(nextPageSize); onPageChange(1); },
            itemLabel: 'مرتجع'
          }}
          columns={[
            { key: 'docNo', header: 'رقم المستند', cell: (row) => row.docNo || '—' },
            { key: 'type', header: 'النوع', cell: (row) => returnTypeLabel(row) },
            { key: 'product', header: 'الصنف', cell: (row) => row.productName || '—' },
            { key: 'qty', header: 'الكمية', cell: (row) => row.qty },
            { key: 'total', header: 'الإجمالي', cell: (row) => formatCurrency(row.total) },
            { key: 'note', header: 'ملاحظات', cell: (row) => row.note || '—' },
            { key: 'date', header: 'التاريخ', cell: (row) => formatDate(getReturnDateValue(row)) },
            { key: 'actions', header: 'إجراءات', cell: (row) => <Button variant="secondary" onClick={(event) => { event.stopPropagation(); onPrintReturn(row); }}>طباعة</Button> }
          ]}
        />
      ) : <div className="empty-state-card">لا توجد مرتجعات حاليًا</div>}
    </Card>
  );
}
