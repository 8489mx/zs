import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartPaymentSection(props: Pick<PosCartPanelProps,
  'paymentType' | 'paymentChannel' | 'cashAmount' | 'cardAmount' | 'paidAmount' | 'discount' | 'note' |
  'onPaymentTypeChange' | 'onCashAmountChange' | 'onCardAmountChange' | 'onDiscountChange' | 'onNoteChange' | 'onFillPaidAmount'
>) {
  return (
    <div className="pos-payment-shell pos-payment-shell-compact">
      <div className="pos-payment-grid-premium pos-payment-grid-premium-compact">
        <Field label="نوع البيع">
          <select value={props.paymentType} onChange={(event) => props.onPaymentTypeChange(event.target.value === 'credit' ? 'credit' : 'cash')}>
            <option value="cash">مباشر</option>
            <option value="credit">آجل</option>
          </select>
        </Field>
        <div className="field"><span>التحصيل</span><div className="input-like">{props.paymentType === 'credit' ? 'آجل' : props.paymentChannel === 'mixed' ? 'مختلط' : props.paymentChannel === 'card' ? 'بطاقة' : 'نقدي'}</div></div>
        <Field label="نقدي"><input type="number" step="0.01" value={props.paymentType === 'credit' ? 0 : props.cashAmount} onChange={(event) => props.onCashAmountChange(Number(event.target.value || 0))} disabled={props.paymentType === 'credit'} /></Field>
        <Field label="بطاقة"><input type="number" step="0.01" value={props.paymentType === 'credit' ? 0 : props.cardAmount} onChange={(event) => props.onCardAmountChange(Number(event.target.value || 0))} disabled={props.paymentType === 'credit'} /></Field>
        <Field label="المدفوع"><input type="number" step="0.01" value={props.paymentType === 'credit' ? 0 : props.paidAmount} readOnly disabled /></Field>
        <Field label="الخصم"><input type="number" step="0.01" value={props.discount} onChange={(event) => props.onDiscountChange(Number(event.target.value || 0))} /></Field>
        <div className="pos-payment-wide-field">
          <Field label="ملاحظات"><input value={props.note} onChange={(event) => props.onNoteChange(event.target.value)} placeholder="ملاحظة داخلية" /></Field>
        </div>
        <div className="field pos-inline-button-field pos-payment-fill-field">
          <Button onClick={props.onFillPaidAmount} disabled={props.paymentType === 'credit'}>المبلغ كامل</Button>
        </div>
      </div>
    </div>
  );
}
