import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/format';

export function PurchaseTotals({ subTotal, discount, taxAmount, total }: { subTotal: number; discount: number; taxAmount: number; total: number }) {
  const { t } = useTranslation();
  return (
    <div className="stats-grid compact-grid purchase-totals-grid" style={{ gridColumn: '1 / -1' }}>
      <div className="stat-card"><span>{t('purchases.purchase_composer.purchase_totals.s0', "الإجمالي قبل الضريبة")}</span><strong>{formatCurrency(subTotal)}</strong></div>
      <div className="stat-card"><span>{t('purchases.purchase_composer.purchase_totals.s1', "الخصم")}</span><strong>{formatCurrency(discount)}</strong></div>
      <div className="stat-card"><span>{t('purchases.purchase_composer.purchase_totals.s2', "الضريبة")}</span><strong>{formatCurrency(taxAmount)}</strong></div>
      <div className="stat-card"><span>{t('purchases.purchase_composer.purchase_totals.s3', "إجمالي الفاتورة")}</span><strong>{formatCurrency(total)}</strong></div>
    </div>
  );
}
