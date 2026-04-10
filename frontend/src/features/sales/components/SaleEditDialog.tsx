import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { DialogShell } from '@/shared/components/dialog-shell';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { formatCurrency } from '@/lib/format';
import type { Sale } from '@/types/domain';

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
    paidAmount: number;
    editReason: string;
    managerPin: string;
    items: Array<{ productId: string; qty: number; price: number; unitName: string; unitMultiplier: number; priceType: string }>;
  }) => Promise<void> | void;
}

export function SaleEditDialog({ open, sale, isBusy = false, errorMessage = '', onCancel, onSave }: SaleEditDialogProps) {
  const [paymentType, setPaymentType] = useState('cash');
  const [paymentChannel, setPaymentChannel] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
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
    setPaidAmount(Number(sale.paidAmount || 0));
    setNote(sale.note || '');
    setItems((sale.items || []).map((item) => ({
      productId: String(item.productId),
      name: item.name,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      unitName: item.unitName || 'قطعة',
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
    unitName: item.unitName || 'قطعة',
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
      || Number(paidAmount || 0) !== Number(sale.paidAmount || 0)
      || note !== (sale.note || '')
      || JSON.stringify(normalizedItems) !== JSON.stringify(baselineItems)
    );
  }, [baselineItems, discount, normalizedItems, note, paidAmount, paymentChannel, paymentType, sale]);
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
    setPaidAmount(Number(sale.paidAmount || 0));
    setNote(sale.note || '');
    setItems((sale.items || []).map((item) => ({
      productId: String(item.productId),
      name: item.name,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      unitName: item.unitName || 'قطعة',
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
      <Card title={`تعديل ${sale.docNo || sale.id}`} actions={<span className="nav-pill">تعديل</span>} className="dialog-card dialog-card-wide">
        <DraftStateNotice visible={isDirty && !isBusy} title="تعديلات الفاتورة الحالية غير محفوظة" hint="يمكنك الحفظ أو إعادة القيم الأصلية قبل إغلاق نافذة التعديل." />
        <div className="form-grid">
          <Field label="نوع الدفع">
            <select value={paymentType} onChange={(e) => {
              const next = e.target.value;
              setPaymentType(next);
              if (next === 'credit') setPaymentChannel('credit');
            }} disabled={isBusy}>
              <option value="cash">نقدي</option>
              <option value="credit">آجل</option>
            </select>
          </Field>
          <Field label="قناة السداد">
            <select value={paymentChannel} onChange={(e) => setPaymentChannel(e.target.value)} disabled={isBusy || paymentType === 'credit'}>
              <option value="cash">نقدي</option>
              <option value="card">شبكة</option>
              <option value="credit">آجل</option>
            </select>
          </Field>
          <Field label="خصم الفاتورة"><input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value || 0))} disabled={isBusy} /></Field>
          <Field label="المدفوع الآن"><input type="number" min="0" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value || 0))} disabled={isBusy} /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Field label="ملاحظات"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={isBusy} /></Field></div>
          <div style={{ gridColumn: '1 / -1' }}><Field label="سبب التعديل"><textarea rows={2} value={editReason} onChange={(e) => setEditReason(e.target.value)} disabled={isBusy} placeholder="مثال: تعديل الكمية بعد اكتشاف خطأ في الإدخال" /></Field></div>
          <Field label="رمز اعتماد المدير"><input type="password" inputMode="numeric" value={managerPin} onChange={(e) => setManagerPin(e.target.value)} disabled={isBusy} placeholder="أدخل رمز المدير" /></Field>
        </div>

        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
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
            if (normalizedItems.some((item) => item.qty <= 0 || item.price < 0)) {
              setLocalError('راجع الكميات والأسعار داخل الفاتورة');
              return;
            }
            if (discount < 0) {
              setLocalError('الخصم لا يمكن أن يكون سالبًا');
              return;
            }
            if (paymentType === 'credit' && !sale.customerId) {
              setLocalError('لا يمكن جعل الفاتورة آجلة بدون عميل');
              return;
            }
            if (paymentType !== 'credit' && paidAmount < computedTotal) {
              setLocalError('المدفوع يجب أن يغطي إجمالي الفاتورة');
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
              paymentChannel: paymentType === 'credit' ? 'credit' : paymentChannel,
              discount: Number(discount || 0),
              note,
              paidAmount: Number(paidAmount || 0),
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
