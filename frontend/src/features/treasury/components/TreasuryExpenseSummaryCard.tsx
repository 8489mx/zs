import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/format';
import type { ExpenseRecord } from '@/types/domain';

export function TreasuryExpenseSummaryCard({ expenseSummary, expenses, canPrintSummary, onExportExpenses, onPrintExpenses, onPrintSummary, isExportingExpenses }: {
  expenseSummary: { totalItems: number; totalAmount: number };
  expenses: ExpenseRecord[];
  canPrintSummary: boolean;
  onExportExpenses: () => void;
  onPrintExpenses: () => void;
  onPrintSummary: () => void;
  isExportingExpenses: boolean;
}) {
  return (
    <Card title="ملخص المصروفات" actions={<span className="nav-pill">المصروفات</span>}>
      <div className="metric-list">
        <div className="metric-row"><span>عدد المصروفات المطابقة</span><strong>{expenseSummary.totalItems}</strong></div>
        <div className="metric-row"><span>إجمالي المصروفات</span><strong>{formatCurrency(expenseSummary.totalAmount)}</strong></div>
        <div className="metric-row"><span>آخر مصروف ظاهر</span><strong>{expenses[0]?.title || '—'}</strong></div>
        <div className="metric-row"><span>آخر منفذ ظاهر</span><strong>{expenses[0]?.createdBy || '—'}</strong></div>
      </div>
      <div className="actions section-actions">
        <Button variant="secondary" onClick={onExportExpenses} disabled={!expenseSummary.totalItems || isExportingExpenses}>تصدير المصروفات</Button>
        <Button variant="secondary" onClick={onPrintExpenses} disabled={!expenseSummary.totalItems || isExportingExpenses}>طباعة النتائج</Button>
        <Button onClick={onPrintSummary} disabled={!canPrintSummary}>طباعة الملخص</Button>
      </div>
    </Card>
  );
}
