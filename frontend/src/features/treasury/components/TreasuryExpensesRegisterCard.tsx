import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { PaginationControls } from '@/shared/components/pagination-controls';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { ExpenseRecord } from '@/types/domain';
import { formatScopeLabel } from '@/features/treasury/lib/treasury-page.helpers';

export function TreasuryExpensesRegisterCard({ expenseSearch, onExpenseSearchChange, onReset, expensesQuery, expenses, expenseSummary, expensePagination, expensePageSize, setExpensePage, setExpensePageSize }: {
  expenseSearch: string;
  onExpenseSearchChange: (value: string) => void;
  onReset: () => void;
  expensesQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  expenses: ExpenseRecord[];
  expenseSummary: { totalItems: number };
  expensePagination?: { page: number; totalPages: number; pageSize: number; totalItems: number; rangeStart: number; rangeEnd: number };
  expensePageSize: number;
  setExpensePage: (page: number) => void;
  setExpensePageSize: (pageSize: number) => void;
}) {
  return (
    <Card title="سجل المصروفات">
      <SearchToolbar search={expenseSearch} onSearchChange={onExpenseSearchChange} searchPlaceholder={SINGLE_STORE_MODE ? 'ابحث باسم المصروف أو الملاحظات أو المخزن' : 'ابحث باسم المصروف أو الملاحظات أو الفرع'} onReset={onReset} resetLabel="تفريغ" />
      <QueryFeedback isLoading={expensesQuery.isLoading} isError={expensesQuery.isError} error={expensesQuery.error} isEmpty={!expenseSummary.totalItems} loadingText="جاري تحميل المصروفات..." errorTitle="تعذر تحميل المصروفات" emptyTitle="لا توجد مصروفات مسجلة حاليًا" emptyHint="سجل أول مصروف من النموذج أعلاه وسيظهر هنا مباشرة.">
        <DataTable rows={expenses} columns={[
          { key: 'title', header: 'المصروف', cell: (row: ExpenseRecord) => row.title },
          { key: 'amount', header: 'المبلغ', cell: (row: ExpenseRecord) => formatCurrency(row.amount) },
          { key: 'note', header: 'ملاحظات', cell: (row: ExpenseRecord) => row.note || '—' },
          { key: 'scope', header: SINGLE_STORE_MODE ? 'المخزن' : 'الفرع/الموقع', cell: (row: ExpenseRecord) => formatScopeLabel(row) },
          { key: 'user', header: 'المنفذ', cell: (row: ExpenseRecord) => row.createdBy || '—' },
          { key: 'date', header: 'التاريخ', cell: (row: ExpenseRecord) => formatDate(row.date) }
        ]} />
        <PaginationControls page={expensePagination?.page || 1} totalPages={expensePagination?.totalPages || 1} pageSize={expensePagination?.pageSize || expensePageSize} pageSizeOptions={[10,20,50,100]} totalItems={expensePagination?.totalItems || 0} rangeStart={expensePagination?.rangeStart || 0} rangeEnd={expensePagination?.rangeEnd || 0} onPageChange={setExpensePage} onPageSizeChange={(value) => { setExpensePageSize(value); setExpensePage(1); }} itemLabel="مصروف" />
      </QueryFeedback>
    </Card>
  );
}
