import { formatCurrency } from '@/lib/format';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartSummary({ totals, paymentType, paidAmount, amountDue, changeAmount }: Pick<PosCartPanelProps, 'totals' | 'paymentType' | 'paidAmount' | 'amountDue' | 'changeAmount'>) {
  return (
    <div className="pos-checkout-summary-grid">
      <div className="pos-checkout-summary tone-primary"><span>المطلوب دفعه</span><strong>{formatCurrency(totals.total)}</strong></div>
      <div className="pos-checkout-summary tone-success"><span>المدفوع</span><strong>{formatCurrency(paymentType === 'credit' ? 0 : paidAmount)}</strong></div>
      <div className="pos-checkout-summary tone-warning"><span>{paymentType === 'credit' ? 'المتبقي على العميل' : 'المتبقي الآن'}</span><strong>{formatCurrency(paymentType === 'credit' ? totals.total : amountDue)}</strong></div>
      <div className="pos-checkout-summary tone-surface"><span>{paymentType === 'credit' ? 'الدفع' : 'الباقي للعميل'}</span><strong>{paymentType === 'credit' ? 'آجل' : formatCurrency(changeAmount)}</strong></div>
    </div>
  );
}
