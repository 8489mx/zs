import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { paymentLabel } from '@/features/pos/lib/pos-workspace.helpers';
import type { PosCartPanelProps } from './posCartPanel.types';

function isPresetActive(paymentType: PosCartPanelProps['paymentType'], paymentChannel: PosCartPanelProps['paymentChannel'], preset: 'cash' | 'card' | 'credit') {
  if (preset === 'credit') return paymentType === 'credit';
  if (preset === 'card') return paymentType !== 'credit' && paymentChannel === 'card';
  return paymentType !== 'credit' && paymentChannel === 'cash';
}

export function PosCartPaymentSection(props: Pick<PosCartPanelProps,
  'paymentType' | 'paymentChannel' | 'cashAmount' | 'cardAmount' | 'paidAmount' | 'discount' |
  'onPaymentPresetChange' | 'onCashAmountChange' | 'onCardAmountChange' | 'onDiscountChange' | 'onFillPaidAmount'
>) {
  return (
    <div className="pos-payment-shell pos-payment-shell-compact">
      <div className="pos-payment-grid-premium pos-payment-grid-premium-compact pos-payment-grid-tight">
        <div className="field pos-payment-preset-field pos-payment-preset-field-tight">
          <span>طريقة السداد</span>
          <div className="actions compact-actions pos-payment-preset-row pos-payment-preset-row-tight">
            <Button type="button" variant={isPresetActive(props.paymentType, props.paymentChannel, 'cash') ? 'primary' : 'secondary'} onClick={() => props.onPaymentPresetChange('cash')}>نقدي</Button>
            <Button type="button" variant={isPresetActive(props.paymentType, props.paymentChannel, 'card') ? 'primary' : 'secondary'} onClick={() => props.onPaymentPresetChange('card')}>فيزا</Button>
            <Button type="button" variant={isPresetActive(props.paymentType, props.paymentChannel, 'credit') ? 'primary' : 'secondary'} onClick={() => props.onPaymentPresetChange('credit')}>آجل</Button>
          </div>
        </div>
        <div className="field"><span>حالة التحصيل</span><div className="input-like">{paymentLabel(props.paymentType, props.paymentChannel)}</div></div>
        <Field label="نقدي"><input type="number" step="0.01" value={props.paymentType === 'credit' ? 0 : props.cashAmount} onChange={(event) => props.onCashAmountChange(Number(event.target.value || 0))} disabled={props.paymentType === 'credit'} /></Field>
        <Field label="فيزا"><input type="number" step="0.01" value={props.paymentType === 'credit' ? 0 : props.cardAmount} onChange={(event) => props.onCardAmountChange(Number(event.target.value || 0))} disabled={props.paymentType === 'credit'} /></Field>
        <Field label="المدفوع"><input type="number" step="0.01" value={props.paymentType === 'credit' ? 0 : props.paidAmount} readOnly disabled /></Field>
        <Field label="الخصم"><input type="number" step="0.01" value={props.discount} onChange={(event) => props.onDiscountChange(Number(event.target.value || 0))} /></Field>
        <div className="field pos-inline-button-field pos-payment-fill-field pos-payment-fill-field-inline">
          <span>&nbsp;</span>
          <Button onClick={props.onFillPaidAmount} disabled={props.paymentType === 'credit'}>المبلغ كامل</Button>
        </div>
      </div>
    </div>
  );
}
