import { FormSection } from '@/shared/components/form-section';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { PaginationControls } from '@/shared/components/pagination-controls';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { ExpenseRecord } from '@/types/domain';
import { formatScopeLabel } from '@/features/treasury/lib/treasury-page.helpers';

export function TreasuryExpensesRegisterCard({ expenseSearch, onExpenseSearchChange, onReset, expensesQuery, expenses, expenseSummary, expensePagination, expensePageSize, setExpensePage, setExpensePageSize, onOpenCreate }: {
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
  onOpenCreate?: () => void;
}) {
  return (
    <div className="expenses-register-section">
      <FormSection title="سجل المصروفات" actions={onOpenCreate ? <div className="actions compact-actions"><Button variant="primary" onClick={onOpenCreate}>+ تسجيل مصروف جديد</Button></div> : undefined}>
        <SearchToolbar search={expenseSearch} onSearchChange={onExpenseSearchChange} searchPlaceholder={SINGLE_STORE_MODE ? 'ابحث باسم المصروف أو الملاحظات أو المخزن' : 'ابحث باسم المصروف أو الملاحظات أو الفرع'} onReset={onReset} resetLabel="تفريغ" />
        <QueryFeedback isLoading={expensesQuery.isLoading} isError={expensesQuery.isError} error={expensesQuery.error} isEmpty={!expenseSummary.totalItems} loadingText="جاري تحميل المصروفات..." errorTitle="تعذر تحميل المصروفات" emptyTitle="لا توجد مصروفات مسجلة حاليًا" emptyHint="سجل أول مصروف من النموذج أعلاه وسيظهر هنا مباشرة.">
          <DataTable 
            rows={expenses} 
            columns={[
              { 
                key: 'title', 
                header: 'المصروف', 
                cell: (row: ExpenseRecord) => (
                  <strong style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.86rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.title}>
                    {row.title}
                  </strong>
                ) 
              },
              { 
                key: 'amount', 
                header: 'المبلغ', 
                cell: (row: ExpenseRecord) => (
                  <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.88rem', direction: 'ltr', display: 'inline-block' }}>
                    {formatCurrency(row.amount)}
                  </span>
                ) 
              },
              { 
                key: 'note', 
                header: 'ملاحظات', 
                cell: (row: ExpenseRecord) => (
                  <div 
                    title={row.note || ''}
                    style={{
                      fontSize: '0.8rem',
                      color: '#475569',
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                      maxHeight: '2.7em',
                    }}
                  >
                    {row.note || '—'}
                  </div>
                ) 
              },
              { 
                key: 'scope', 
                header: SINGLE_STORE_MODE ? 'المخزن' : 'الفرع/المخزن', 
                cell: (row: ExpenseRecord) => (
                  <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={formatScopeLabel(row)}>
                    {formatScopeLabel(row)}
                  </span>
                ) 
              },
              { 
                key: 'user', 
                header: 'المنفذ', 
                cell: (row: ExpenseRecord) => (
                  <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.createdBy || ''}>
                    {row.createdBy || '—'}
                  </span>
                ) 
              },
              { 
                key: 'date', 
                header: 'التاريخ والوقت', 
                cell: (row: ExpenseRecord) => (
                  <span style={{ fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', display: 'inline-block', minWidth: '150px', paddingInlineEnd: '12px' }}>
                    {formatDate(row.date)}
                  </span>
                ) 
              }
            ]} 
          />
          <PaginationControls page={expensePagination?.page || 1} totalPages={expensePagination?.totalPages || 1} pageSize={expensePagination?.pageSize || expensePageSize} pageSizeOptions={[10,20,50,100]} totalItems={expensePagination?.totalItems || 0} rangeStart={expensePagination?.rangeStart || 0} rangeEnd={expensePagination?.rangeEnd || 0} onPageChange={setExpensePage} onPageSizeChange={(value) => { setExpensePageSize(value); setExpensePage(1); }} itemLabel="مصروف" />
        </QueryFeedback>
      </FormSection>
    </div>
  );
}
