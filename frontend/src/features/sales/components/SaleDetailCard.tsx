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

  const statusText = sale.status === 'posted' ? 'مرحلة' : sale.status === 'cancelled' ? t('sales.e92ebe') : sale.status === 'draft' ? 'مسودة' : (sale.status || 'draft');

  return (
    <FormSection
      title={`تفاصيل ${sale.docNo || sale.id}`}
      actions={sale.status !== 'cancelled' ? (
        <div className="actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
          {onPrint ? <Button variant="secondary" onClick={onPrint}>{t('sales.88c5d1')}</Button> : null}
          {onEdit ? <Button variant="secondary" onClick={onEdit}>{t('sales.78b222')}</Button> : null}
          {onCancel ? <Button variant="danger" onClick={onCancel}>{t('sales.d07516')}</Button> : null}
        </div>
      ) : <span className="status-badge status-cancelled">{t('sales.e92ebe')}</span>}
    >
      <div className="stats-grid compact-grid invoice-detail-summary-grid">
        <div className="stat-card">
          <span>{t('sales.bc9b43')}</span>
          <strong>{sale.customerName || t('sales.339465')}</strong>
        </div>
        <div className="stat-card">
          <span>{t('sales.1253eb')}</span>
          <strong className="status-chip">{statusText}</strong>
        </div>
        <div className="stat-card">
          <span>{t('sales.88fc73')}</span>
          <strong style={{ color: 'var(--primary, #0f172a)' }}>{formatCurrency(sale.total)}</strong>
        </div>
        <div className="stat-card">
          <span>{t('sales.8456f2')}</span>
          <strong>{formatDate(sale.date)}</strong>
        </div>
      </div>
      <div className="table-wrap invoice-detail-table-wrap" style={{ marginTop: 16 }}>
        <table style={{ width: '100%', minWidth: '100%', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right', width: '40%' }}>{t('sales.77c42d')}</th>
              <th style={{ textAlign: 'center', width: '15%' }}>{t('sales.694ca7')}</th>
              <th style={{ textAlign: 'center', width: '15%' }}>{t('sales.510165')}</th>
              <th style={{ textAlign: 'center', width: '15%' }}>{t('sales.fa59c3')}</th>
              <th style={{ textAlign: 'left', width: '15%' }}>{t('sales.88fc73')}</th>
            </tr>
          </thead>
          <tbody>
            {(sale.items || []).map((item) => (
              <tr key={item.id || `${item.productId}-${item.unitName}`}>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.name}</td>
                <td style={{ textAlign: 'center', color: '#64748b' }}>{item.unitName || '—'}</td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.qty}</td>
                <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.price)}</td>
                <td style={{ textAlign: 'left', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FormSection>
  );
}
