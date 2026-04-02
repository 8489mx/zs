import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { DialogShell } from '@/components/shared/DialogShell';
import { DraftStateNotice } from '@/components/shared/DraftStateNotice';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { formatCurrency } from '@/lib/format';
import type { Purchase } from '@/types/domain';

interface PurchaseEditDialogProps {
  open: boolean;
  purchase?: Purchase;
  isBusy?: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onSave: (payload: { paymentType: string; discount: number; note: string; editReason: string; managerPin: string; items: Array<{ productId: string; qty: number; cost: number; unitName: string; unitMultiplier: number }> }) => Promise<void> | void;
}

export function PurchaseEditDialog({ open, purchase, isBusy = false, errorMessage = '', onCancel, onSave }: PurchaseEditDialogProps) {
  const [paymentType, setPaymentType] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; name: string; qty: number; cost: number; unitName: string; unitMultiplier: number }>>([]);
  const [editReason, setEditReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open || !purchase) return;
    setPaymentType(purchase.paymentType || 'cash');
    setDiscount(Number(purchase.discount || 0));
    setNote(purchase.note || '');
    setItems((purchase.items || []).map((item) => ({
      productId: String(item.productId),
      name: item.name,
      qty: Number(item.qty || 0),
      cost: Number(item.cost || 0),
      unitName: item.unitName || 'قطعة',
      unitMultiplier: Number(item.unitMultiplier || 1)
    })));
    setEditReason('');
    setManagerPin('');
    setLocalError('');
  }, [open, purchase]);

  const baselineItems = useMemo(() => (purchase?.items || []).map((item) => ({
    productId: String(item.productId),
    qty: Number(item.qty || 0),
    cost: Number(item.cost || 0),
    unitName: item.unitName || 'قطعة',
    unitMultiplier: Number(item.unitMultiplier || 1)
  })), [purchase]);
  const normalizedItems = useMemo(() => items.map((item) => ({
    productId: item.productId,
    qty: Number(item.qty || 0),
    cost: Number(item.cost || 0),
    unitName: item.unitName,
    unitMultiplier: item.unitMultiplier
  })), [items]);
  const isDirty = useMemo(() => {
    if (!purchase) return false;
    return (
      paymentType !== (purchase.paymentType || 'cash')
      || Number(discount || 0) !== Number(purchase.discount || 0)
      || note !== (purchase.note || '')
      || JSON.stringify(normalizedItems) !== JSON.stringify(baselineItems)
    );
  }, [baselineItems, discount, normalizedItems, note, paymentType, purchase]);
  const canNavigateAway = useUnsavedChangesGuard(open && isDirty && !isBusy);

  const computedSubTotal = useMemo(() => Number(items.reduce((sum, item) => sum + item.qty * item.cost, 0).toFixed(2)), [items]);
  const computedTax = useMemo(() => {
    if (!purchase) return 0;
    const taxable = Math.max(0, computedSubTotal - discount);
    const taxRate = Number(purchase.taxRate || 0);
    if (!taxRate) return 0;
    if (purchase.pricesIncludeTax) return Number((taxable - taxable / (1 + taxRate / 100)).toFixed(2));
    return Number((taxable * (taxRate / 100)).toFixed(2));
  }, [computedSubTotal, discount, purchase]);
  const computedTotal = useMemo(() => {
    if (!purchase) return 0;
    const taxable = Math.max(0, computedSubTotal - discount);
    return purchase.pricesIncludeTax ? Number(taxable.toFixed(2)) : Number((taxable + computedTax).toFixed(2));
  }, [computedSubTotal, computedTax, discount, purchase]);

  function handleCancel() {
    if (isBusy) return;
    if (!canNavigateAway()) return;
    onCancel();
  }

  function handleReset() {
    if (!purchase) return;
    setPaymentType(purchase.paymentType || 'cash');
    setDiscount(Number(purchase.discount || 0));
    setNote(purchase.note || '');
    setItems((purchase.items || []).map((item) => ({
      productId: String(item.productId),
      name: item.name,
      qty: Number(item.qty || 0),
      cost: Number(item.cost || 0),
      unitName: item.unitName || 'قطعة',
      unitMultiplier: Number(item.unitMultiplier || 1)
    })));
    setEditReason('');
    setManagerPin('');
    setLocalError('');
  }

  if (!open || !purchase) return null;

  return (
    <DialogShell open={open} onClose={handleCancel} width="min(980px, 100%)" zIndex={70}>
      <Card title={`تعديل ${purchase.docNo || purchase.id}`} actions={<span className="nav-pill">تعديل</span>} className="dialog-card dialog-card-wide">
        <DraftStateNotice visible={isDirty && !isBusy} title="تعديلات فاتورة الشراء الحالية غير محفوظة" hint="أعد القيم الأصلية أو احفظ التعديلات قبل إغلاق نافذة التعديل." />
        <div className="form-grid">
          <Field label="نوع السداد">
            <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} disabled={isBusy}>
              <option value="cash">نقدي</option>
              <option value="credit">آجل</option>
            </select>
          </Field>
          <Field label="خصم الفاتورة"><input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value || 0))} disabled={isBusy} /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Field label="ملاحظات"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={isBusy} /></Field></div>
          <div style={{ gridColumn: '1 / -1' }}><Field label="سبب التعديل"><textarea rows={2} value={editReason} onChange={(e) => setEditReason(e.target.value)} disabled={isBusy} placeholder="مثال: تعديل التكلفة بعد مراجعة فاتورة المورد" /></Field></div>
          <Field label="رمز اعتماد المدير"><input type="password" inputMode="numeric" value={managerPin} onChange={(e) => setManagerPin(e.target.value)} disabled={isBusy} placeholder="أدخل رمز المدير" /></Field>
        </div>

        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>التكلفة</th><th>الإجمالي</th></tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.productId}-${item.unitName}-${index}`}>
                  <td>{item.name}</td>
                  <td>{item.unitName}</td>
                  <td><input type="number" min="0.001" step="0.001" value={item.qty} onChange={(e) => setItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, qty: Number(e.target.value || 0) } : entry))} disabled={isBusy} /></td>
                  <td><input type="number" min="0" step="0.01" value={item.cost} onChange={(e) => setItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, cost: Number(e.target.value || 0) } : entry))} disabled={isBusy} /></td>
                  <td>{formatCurrency(Number((item.qty * item.cost).toFixed(2)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stats-grid compact-grid" style={{ marginTop: 12 }}>
          <div className="stat-card"><span>قبل الضريبة</span><strong>{formatCurrency(computedSubTotal)}</strong></div>
          <div className="stat-card"><span>الضريبة</span><strong>{formatCurrency(computedTax)}</strong></div>
          <div className="stat-card"><span>الإجمالي</span><strong>{formatCurrency(computedTotal)}</strong></div>
        </div>

        {(localError || errorMessage) ? <div className="error-box" style={{ marginTop: 12 }}>{localError || errorMessage}</div> : null}
        <div className="actions dialog-actions sticky-form-actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={handleCancel} disabled={isBusy}>إغلاق</Button>
          <Button variant="secondary" onClick={handleReset} disabled={isBusy || !isDirty}>إعادة القيم</Button>
          <Button variant="primary" disabled={isBusy} onClick={async () => {
            if (!normalizedItems.length) {
              setLocalError('يجب أن تحتوي الفاتورة على صنف واحد على الأقل');
              return;
            }
            if (normalizedItems.some((item) => item.qty <= 0 || item.cost < 0)) {
              setLocalError('راجع الكميات والتكلفة داخل الفاتورة');
              return;
            }
            if (discount < 0) {
              setLocalError('الخصم لا يمكن أن يكون سالبًا');
              return;
            }
            if (String(editReason || '').trim().length < 8) {
              setLocalError('سبب التعديل يجب أن يكون واضحًا');
              return;
            }
            if (!String(managerPin || '').trim()) {
              setLocalError('أدخل رمز اعتماد المدير قبل حفظ التعديل');
              return;
            }
            setLocalError('');
            await onSave({
              paymentType,
              discount: Number(discount || 0),
              note,
              editReason: String(editReason || '').trim(),
              managerPin: String(managerPin || '').trim(),
              items: normalizedItems
            });
          }}>{isBusy ? 'جارٍ حفظ التعديل...' : 'حفظ التعديل'}</Button>
        </div>
      </Card>
    </DialogShell>
  );
}
