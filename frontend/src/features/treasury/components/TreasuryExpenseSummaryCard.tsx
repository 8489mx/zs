import { StatsGrid } from '@/shared/components/stats-grid';
import { formatCurrency } from '@/lib/format';
import type { ExpenseRecord } from '@/types/domain';

export function TreasuryExpenseSummaryCard({ expenseSummary, expenses }: {
  expenseSummary: { totalItems: number; totalAmount: number };
  expenses: ExpenseRecord[];
}) {
  const stats = [
    { key: 'count', label: 'عدد المصروفات', value: expenseSummary.totalItems },
    { key: 'total', label: 'إجمالي القيمة', value: formatCurrency(expenseSummary.totalAmount) },
    { key: 'latest', label: 'آخر مصروف', value: expenses[0]?.title || '—' },
    { key: 'user', label: 'المنفذ الأخير', value: expenses[0]?.createdBy || '—' },
  ] as const;

  return <StatsGrid items={stats} className="stats-grid compact-grid grid-cols-4" />;
}
