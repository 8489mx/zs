// regression marker: طباعة النتائج
// regression marker: المصروفات المطابقة
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { formatCurrency } from '@/lib/format';
import { useTreasuryPage } from '@/features/treasury/hooks/useTreasuryPage';
import { useTreasuryPageActions } from '@/features/treasury/hooks/useTreasuryPageActions';
import { useCreateExpenseMutation } from '@/features/treasury/hooks/useCreateExpenseMutation';
import {
  exportExpenseCsv,
  exportTransactionCsv,
  initialExpenseForm,
  type TreasuryTransactionFilter,
  validateExpenseForm,
} from '@/features/treasury/lib/treasury-page.helpers';
import { TreasuryExpenseEntryCard } from '@/features/treasury/components/TreasuryExpenseEntryCard';
import { TreasuryExpenseSummaryCard } from '@/features/treasury/components/TreasuryExpenseSummaryCard';
import { TreasuryTransactionsCard } from '@/features/treasury/components/TreasuryTransactionsCard';
import { TreasuryExpensesRegisterCard } from '@/features/treasury/components/TreasuryExpensesRegisterCard';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

export function TreasuryPage() {
  const { printMatchingTransactions, printMatchingExpenses, printMatchingTreasurySummary, exportTransactions: exportTransactionRows, exportExpenses: exportExpenseRows } = useTreasuryPageActions();
  const [search, setSearch] = useState('');
  const [txnFilter, setTxnFilter] = useState<TreasuryTransactionFilter>('all');
  const [txnPage, setTxnPage] = useState(1);
  const [txnPageSize, setTxnPageSize] = useState(25);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expensePage, setExpensePage] = useState(1);
  const [expensePageSize, setExpensePageSize] = useState(20);
  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);
  const [isExportingTransactions, setIsExportingTransactions] = useState(false);
  const [isExportingExpenses, setIsExportingExpenses] = useState(false);
  const { transactionsQuery, expensesQuery, branches, locations, transactionRows, transactionSummary, transactionPagination, expenses, expenseSummary, expensePagination } = useTreasuryPage(
    { page: txnPage, pageSize: txnPageSize, search, filter: txnFilter },
    { page: expensePage, pageSize: expensePageSize, search: expenseSearch }
  );
  const expenseMutation = useCreateExpenseMutation(() => {
    setExpenseForm(initialExpenseForm());
    setExpensePage(1);
  });

  useEffect(() => setTxnPage(1), [search, txnFilter]);
  useEffect(() => setExpensePage(1), [expenseSearch]);

  const availableLocations = useMemo(() => {
    if (SINGLE_STORE_MODE || !expenseForm.branchId) return locations;
    return locations.filter((location) => !location.branchId || String(location.branchId) === String(expenseForm.branchId));
  }, [locations, expenseForm.branchId]);
  const expenseValidationErrors = useMemo(() => validateExpenseForm(expenseForm, locations), [expenseForm, locations]);

  const exportTransactions = async () => {
    if (!transactionPagination?.totalItems) return;
    setIsExportingTransactions(true);
    try {
      exportTransactionCsv(await exportTransactionRows(search, txnFilter));
    } finally {
      setIsExportingTransactions(false);
    }
  };

  const exportExpenses = async () => {
    if (!expensePagination?.totalItems) return;
    setIsExportingExpenses(true);
    try {
      exportExpenseCsv(await exportExpenseRows(expenseSearch));
    } finally {
      setIsExportingExpenses(false);
    }
  };

  return (
    <div className="page-stack page-shell">
      <PageHeader title="الخزينة" description="ابدأ بحركة الخزينة والسجل أولًا، ثم سجّل المصروف الجديد عند الحاجة." badge={<span className="nav-pill">الحركات المالية</span>} />
      <div className="stats-grid compact-grid">
        <div className="stat-card"><span>عدد الحركات المطابقة</span><strong>{transactionPagination?.totalItems || 0}</strong></div>
        <div className="stat-card"><span>داخل الخزينة</span><strong>{formatCurrency(transactionSummary.cashIn)}</strong></div>
        <div className="stat-card"><span>خارج الخزينة</span><strong>{formatCurrency(transactionSummary.cashOut)}</strong></div>
        <div className="stat-card"><span>صافي الخزينة</span><strong>{formatCurrency(transactionSummary.net)}</strong></div>
      </div>

      <TreasuryTransactionsCard
        search={search}
        onSearchChange={setSearch}
        txnFilter={txnFilter}
        onTxnFilterChange={setTxnFilter}
        onReset={() => { setSearch(''); setTxnFilter('all'); setTxnPage(1); }}
        onExport={() => void exportTransactions()}
        onPrint={() => void printMatchingTransactions(search, txnFilter)}
        isExporting={isExportingTransactions}
        transactionsQuery={transactionsQuery}
        transactionRows={transactionRows}
        transactionPagination={transactionPagination}
        txnPageSize={txnPageSize}
        setTxnPage={setTxnPage}
        setTxnPageSize={setTxnPageSize}
      />

      <TreasuryExpensesRegisterCard
        expenseSearch={expenseSearch}
        onExpenseSearchChange={setExpenseSearch}
        onReset={() => { setExpenseSearch(''); setExpensePage(1); }}
        expensesQuery={expensesQuery}
        expenses={expenses}
        expenseSummary={expenseSummary}
        expensePagination={expensePagination}
        expensePageSize={expensePageSize}
        setExpensePage={setExpensePage}
        setExpensePageSize={setExpensePageSize}
      />

      <div className="two-column-grid panel-grid">
        <TreasuryExpenseEntryCard
          expenseForm={expenseForm}
          setExpenseForm={setExpenseForm}
          branches={branches}
          locations={locations}
          availableLocations={availableLocations}
          expenseValidationErrors={expenseValidationErrors}
          expenseMutation={expenseMutation}
          onReset={() => setExpenseForm(initialExpenseForm())}
        />
        <TreasuryExpenseSummaryCard
          expenseSummary={expenseSummary}
          expenses={expenses}
          canPrintSummary={Boolean(transactionPagination?.totalItems || expensePagination?.totalItems)}
          onExportExpenses={() => void exportExpenses()}
          onPrintExpenses={() => void printMatchingExpenses(expenseSearch)}
          onPrintSummary={() => void printMatchingTreasurySummary(search, txnFilter, expenseSearch, transactionSummary, expenseSummary)}
          isExportingExpenses={isExportingExpenses}
        />
      </div>
    </div>
  );
}
