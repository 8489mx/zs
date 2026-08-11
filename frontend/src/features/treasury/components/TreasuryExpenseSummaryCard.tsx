import { FormSection } from '@/shared/components/form-section';
import { formatCurrency } from '@/lib/format';
import type { ExpenseRecord } from '@/types/domain';

export function TreasuryExpenseSummaryCard({ expenseSummary, expenses }: {
  expenseSummary: { totalItems: number; totalAmount: number };
  expenses: ExpenseRecord[];
}) {
  return (
    <FormSection title="ملخص المصروفات" actions={<span className="nav-pill">المصروفات</span>}>
      <div className="stats-grid compact-grid" style={{ marginTop: '0.5rem' }}>
        <div className="stat-card"><span>العدد</span><strong>{expenseSummary.totalItems}</strong></div>
        <div className="stat-card"><span>الإجمالي</span><strong>{formatCurrency(expenseSummary.totalAmount)}</strong></div>
        <div className="stat-card"><span>آخر مصروف</span><strong>{expenses[0]?.title || '—'}</strong></div>
        <div className="stat-card"><span>المنفذ الأخير</span><strong>{expenses[0]?.createdBy || '—'}</strong></div>
      </div>
    </FormSection>
  );
}
