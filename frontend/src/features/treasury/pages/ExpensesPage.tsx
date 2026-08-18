import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useTreasuryPage } from '@/features/treasury/hooks/useTreasuryPage';
import { useTreasuryPageActions } from '@/features/treasury/hooks/useTreasuryPageActions';
import { useCreateExpenseMutation } from '@/features/treasury/hooks/useCreateExpenseMutation';
import {
  exportExpenseCsv,
  initialExpenseForm,
  validateExpenseForm,
} from '@/features/treasury/lib/treasury-page.helpers';
import { TreasuryExpenseEntryCard } from '@/features/treasury/components/TreasuryExpenseEntryCard';
import { TreasuryExpenseSummaryCard } from '@/features/treasury/components/TreasuryExpenseSummaryCard';
import { TreasuryExpensesRegisterCard } from '@/features/treasury/components/TreasuryExpensesRegisterCard';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

export function ExpensesPage() {
  const { printMatchingExpenses, exportExpenses: exportExpenseRows } = useTreasuryPageActions();
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expensePage, setExpensePage] = useState(1);
  const [expensePageSize, setExpensePageSize] = useState(20);
  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);
  const [isExportingExpenses, setIsExportingExpenses] = useState(false);
  
  const { expensesQuery, branches, locations, expenses, expenseSummary, expensePagination } = useTreasuryPage(
    { page: 1, pageSize: 1, search: '', filter: 'all' }, // We don't need transactions data here
    { page: expensePage, pageSize: expensePageSize, search: expenseSearch }
  );

  const expenseMutation = useCreateExpenseMutation(() => {
    setExpenseForm(initialExpenseForm());
    setExpensePage(1);
  });

  useEffect(() => setExpensePage(1), [expenseSearch]);

  const availableLocations = useMemo(() => {
    if (SINGLE_STORE_MODE || !expenseForm.branchId) return locations;
    return locations.filter((location) => !location.branchId || String(location.branchId) === String(expenseForm.branchId));
  }, [locations, expenseForm.branchId]);
  
  const expenseValidationErrors = useMemo(() => validateExpenseForm(expenseForm, locations), [expenseForm, locations]);

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
    <div className="page-stack page-shell treasury-workspace treasury-workspace--compact" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
        <PageHeader 
          title="المصروفات" 
          description="سجل مصاريف التشغيل اليومية والرواتب والإيجارات وغيرها." 
          badge={<span className="nav-pill">الخدمات والحسابات</span>}
          actions={
            <>
              <Button variant="secondary" onClick={exportExpenses} disabled={!expensePagination?.totalItems || isExportingExpenses}>تصدير المصروفات</Button>
              <Button variant="secondary" onClick={() => printMatchingExpenses(expenseSearch)} disabled={!expensePagination?.totalItems || isExportingExpenses}>طباعة النتائج</Button>
              <Button onClick={() => printMatchingExpenses(expenseSearch)} disabled={!expensePagination?.totalItems}>طباعة الملخص</Button>
            </>
          }
        />
        <TreasuryExpenseSummaryCard
          expenseSummary={expenseSummary}
          expenses={expenses}
        />
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
      </main>
    </div>
  );
}
