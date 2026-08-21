import { formatCurrency } from '@/lib/format';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartSummary({ totals, paymentType, paidAmount, amountDue, changeAmount }: Pick<PosCartPanelProps, 'totals' | 'paymentType' | 'paidAmount' | 'amountDue' | 'changeAmount'>) {
  const actualPaid = Number(paidAmount || 0);
  const remainingDebt = Math.max(0, Number(totals.total || 0) - actualPaid);
  const isCredit = paymentType === 'credit';

  return (
    <div className="pos-checkout-summary-grid">
      <div className="pos-checkout-summary tone-primary"><span>المطلوب دفعه</span><strong>{formatCurrency(totals.total)}</strong></div>
      <div className="pos-checkout-summary tone-success"><span>المدفوع</span><strong>{formatCurrency(actualPaid)}</strong></div>
      <div className="pos-checkout-summary tone-warning"><span>{isCredit || remainingDebt > 0 ? 'المتبقي على العميل' : 'المتبقي الآن'}</span><strong>{formatCurrency(isCredit ? remainingDebt : amountDue)}</strong></div>
      <div className="pos-checkout-summary tone-surface"><span>{isCredit && actualPaid <= 0 ? 'الدفع' : 'الباقي للعميل'}</span><strong>{isCredit && actualPaid <= 0 ? 'آجل' : formatCurrency(changeAmount)}</strong></div>
    </div>
  );
}
