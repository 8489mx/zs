import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { useTranslation } from '../../utils/i18n-purchase-prototype';
import type { ProductOption } from './newPurchaseOrder.types';

export function BarcodeScanDialog({
  open,
  query,
  products,
  onClose,
  onScan,
  onOpenQuickCreate,
}: {
  open: boolean;
  query: string;
  products: ProductOption[];
  onClose: () => void;
  onScan: (barcode: string) => void;
  onOpenQuickCreate: (barcode: string) => void;
}) {
  const { t } = useTranslation();
  const [barcode, setBarcode] = useState(query);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setBarcode(query);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        onScan(barcode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [barcode, onClose, onScan, open]);

  if (!open) return null;

  const matched = products.find((product) => product.barcode === barcode.trim());

  return (
    <div className="purchase-prototype-create-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="purchase-prototype-create-card" role="dialog" aria-modal="true" aria-labelledby="purchase-prototype-barcode-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="purchase-prototype-create-header">
          <div>
            <h4 id="purchase-prototype-barcode-title">{t('scan_barcode_title')}</h4>
            <p>{t('scan_barcode_desc')}</p>
          </div>
          <button type="button" className="purchase-prototype-create-close" aria-label={t("close")} onClick={onClose}>×</button>
        </div>
        <div className="purchase-prototype-create-grid">
          <Field label={t("barcode")}>
            <input className="purchase-prototype-create-input" ref={inputRef} value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="622100001" />
          </Field>
          <div className="muted small">{t('test_barcode_notice')}</div>
          {matched ? <div className="success-box">{t('found_item')} <strong>{matched.name}</strong></div> : barcode.trim() ? <div className="error-box">{t('item_not_found')}</div> : null}
        </div>
        <div className="purchase-prototype-create-actions">
          <Button variant="secondary" type="button" onClick={onClose}>{t('cancel')}</Button>
          {matched ? (
            <Button type="button" onClick={() => onScan(barcode)}>{t('add_to_item')}</Button>
          ) : (
            <Button type="button" onClick={() => onOpenQuickCreate(barcode)}>{t('create_new_item_with_barcode')}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
