import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { SearchToolbar } from '@/components/shared/SearchToolbar';
import { QueryFeedback } from '@/components/shared/QueryFeedback';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { formatScopeLabel, type TreasuryTransactionFilter, type TreasuryTransactionRow } from '@/features/treasury/lib/treasury-page.helpers';

export function TreasuryTransactionsCard({ search, onSearchChange, txnFilter, onTxnFilterChange, onReset, onExport, onPrint, isExporting, transactionsQuery, transactionRows, transactionPagination, txnPageSize, setTxnPage, setTxnPageSize }: {
  search: string;
  onSearchChange: (value: string) => void;
  txnFilter: TreasuryTransactionFilter;
  onTxnFilterChange: (value: TreasuryTransactionFilter) => void;
  onReset: () => void;
  onExport: () => void;
  onPrint: () => void;
  isExporting: boolean;
  transactionsQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  transactionRows: TreasuryTransactionRow[];
  transactionPagination?: { page: number; totalPages: number; pageSize: number; totalItems: number; rangeStart: number; rangeEnd: number };
  txnPageSize: number;
  setTxnPage: (page: number) => void;
  setTxnPageSize: (pageSize: number) => void;
}) {
  return (
    <Card title="حركات الخزينة" actions={<div className="actions compact-actions"><Button variant="secondary" onClick={onReset}>إعادة الضبط</Button><Button variant="secondary" onClick={onExport} disabled={!transactionPagination?.totalItems || isExporting}>{isExporting ? 'جارٍ التصدير...' : 'تصدير النتائج'}</Button><Button variant="secondary" onClick={onPrint} disabled={!transactionPagination?.totalItems || isExporting}>طباعة النتائج</Button></div>}>
      <SearchToolbar search={search} onSearchChange={onSearchChange} searchPlaceholder="ابحث بالنوع أو البيان أو المرجع أو المنفذ" />
      <div className="filter-chip-row">{[['all','الكل'],['today','اليوم'],['in','داخل'],['out','خارج'],['expense','مصروفات']].map(([value,label]) => <Button key={value} variant={txnFilter === value ? 'primary' : 'secondary'} onClick={() => onTxnFilterChange(value as TreasuryTransactionFilter)}>{label}</Button>)}</div>
      <QueryFeedback isLoading={transactionsQuery.isLoading} isError={transactionsQuery.isError} error={transactionsQuery.error} isEmpty={!transactionPagination?.totalItems} loadingText="جاري تحميل الخزينة..." errorTitle="تعذر تحميل حركات الخزينة" emptyTitle="لا توجد حركات خزينة حاليًا" emptyHint="ستظهر هنا الحركات المالية بعد التسجيل أو تغيير الفلاتر.">
        <DataTable rows={transactionRows} columns={[
          { key: 'type', header: 'النوع', cell: (row: TreasuryTransactionRow) => row.txnType || row.type || '—' },
          { key: 'amount', header: 'المبلغ', cell: (row: TreasuryTransactionRow) => formatCurrency(Number(row.amount || 0)) },
          { key: 'note', header: 'البيان', cell: (row: TreasuryTransactionRow) => row.note || '—' },
          { key: 'ref', header: 'المرجع', cell: (row: TreasuryTransactionRow) => row.referenceType || '—' },
          { key: 'scope', header: SINGLE_STORE_MODE ? 'المخزن' : 'الفرع/الموقع', cell: (row: TreasuryTransactionRow) => formatScopeLabel(row) },
          { key: 'user', header: 'المنفذ', cell: (row: TreasuryTransactionRow) => row.createdByName || '—' },
          { key: 'date', header: 'التاريخ', cell: (row: TreasuryTransactionRow) => formatDate(row.createdAt || row.date) }
        ]} />
        <PaginationControls page={transactionPagination?.page || 1} totalPages={transactionPagination?.totalPages || 1} pageSize={transactionPagination?.pageSize || txnPageSize} pageSizeOptions={[15,25,50,100]} totalItems={transactionPagination?.totalItems || 0} rangeStart={transactionPagination?.rangeStart || 0} rangeEnd={transactionPagination?.rangeEnd || 0} onPageChange={setTxnPage} onPageSizeChange={(value) => { setTxnPageSize(value); setTxnPage(1); }} itemLabel="حركة" />
      </QueryFeedback>
    </Card>
  );
}
