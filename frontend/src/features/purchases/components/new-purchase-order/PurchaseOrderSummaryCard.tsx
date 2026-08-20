import { useTranslation } from '../../utils/i18n-purchase-prototype';
import { formatMoney } from './newPurchaseOrder.helpers';

interface SummaryCardProps {
  notes: string;
  setNotes: (val: string) => void;
  subtotal: number;
  tax: number;
  total: number;
  language: string;
}

export function PurchaseOrderSummaryCard(props: SummaryCardProps) {
  const { t } = useTranslation();

  return (
    <section className="document-prototype-bottom-grid">
      <div className="document-prototype-section">
        <h3 className="document-prototype-section-title">{t('notes_section')}</h3>
        <textarea
          className="purchase-prototype-notes-textarea"
          rows={2}
          value={props.notes}
          onChange={(event) => props.setNotes(event.target.value)}
          placeholder={t('additional_notes')}
        />
      </div>
      <div className="document-prototype-section document-totals-card">
        <h3 className="document-prototype-section-title">{t('totals_section')}</h3>
        <div className="document-totals-panel">
          <div>
            <span>{t('subtotal')}</span>
            <strong>{formatMoney(props.subtotal, props.language)}</strong>
          </div>
          <div>
            <span>{t('tax')}</span>
            <strong>{formatMoney(props.tax, props.language)}</strong>
          </div>
          <div className="document-total-grand">
            <span>{t('total')}</span>
            <strong>{formatMoney(props.total, props.language)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
