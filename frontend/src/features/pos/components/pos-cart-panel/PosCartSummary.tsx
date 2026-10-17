import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/format';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartSummary({ totals, paymentType, paidAmount, amountDue, changeAmount }: Pick<PosCartPanelProps, 'totals' | 'paymentType' | 'paidAmount' | 'amountDue' | 'changeAmount'>) {
  const { t } = useTranslation();
  const actualPaid = Number(paidAmount || 0);
  const remainingDebt = Math.max(0, Number(totals.total || 0) - actualPaid);
  const isCredit = paymentType === 'credit';

  return (
    <div className="pos-checkout-summary-grid">
      <div className="pos-checkout-summary tone-primary"><span>{t('pos.amount_due', 'المطلوب دفعه')}</span><strong>{formatCurrency(totals.total)}</strong></div>
      <div className="pos-checkout-summary tone-success"><span>{t('pos.paid', 'المدفوع')}</span><strong>{formatCurrency(actualPaid)}</strong></div>
      <div className="pos-checkout-summary tone-warning"><span>{isCredit || remainingDebt > 0 ? t('pos.remaining_debt', 'المتبقي على العميل') : t('pos.remaining', 'المتبقي الآن')}</span><strong>{formatCurrency(isCredit ? remainingDebt : amountDue)}</strong></div>
      <div className="pos-checkout-summary tone-surface"><span>{isCredit && actualPaid <= 0 ? t('pos.payment_label', 'الدفع') : t('pos.change', 'الباقي للعميل')}</span><strong>{isCredit && actualPaid <= 0 ? t('pos.credit_label', 'آجل') : formatCurrency(changeAmount)}</strong></div>
    </div>
  );
}
