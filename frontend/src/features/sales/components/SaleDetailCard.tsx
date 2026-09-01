import type { Sale } from '@/types/domain';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { useTranslation } from "react-i18next";
import { shareSaleViaWhatsApp } from '@/features/sales/utils/whatsappShare';
import { useAuthStore } from '@/stores/auth-store';

interface SaleDetailCardProps {
  sale?: Sale;
  isLoading?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onPrint?: () => void;
}

export function SaleDetailCard({ sale, isLoading = false, onEdit, onCancel, onPrint }: SaleDetailCardProps) {
  const { t } = useTranslation();
  const { storeName } = useAuthStore();

  if (isLoading) return <FormSection title={t('sales.8f6d39')}><div className="muted">{t('sales.ff88ae')}</div></FormSection>;
  if (!sale) return <FormSection title={t('sales.8f6d39')}><div className="muted">{t('sales.272f58')}</div></FormSection>;

  const statusText = sale.status === 'posted' ? 'مرحلة' : sale.status === 'cancelled' ? t('sales.e92ebe') : sale.status === 'draft' ? 'مسودة' : (sale.status || 'draft');
  const paidAmount = Number(sale.paidAmount ?? sale.total ?? 0);
  const remaining = Math.max(0, Number(sale.total || 0) - paidAmount);

  const handleWhatsAppShare = () => {
    shareSaleViaWhatsApp(sale, { storeName });
  };

  return (
    <FormSection
      title={`تفاصيل ${sale.docNo || sale.id}`}
      actions={sale.status !== 'cancelled' ? (
        <div className="actions invoice-detail-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            className="btn-whatsapp-share"
            onClick={handleWhatsAppShare}
            style={{
              background: '#25d366',
              color: '#ffffff',
              borderColor: '#22c55e',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.043.101-.116.433-.506.549-.679.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z" />
            </svg>
            <span>واتساب</span>
          </Button>
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
        {remaining > 0 && (
          <div className="stat-card remaining-stat-card" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
            <span style={{ color: '#991b1b' }}>المتبقي (آجل)</span>
            <strong style={{ color: '#dc2626' }}>{formatCurrency(remaining)}</strong>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="table-wrap invoice-detail-table-wrap invoice-desktop-table" style={{ marginTop: 16 }}>
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

      {/* Mobile Responsive Smart Item Cards */}
      <div className="invoice-mobile-items-list" style={{ marginTop: 12 }}>
        <h5 className="invoice-mobile-items-title">بنود الفاتورة ({(sale.items || []).length})</h5>
        <div className="invoice-mobile-items-grid">
          {(sale.items || []).map((item, idx) => (
            <div key={item.id || `${item.productId}-${idx}`} className="invoice-mobile-item-card">
              <div className="mobile-item-card-top">
                <strong className="mobile-item-name">{item.name}</strong>
                <span className="mobile-item-total">{formatCurrency(item.total)}</span>
              </div>
              <div className="mobile-item-card-bottom">
                <span className="mobile-item-unit">{item.unitName || 'قطعة'}</span>
                <span className="mobile-item-calc">
                  {item.qty} × {formatCurrency(item.price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FormSection>
  );
}

