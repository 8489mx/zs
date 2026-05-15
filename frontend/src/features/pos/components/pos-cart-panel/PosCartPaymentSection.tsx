import { flushSync } from 'react-dom';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { writeCheckoutIntent } from '@/features/pos/lib/pos-checkout-integrity';
import type { PosCartPanelProps } from './posCartPanel.types';

type PaymentPreset = 'cash' | 'card' | 'wallet' | 'instapay' | 'credit';

function isPresetActive(
  paymentType: PosCartPanelProps['paymentType'],
  paymentChannel: PosCartPanelProps['paymentChannel'],
  preset: PaymentPreset,
) {
  if (preset === 'credit') return paymentType === 'credit';
  if (paymentType === 'credit') return false;
  if (preset === 'wallet' || preset === 'instapay') return paymentChannel === preset;
  if (preset === 'card') return paymentChannel === 'card';
  return paymentChannel === 'cash';
}

function isTransferPreset(paymentType: PosCartPanelProps['paymentType'], paymentChannel: PosCartPanelProps['paymentChannel']) {
  return paymentType !== 'credit' && (paymentChannel === 'wallet' || paymentChannel === 'instapay');
}

function getBalanceState(props: Pick<PosCartPanelProps, 'paymentType' | 'amountDue' | 'changeAmount'>) {
  if (props.paymentType === 'credit') {
    return { label: 'المتبقي', value: props.amountDue };
  }

  if (props.amountDue > 0.009) {
    return { label: 'المتبقي', value: props.amountDue };
  }

  return { label: 'الباقي', value: props.changeAmount };
}

export function PosCartPaymentSection(props: Pick<PosCartPanelProps,
  'paymentType' | 'paymentChannel' | 'cashAmount' | 'cardAmount' | 'transferAmount' | 'discount' | 'amountDue' | 'changeAmount' |
  'customerId' |
  'canApplyDiscount' | 'discountApprovalGranted' | 'isDiscountAuthorizationPending' | 'hasDiscountPermissionViolation' |
  'onPaymentPresetChange' | 'onCashAmountChange' | 'onCardAmountChange' | 'onTransferAmountChange' | 'onDiscountChange' | 'onFillPaidAmount' | 'onRequestDiscountAuthorization'
>) {
  const balance = getBalanceState(props);
  const isCreditSale = props.paymentType === 'credit';
  const isDiscountLocked = !props.canApplyDiscount;
  const transferSelected = isTransferPreset(props.paymentType, props.paymentChannel);

  function selectPaymentPreset(preset: PaymentPreset) {
    writeCheckoutIntent({
      customerId: props.customerId || '',
      paymentType: preset === 'credit' ? 'credit' : 'cash',
      paymentChannel: preset,
    });
    flushSync(() => {
      props.onPaymentPresetChange(preset);
    });
  }

  return (
    <div className="pos-payment-shell pos-payment-shell-compact pos-payment-shell-inline">
      <div className="pos-payment-strip" aria-label="طريقة الدفع والمدفوع">
        <div className="pos-strip-field pos-strip-field-inline pos-strip-presets">
          <span>طريقة السداد</span>
          <div className="actions compact-actions pos-payment-preset-row pos-payment-preset-row-inline">
            <Button type="button" variant={isPresetActive(props.paymentType, props.paymentChannel, 'cash') ? 'primary' : 'secondary'} onClick={() => selectPaymentPreset('cash')}>نقدي</Button>
            <Button type="button" variant={isPresetActive(props.paymentType, props.paymentChannel, 'card') ? 'primary' : 'secondary'} onClick={() => selectPaymentPreset('card')}>فيزا</Button>
            <Button type="button" variant={transferSelected ? 'primary' : 'secondary'} onClick={() => selectPaymentPreset(props.paymentChannel === 'instapay' ? 'instapay' : 'wallet')}>تحويلات</Button>
            <Button type="button" variant={isPresetActive(props.paymentType, props.paymentChannel, 'credit') ? 'primary' : 'secondary'} onClick={() => selectPaymentPreset('credit')}>آجل</Button>
          </div>
          {transferSelected ? (
            <div className="actions compact-actions pos-payment-preset-row pos-payment-preset-row-inline" style={{ marginTop: 8 }}>
              <Button type="button" variant={props.paymentChannel === 'wallet' ? 'primary' : 'secondary'} onClick={() => selectPaymentPreset('wallet')}>محفظة إلكترونية</Button>
              <Button type="button" variant={props.paymentChannel === 'instapay' ? 'primary' : 'secondary'} onClick={() => selectPaymentPreset('instapay')}>InstaPay</Button>
            </div>
          ) : null}
        </div>

        <label className="pos-strip-field pos-strip-field-inline pos-strip-field-input pos-strip-field-cash">
          <span>نقدي</span>
          <div className="pos-strip-input-shell">
            <input
              type="number"
              step="0.01"
              value={props.cashAmount}
              onChange={(event) => props.onCashAmountChange(Number(event.target.value || 0))}
              disabled={isCreditSale || transferSelected}
            />
            <Button
              type="button"
              variant="secondary"
              className="pos-payment-fill-inline"
              onClick={props.onFillPaidAmount}
              disabled={isCreditSale}
            >
              كامل
            </Button>
          </div>
        </label>

        <label className="pos-strip-field pos-strip-field-inline pos-strip-field-input pos-strip-field-card">
          <span>فيزا</span>
          <input
            type="number"
            step="0.01"
            value={props.cardAmount}
            onChange={(event) => props.onCardAmountChange(Number(event.target.value || 0))}
            disabled={isCreditSale || transferSelected}
          />
        </label>

        {transferSelected ? (
          <label className="pos-strip-field pos-strip-field-inline pos-strip-field-input pos-strip-field-card">
            <span>{props.paymentChannel === 'instapay' ? 'مدفوع InstaPay' : 'مدفوع محفظة'}</span>
            <input
              type="number"
              step="0.01"
              value={props.transferAmount}
              onChange={(event) => props.onTransferAmountChange(Number(event.target.value || 0))}
              disabled={isCreditSale}
            />
          </label>
        ) : null}

        <label className="pos-strip-field pos-strip-field-inline pos-strip-field-input pos-strip-field-discount">
          <span>الخصم</span>
          <div className="pos-strip-input-shell">
            <input
              type="number"
              step="0.01"
              value={props.discount}
              onChange={(event) => props.onDiscountChange(Number(event.target.value || 0))}
              disabled={isDiscountLocked}
            />
            {isDiscountLocked ? (
              <Button
                type="button"
                variant={props.discountApprovalGranted ? 'success' : 'secondary'}
                className="pos-payment-fill-inline"
                onClick={props.onRequestDiscountAuthorization}
                disabled={props.isDiscountAuthorizationPending}
              >
                {props.isDiscountAuthorizationPending ? 'جاري التحقق...' : (props.discountApprovalGranted ? 'معتمد' : 'اعتماد المدير')}
              </Button>
            ) : null}
          </div>
        </label>

        <div className="pos-strip-field pos-strip-field-inline pos-strip-balance">
          <span>{balance.label}</span>
          <strong>{formatCurrency(balance.value)}</strong>
        </div>
      </div>

      {!props.canApplyDiscount || props.hasDiscountPermissionViolation ? (
        <div className="pos-payment-strip-notes">
          {!props.canApplyDiscount ? (
            <span className="pos-payment-strip-note">
              {props.discountApprovalGranted ? 'تم اعتماد الخصم لهذه الفاتورة فقط.' : 'لا تملك صلاحية تعديل الخصم. استخدم اعتماد المدير لهذه الفاتورة.'}
            </span>
          ) : null}
          {props.hasDiscountPermissionViolation ? <span className="pos-payment-strip-note is-warning">تم اكتشاف خصم غير مسموح به في هذه الفاتورة.</span> : null}
        </div>
      ) : null}
    </div>
  );
}
