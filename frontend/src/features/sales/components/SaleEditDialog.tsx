import { useEffect, useMemo, useState } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { DialogShell } from '@/shared/components/dialog-shell';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { formatCurrency } from '@/lib/format';
import type { Sale } from '@/types/domain';
import { useTranslation } from "react-i18next";

interface SaleEditDialogProps {
  open: boolean;
  sale?: Sale;
  isBusy?: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onSave: (payload: {
    paymentType: string;
    paymentChannel: string;
    discount: number;
    note: string;
    editReason: string;
    managerPin: string;
    paidAmount: number;
    items: Array<{ productId: string; qty: number; price: number; unitName: string; unitMultiplier: number; priceType: string }>;
  }) => Promise<void> | void;
}

export function SaleEditDialog({ open, sale, isBusy = false, errorMessage = '', onCancel, onSave }: SaleEditDialogProps) {
    const { t } = useTranslation();
  const [paymentType, setPaymentType] = useState('cash');
  const [paymentChannel, setPaymentChannel] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; name: string; qty: number; price: number; unitName: string; unitMultiplier: number; priceType: string }>>([]);
  const [editReason, setEditReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open || !sale) return;
    setPaymentType(sale.paymentType || 'cash');
    setPaymentChannel(sale.paymentChannel || (sale.paymentType === 'credit' ? 'credit' : 'cash'));
    setDiscount(Number(sale.discount || 0));
    setNote(sale.note || '');
    setItems((sale.items || []).map((item) => ({
      productId: String(item.productId),
      name: item.name,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      unitName: item.unitName || t('sales.5d16c3'),
      unitMultiplier: Number(item.unitMultiplier || 1),
      priceType: item.priceType || 'retail'
    })));
    setEditReason('');
    setManagerPin('');
    setLocalError('');
  }, [open, sale]);

  const baselineItems = useMemo(() => (sale?.items || []).map((item) => ({
    productId: String(item.productId),
    qty: Number(item.qty || 0),
    price: Number(item.price || 0),
    unitName: item.unitName || t('sales.5d16c3'),
    unitMultiplier: Number(item.unitMultiplier || 1),
    priceType: item.priceType || 'retail'
  })), [sale]);
  const normalizedItems = useMemo(() => items.map((item) => ({
    productId: item.productId,
    qty: Number(item.qty || 0),
    price: Number(item.price || 0),
    unitName: item.unitName,
    unitMultiplier: item.unitMultiplier,
    priceType: item.priceType
  })), [items]);
  const isDirty = useMemo(() => {
    if (!sale) return false;
    return (
      paymentType !== (sale.paymentType || 'cash')
      || paymentChannel !== (sale.paymentChannel || (sale.paymentType === 'credit' ? 'credit' : 'cash'))
      || Number(discount || 0) !== Number(sale.discount || 0)
      || note !== (sale.note || '')
      || JSON.stringify(normalizedItems) !== JSON.stringify(baselineItems)
    );
  }, [baselineItems, discount, normalizedItems, note, paymentChannel, paymentType, sale]);
  const canNavigateAway = useUnsavedChangesGuard(open && isDirty && !isBusy);

  const computedSubTotal = useMemo(() => Number(items.reduce((sum, item) => sum + item.qty * item.price, 0).toFixed(2)), [items]);
  const computedTax = useMemo(() => {
    if (!sale) return 0;
    const taxable = Math.max(0, computedSubTotal - discount);
    const taxRate = Number(sale.taxRate || 0);
    if (!taxRate) return 0;
    if (sale.pricesIncludeTax) return Number((taxable - taxable / (1 + taxRate / 100)).toFixed(2));
    return Number((taxable * (taxRate / 100)).toFixed(2));
  }, [computedSubTotal, discount, sale]);
  const computedTotal = useMemo(() => {
    if (!sale) return 0;
    const taxable = Math.max(0, computedSubTotal - discount);
    return sale.pricesIncludeTax ? Number(taxable.toFixed(2)) : Number((taxable + computedTax).toFixed(2));
  }, [computedSubTotal, computedTax, discount, sale]);

  function handleCancel() {
    if (isBusy) return;
    if (!canNavigateAway()) return;
    onCancel();
  }

  function handleReset() {
    if (!sale) return;
    setPaymentType(sale.paymentType || 'cash');
    setPaymentChannel(sale.paymentChannel || (sale.paymentType === 'credit' ? 'credit' : 'cash'));
    setDiscount(Number(sale.discount || 0));
    setNote(sale.note || '');
    setItems((sale.items || []).map((item) => ({
      productId: String(item.productId),
      name: item.name,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      unitName: item.unitName || t('sales.5d16c3'),
      unitMultiplier: Number(item.unitMultiplier || 1),
      priceType: item.priceType || 'retail'
    })));
    setEditReason('');
    setManagerPin('');
    setLocalError('');
  }

  if (!open || !sale) return null;

  return (
    <DialogShell open={open} onClose={handleCancel} width="min(980px, 100%)" zIndex={70}>
      <FormSection title={`تعديل ${sale.docNo || sale.id}`} actions={<span className="nav-pill">{t('sales.759fdc')}</span>} className="dialog-card dialog-card-wide">
        <DraftStateNotice visible={isDirty && !isBusy} title={t('sales.75f3bb')} hint={t('sales.e5aaba')} />
        <div className="form-grid">
          <Field label={t('sales.394ebd')}>
            <select value={paymentType} onChange={(e) => {
              const next = e.target.value;
              setPaymentType(next);
              if (next === 'credit') setPaymentChannel('credit');
            }} disabled={isBusy}>
              <option value="cash">{t('sales.47062f')}</option>
              <option value="credit">{t('sales.80106f')}</option>
            </select>
          </Field>
          <Field label={t('sales.91f4d8')}>
            <select value={paymentChannel} onChange={(e) => setPaymentChannel(e.target.value)} disabled={isBusy || paymentType === 'credit'}>
              <option value="cash">{t('sales.47062f')}</option>
              <option value="card">{t('sales.2a62eb')}</option>
              <option value="credit">{t('sales.80106f')}</option>
            </select>
          </Field>
          <Field label={t('sales.20000a')}><input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value || 0))} disabled={isBusy} /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Field label={t('sales.3c4208')}><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={isBusy} /></Field></div>
          <div style={{ gridColumn: '1 / -1' }}><Field label={t('sales.9625a0')}><textarea rows={2} value={editReason} onChange={(e) => setEditReason(e.target.value)} disabled={isBusy} placeholder={t('sales.13ae61')} /></Field></div>
          <Field label={t('sales.2249f4')}><input type="text" className="secure-password-field" inputMode="numeric" value={managerPin} onChange={(e) => setManagerPin(e.target.value)} disabled={isBusy} placeholder={t('sales.f7fa23')} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} /></Field>
        </div>

        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr><th>{t('sales.77c42d')}</th><th>{t('sales.694ca7')}</th><th>{t('sales.510165')}</th><th>{t('sales.fa59c3')}</th><th>{t('sales.88fc73')}</th></tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.productId}-${item.unitName}-${index}`}>
                  <td>{item.name}</td>
                  <td>{item.unitName}</td>
                  <td><input type="number" min="0.001" step="0.001" value={item.qty} onChange={(e) => setItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, qty: Number(e.target.value || 0) } : entry))} disabled={isBusy} /></td>
                  <td><input type="number" min="0" step="0.01" value={item.price} onChange={(e) => setItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, price: Number(e.target.value || 0) } : entry))} disabled={isBusy} /></td>
                  <td>{formatCurrency(Number((item.qty * item.price).toFixed(2)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="reports-workspace" style={{ marginTop: 12 }}>
          <div className="reports-spotlight-grid compact-spotlight-grid">
            <div className="report-metric-card">
              <span className="metric-label">{t('sales.e89b20')}</span>
              <strong className="metric-value">{formatCurrency(computedSubTotal)}</strong>
            </div>
            <div className="report-metric-card">
              <span className="metric-label">{t('sales.ad68a9')}</span>
              <strong className="metric-value">{formatCurrency(computedTax)}</strong>
            </div>
            <div className="report-metric-card metric-card-highlight">
              <span className="metric-label">{t('sales.88fc73')}</span>
              <strong className="metric-value">{formatCurrency(computedTotal)}</strong>
            </div>
          </div>
        </div>

        {(localError || errorMessage) ? <div className="error-box" style={{ marginTop: 12 }}>{localError || errorMessage}</div> : null}
        <div className="actions dialog-actions sticky-form-actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={handleCancel} disabled={isBusy}>{t('sales.9932cc')}</Button>
          <Button variant="secondary" onClick={handleReset} disabled={isBusy || !isDirty}>{t('sales.722b47')}</Button>
          <Button variant="primary" disabled={isBusy} onClick={async () => {
            if (!normalizedItems.length) {
              setLocalError(t('sales.f7181a'));
              return;
            }
            if (normalizedItems.some((item) => item.qty <= 0 || item.price < 0)) {
              setLocalError(t('sales.7c2636'));
              return;
            }
            if (discount < 0) {
              setLocalError(t('sales.53dd25'));
              return;
            }
            if (paymentType === 'credit' && !sale.customerId) {
              setLocalError(t('sales.ca9c8e'));
              return;
            }
            if (String(editReason || '').trim().length < 8) {
              setLocalError(t('sales.bee06e'));
              return;
            }
            if (!String(managerPin || '').trim()) {
              setLocalError(t('sales.d0c62a'));
              return;
            }
            setLocalError('');
            await onSave({
              paymentType,
              paymentChannel: paymentType === 'credit' ? 'credit' : paymentChannel,
              discount: Number(discount || 0),
              note,
              editReason: String(editReason || '').trim(),
              managerPin: String(managerPin || '').trim(),
              paidAmount: 0,
              items: normalizedItems
            });
          }}>{isBusy ? t('sales.c793e5') : t('sales.ea76b8')}</Button>
        </div>
      </FormSection>
    </DialogShell>
  );
}

