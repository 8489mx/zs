import type { Sale } from '@/types/domain';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { useTranslation } from "react-i18next";

interface SaleDetailCardProps {
  sale?: Sale;
  isLoading?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onPrint?: () => void;
}

export function SaleDetailCard({ sale, isLoading = false, onEdit, onCancel, onPrint }: SaleDetailCardProps) {
    const { t } = useTranslation();
  if (isLoading) return <FormSection title={t('sales.8f6d39')}><div className="muted">{t('sales.ff88ae')}</div></FormSection>;
  if (!sale) return <FormSection title={t('sales.8f6d39')}><div className="muted">{t('sales.272f58')}</div></FormSection>;

  return (
    <FormSection
      title={`تفاصيل ${sale.docNo || sale.id}`}
      actions={sale.status !== 'cancelled' ? (
        <div className="actions">
          {onPrint ? <Button variant="secondary" onClick={onPrint}>{t('sales.88c5d1')}</Button> : null}
          {onEdit ? <Button variant="secondary" onClick={onEdit}>{t('sales.78b222')}</Button> : null}
          {onCancel ? <Button variant="danger" onClick={onCancel}>{t('sales.d07516')}</Button> : null}
        </div>
      ) : <span className="status-badge status-cancelled">{t('sales.e92ebe')}</span>}
    >
      <div className="stats-grid compact-grid invoice-detail-summary-grid">
        <div className="stat-card"><span>{t('sales.bc9b43')}</span><strong>{sale.customerName || t('sales.339465')}</strong></div>
        <div className="stat-card"><span>{t('sales.1253eb')}</span><strong>{sale.status || 'draft'}</strong></div>
        <div className="stat-card"><span>{t('sales.88fc73')}</span><strong>{formatCurrency(sale.total)}</strong></div>
        <div className="stat-card"><span>{t('sales.8456f2')}</span><strong>{formatDate(sale.date)}</strong></div>
      </div>
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr><th>{t('sales.77c42d')}</th><th>{t('sales.694ca7')}</th><th>{t('sales.510165')}</th><th>{t('sales.fa59c3')}</th><th>{t('sales.88fc73')}</th></tr>
          </thead>
          <tbody>
            {(sale.items || []).map((item) => (
              <tr key={item.id || `${item.productId}-${item.unitName}`}>
                <td>{item.name}</td>
                <td>{item.unitName || '—'}</td>
                <td>{item.qty}</td>
                <td>{formatCurrency(item.price)}</td>
                <td>{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FormSection>
  );
}
