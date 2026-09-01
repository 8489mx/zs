import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
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
  employeeFilter: string;
  onEmployeeFilterChange: (value: string) => void;
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
  employeeFilter,
  onEmployeeFilterChange,
  onSelectReturn,
  onPrintReturn,
  onPageChange,
  onPageSizeChange,
}: Props) {
  return (
    <section className="document-prototype-section workspace-panel returns-register-card">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">سجل المرتجعات</h3>
      </div>
      <div className="filter-chip-row" style={{ marginTop: '8px' }}>
        <Button variant={viewFilter === 'all' ? 'primary' : 'secondary'} onClick={() => onFilterChange('all')}>الكل</Button>
        <Button variant={viewFilter === 'sales' ? 'primary' : 'secondary'} onClick={() => onFilterChange('sales')}>مرتجع بيع</Button>
        <Button variant={viewFilter === 'purchase' ? 'primary' : 'secondary'} onClick={() => onFilterChange('purchase')}>مرتجع شراء</Button>
        <Button variant={viewFilter === 'today' ? 'primary' : 'secondary'} onClick={() => onFilterChange('today')}>اليوم</Button>
      </div>
      <SearchToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="ابحث برقم المستند أو الصنف أو الملاحظات"
        title="بحث وتصفية"
        actions={<span className="nav-pill">{viewFilter === 'all' ? 'كل المرتجعات' : viewFilter === 'sales' ? 'مرتجع بيع' : viewFilter === 'purchase' ? 'مرتجع شراء' : 'اليوم'}</span>}
        onReset={onReset}
        resetLabel="تفريغ"
      >
        <Field label="منفذ المرتجع">
          <input
            value={employeeFilter}
            onChange={(event) => onEmployeeFilterChange(event.target.value)}
            placeholder="اسم منفذ المرتجع"
          />
        </Field>
      </SearchToolbar>
      {isLoading ? <div className="loading-card">جاري تحميل المرتجعات...</div> : rows.length ? (
        <div style={{ overflowX: 'auto', width: '100%' }}>
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
              { key: 'docNo', header: 'رقم المستند', cell: (row) => <div><strong>{row.docNo || '—'}</strong>{row.invoiceDocNo ? <div className="muted small" style={{ fontSize: '0.78rem' }}>أصل: {row.invoiceDocNo}</div> : null}</div> },
              { key: 'type', header: 'النوع', cell: (row) => returnTypeLabel(row) },
              { key: 'party', header: 'الجهة / العميل', cell: (row) => row.partyName || '—' },
              { key: 'product', header: 'الصنف', cell: (row) => row.productName || '—' },
              { key: 'qty', header: 'الكمية', cell: (row) => row.qty },
              { key: 'total', header: 'المسترد', cell: (row) => formatCurrency(row.total) },
              { key: 'note', header: 'ملاحظات', cell: (row) => row.note || '—' },
              { key: 'date', header: 'التاريخ', cell: (row) => formatDate(getReturnDateValue(row)) },
              { key: 'createdBy', header: 'منفذ المرتجع', cell: (row) => row.createdByName || row.createdBy || '—' },
              { key: 'actions', header: 'إجراءات', cell: (row) => <div className="actions compact-actions" style={{ flexWrap: 'nowrap' }}><Button variant="secondary" onClick={(event) => { event.stopPropagation(); onPrintReturn(row); }}>طباعة</Button></div> }
            ]}
          />
        </div>
      ) : <div className="empty-state-card">لا توجد مرتجعات حاليًا</div>}
    </section>
  );
}
