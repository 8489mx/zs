import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { FilterChipGroup } from '@/shared/components/filter-chip-group';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { PaginationControls } from '@/shared/components/pagination-controls';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { formatScopeLabel, formatTreasuryType, type TreasuryTransactionFilter, type TreasuryTransactionRow } from '@/features/treasury/lib/treasury-page.helpers';

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
  const { t } = useTranslation();

  const treasuryFilterOptions = [
    { value: 'all', label: t('common.all', 'الكل') },
    { value: 'today', label: t('common.today', 'اليوم') },
    { value: 'in', label: t('treasury.in', 'داخل') },
    { value: 'out', label: t('treasury.out', 'خارج') },
    { value: 'expense', label: t('treasury.expense', 'مصروفات') },
  ] as const;

  return (
    <FormSection className="treasury-transactions-card" title={t('treasury.transactions_title', 'حركات الخزينة')} actions={<div className="actions compact-actions" style={{ flexWrap: 'nowrap' }}><Button variant="secondary" onClick={onReset}>{t('common.reset', 'إعادة الضبط')}</Button><Button variant="secondary" onClick={onExport} disabled={!transactionPagination?.totalItems || isExporting}>{isExporting ? t('common.exporting', 'جارٍ التصدير...') : t('treasury.export_results', 'تصدير النتائج')}</Button><Button variant="secondary" onClick={onPrint} disabled={!transactionPagination?.totalItems || isExporting}>{t('treasury.print_results', 'طباعة النتائج')}</Button></div>}>
      <SearchToolbar search={search} onSearchChange={onSearchChange} searchPlaceholder={t('treasury.search_placeholder', 'ابحث بالنوع أو البيان أو المرجع أو المنفذ')} />
      <FilterChipGroup value={txnFilter} options={treasuryFilterOptions} onChange={onTxnFilterChange} />
      <QueryFeedback isLoading={transactionsQuery.isLoading} isError={transactionsQuery.isError} error={transactionsQuery.error} isEmpty={!transactionPagination?.totalItems} loadingText={t('treasury.loading_treasury', 'جاري تحميل الخزينة...')} errorTitle={t('treasury.error_loading', 'تعذر تحميل حركات الخزينة')} emptyTitle={t('treasury.empty_title', 'لا توجد حركات خزينة حاليًا')} emptyHint={t('treasury.empty_hint', 'ستظهر هنا الحركات المالية بعد التسجيل أو تغيير الفلاتر.')}>
        <DataTable rows={transactionRows} columns={[
          { key: 'type', header: t('treasury.col_type', 'النوع'), cell: (row: TreasuryTransactionRow) => formatTreasuryType(row.txnType || row.type) },
          { key: 'amount', header: t('treasury.col_amount', 'المبلغ'), cell: (row: TreasuryTransactionRow) => formatCurrency(Number(row.amount || 0)) },
          { key: 'note', header: t('treasury.col_note', 'البيان'), cell: (row: TreasuryTransactionRow) => row.note || '—' },
          { key: 'ref', header: t('treasury.col_ref', 'المرجع'), cell: (row: TreasuryTransactionRow) => formatTreasuryType(row.referenceType) },
          { key: 'scope', header: SINGLE_STORE_MODE ? t('treasury.col_store', 'المخزن') : t('treasury.col_branch_store', 'الفرع/المخزن'), cell: (row: TreasuryTransactionRow) => formatScopeLabel(row) },
          { key: 'user', header: t('treasury.col_user', 'المنفذ'), cell: (row: TreasuryTransactionRow) => row.createdByName || row.createdBy || '—' },
          { key: 'date', header: t('treasury.col_date', 'التاريخ'), cell: (row: TreasuryTransactionRow) => formatDate(row.createdAt || row.date) }
        ]} />
        <PaginationControls page={transactionPagination?.page || 1} totalPages={transactionPagination?.totalPages || 1} pageSize={transactionPagination?.pageSize || txnPageSize} pageSizeOptions={[15,25,50,100]} totalItems={transactionPagination?.totalItems || 0} rangeStart={transactionPagination?.rangeStart || 0} rangeEnd={transactionPagination?.rangeEnd || 0} onPageChange={setTxnPage} onPageSizeChange={(value) => { setTxnPageSize(value); setTxnPage(1); }} itemLabel={t('treasury.transaction_unit', 'حركة')} />
      </QueryFeedback>
    </FormSection>
  );
}
