import type { FormEvent, RefObject } from 'react';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { paymentLabel } from '@/features/pos/lib/pos-workspace.helpers';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';

export type PaymentPreset = 'cash' | 'card' | 'wallet' | 'instapay' | 'credit';

type CustomerOption = { id: string | number; name: string; phone?: string | null };

function getBalancePreview(pos: Pick<PosWorkspaceState, 'paymentType' | 'amountDue' | 'changeAmount'>) {
  if (pos.paymentType === 'credit') {
    return { label: 'المتبقي على العميل', value: -Math.abs(Number(pos.amountDue || 0)), tone: 'danger' as const };
  }
  if (Number(pos.amountDue || 0) > 0.009) {
    return { label: 'المتبقي', value: -Math.abs(Number(pos.amountDue || 0)), tone: 'danger' as const };
  }
  return { label: 'الباقي', value: Math.abs(Number(pos.changeAmount || 0)), tone: 'primary' as const };
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

interface PosCheckoutCustomerSectionProps {
  pos: PosWorkspaceState;
  selectedCustomerName: string;
  selectedCustomer: CustomerOption | null;
  filteredCustomers: CustomerOption[];
  customerPickerOpen: boolean;
  customerQuery: string;
  onCustomerPickerOpenChange: (value: boolean | ((current: boolean) => boolean)) => void;
  onCustomerQueryChange: (value: string) => void;
  onQuickCustomerSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function PosCheckoutCustomerSection({
  pos,
  selectedCustomerName,
  selectedCustomer,
  filteredCustomers,
  customerPickerOpen,
  customerQuery,
  onCustomerPickerOpenChange,
  onCustomerQueryChange,
  onQuickCustomerSubmit,
}: PosCheckoutCustomerSectionProps) {
  return (
    <section className="pos-checkout-dialog-section pos-checkout-customer-section">
      <div className="pos-checkout-section-head">
        <h4>بيانات العميل</h4>
        <strong>{selectedCustomer?.name || selectedCustomerName || 'عميل نقدي'}</strong>
      </div>
      <div className="pos-checkout-customer-actions">
        <Button type="button" variant="secondary" onClick={() => onCustomerPickerOpenChange((current) => !current)}>اختيار عميل</Button>
        <Button type="button" variant="secondary" onClick={() => { pos.setCustomerId(''); onCustomerPickerOpenChange(false); }}>عميل نقدي</Button>
      </div>

      {customerPickerOpen ? (
        <div className="pos-checkout-customer-picker" onKeyDown={(event) => {
          if (event.key === 'Escape' && !isTypingTarget(event.target)) onCustomerPickerOpenChange(false);
        }}>
          <label className="field field-wide">
            <span>بحث العميل</span>
            <input
              data-autofocus
              value={customerQuery}
              onChange={(event) => onCustomerQueryChange(event.target.value)}
              placeholder="اكتب اسم العميل أو رقم الهاتف"
            />
          </label>
          <div className="pos-checkout-customer-results">
            <button
              type="button"
              className={`pos-checkout-customer-result ${!pos.customerId ? 'is-selected' : ''}`.trim()}
              onClick={() => { pos.setCustomerId(''); onCustomerPickerOpenChange(false); }}
            >
              <strong>عميل نقدي</strong>
              <span className="muted small">بدون ربط بعميل محدد</span>
            </button>
            {filteredCustomers.length ? filteredCustomers.map((customer) => {
              const isSelected = String(customer.id) === String(pos.customerId);
              return (
                <button
                  key={customer.id}
                  type="button"
                  className={`pos-checkout-customer-result ${isSelected ? 'is-selected' : ''}`.trim()}
                  onClick={() => { pos.setCustomerId(String(customer.id)); onCustomerPickerOpenChange(false); }}
                >
                  <strong>{customer.name}</strong>
                  <span className="muted small">{customer.phone || 'بدون رقم هاتف'}</span>
                </button>
              );
            }) : <div className="surface-note">لا توجد نتائج مطابقة الآن.</div>}
          </div>
        </div>
      ) : null}

      <form onSubmit={onQuickCustomerSubmit} className="pos-checkout-quick-customer-form">
        <label className="field">
          <span>اسم العميل الجديد</span>
          <input
            value={pos.quickCustomerName}
            onChange={(event) => pos.setQuickCustomerName(event.target.value)}
            placeholder="اسم العميل"
            disabled={pos.quickCustomerMutation.isPending}
          />
        </label>
        <label className="field">
          <span>رقم الهاتف</span>
          <input
            value={pos.quickCustomerPhone}
            onChange={(event) => pos.setQuickCustomerPhone(event.target.value)}
            placeholder="اختياري"
            disabled={pos.quickCustomerMutation.isPending}
          />
        </label>
        <Button type="submit" variant="secondary" disabled={pos.quickCustomerMutation.isPending || !pos.quickCustomerName.trim()}>
          {pos.quickCustomerMutation.isPending ? 'جاري الإضافة...' : 'إضافة عميل'}
        </Button>
      </form>
    </section>
  );
}

interface PosCheckoutPaymentSectionProps {
  pos: PosWorkspaceState;
  cashAmountInputRef: RefObject<HTMLInputElement | null>;
  managerPinInputRef: RefObject<HTMLInputElement | null>;
  customerPickerOpen: boolean;
  managerApprovalOpen: boolean;
  managerPinDraft: string;
  managerPinError: string;
  isDiscountLocked: boolean;
  approvedManagerPinRef: RefObject<string>;
  onManagerApprovalOpenChange: (value: boolean | ((current: boolean) => boolean)) => void;
  onManagerPinDraftChange: (value: string) => void;
  onManagerPinErrorChange: (value: string) => void;
  onInlineManagerApproval: (event?: FormEvent<HTMLFormElement>) => void;
  isPaymentActive: (preset: PaymentPreset) => boolean;
  onSelectPaymentPreset: (preset: PaymentPreset) => void;
}

export function PosCheckoutPaymentSection({
  pos,
  cashAmountInputRef,
  managerPinInputRef,
  customerPickerOpen,
  managerApprovalOpen,
  managerPinDraft,
  managerPinError,
  isDiscountLocked,
  approvedManagerPinRef,
  onManagerApprovalOpenChange,
  onManagerPinDraftChange,
  onManagerPinErrorChange,
  onInlineManagerApproval,
  isPaymentActive,
  onSelectPaymentPreset,
}: PosCheckoutPaymentSectionProps) {
  const balance = getBalancePreview(pos);
  const paidAmount = Number(pos.paidAmount || 0);
  const isCreditSale = pos.paymentType === 'credit';
  const needsCreditCustomer = isCreditSale && !String(pos.customerId || '').trim();
  const transferSelected = !isCreditSale && (pos.paymentChannel === 'wallet' || pos.paymentChannel === 'instapay');

  return (
    <section className="pos-checkout-dialog-section pos-checkout-payment-section">
      <div className="pos-checkout-section-head"><h4>الدفع</h4><strong>{paymentLabel(pos.paymentType, pos.paymentChannel)}</strong></div>
      <div className="pos-checkout-payment-methods" aria-label="طريقة الدفع">
        <Button type="button" variant={isPaymentActive('cash') ? 'primary' : 'secondary'} onClick={() => onSelectPaymentPreset('cash')}>نقدي</Button>
        <Button type="button" variant={isPaymentActive('card') ? 'primary' : 'secondary'} onClick={() => onSelectPaymentPreset('card')}>فيزا</Button>
        <Button type="button" variant={isPaymentActive('credit') ? 'primary' : 'secondary'} onClick={() => onSelectPaymentPreset('credit')}>آجل</Button>
        <Button type="button" variant={transferSelected ? 'primary' : 'secondary'} onClick={() => onSelectPaymentPreset(pos.paymentChannel === 'instapay' ? 'instapay' : 'wallet')}>تحويلات</Button>
      </div>

      {transferSelected ? (
        <div className="pos-checkout-transfer-methods" aria-label="نوع التحويل">
          <Button type="button" variant={pos.paymentChannel === 'wallet' ? 'primary' : 'secondary'} onClick={() => onSelectPaymentPreset('wallet')}>محفظة إلكترونية</Button>
          <Button type="button" variant={pos.paymentChannel === 'instapay' ? 'primary' : 'secondary'} onClick={() => onSelectPaymentPreset('instapay')}>InstaPay</Button>
        </div>
      ) : null}

      <div className="pos-checkout-payment-inputs">
        <label className="field"><span>نقدي</span><input ref={cashAmountInputRef} data-autofocus={!customerPickerOpen ? true : undefined} type="number" step="0.01" value={pos.cashAmount} onChange={(event) => pos.setCashAmount(Number(event.target.value || 0))} disabled={isCreditSale || transferSelected} /></label>
        <label className="field"><span>فيزا</span><input type="number" step="0.01" value={pos.cardAmount} onChange={(event) => pos.setCardAmount(Number(event.target.value || 0))} disabled={isCreditSale || transferSelected} /></label>
        {transferSelected ? <label className="field"><span>{pos.paymentChannel === 'instapay' ? 'مدفوع InstaPay' : 'مدفوع محفظة'}</span><input type="number" step="0.01" value={pos.transferAmount} onChange={(event) => pos.setTransferAmount(Number(event.target.value || 0))} disabled={isCreditSale} /></label> : null}
        <label className="field"><span>الخصم</span><input type="number" step="0.01" value={pos.discount} onChange={(event) => pos.setDiscount(Number(event.target.value || 0))} disabled={isDiscountLocked} /></label>
        {isDiscountLocked ? (
          <Button type="button" variant={pos.discountApprovalGranted ? 'success' : 'secondary'} onClick={() => {
            if (pos.discountApprovalGranted) return;
            onManagerPinErrorChange('');
            onManagerPinDraftChange('');
            onManagerApprovalOpenChange((current) => !current);
          }} disabled={pos.discountAuthorizationMutation.isPending}>
            {pos.discountAuthorizationMutation.isPending ? 'جاري التحقق...' : (pos.discountApprovalGranted ? 'الخصم معتمد' : 'اعتماد المدير')}
          </Button>
        ) : null}
        {!isCreditSale ? <Button type="button" variant="secondary" onClick={pos.fillPaidAmount}>كامل</Button> : null}
      </div>

      {managerApprovalOpen && isDiscountLocked && !pos.discountApprovalGranted ? (
        <form className="pos-checkout-manager-approval" onSubmit={onInlineManagerApproval}>
          <label className="field field-wide"><span>PIN المدير</span><input ref={managerPinInputRef} type="password" inputMode="numeric" autoComplete="off" value={managerPinDraft} onChange={(event) => { onManagerPinDraftChange(event.target.value); if (managerPinError) onManagerPinErrorChange(''); }} placeholder="اكتب PIN المدير" disabled={pos.discountAuthorizationMutation.isPending} /></label>
          <div className="surface-note">يُستخدم PIN للتحقق فقط داخل هذه الفاتورة، ثم يتم مسحه ولا يُحفظ في المسودة.</div>
          {managerPinError ? <div className="error-box">{managerPinError}</div> : null}
          <div className="actions compact-actions">
            <Button type="submit" disabled={pos.discountAuthorizationMutation.isPending}>{pos.discountAuthorizationMutation.isPending ? 'جاري التحقق...' : 'اعتماد الخصم'}</Button>
            <Button type="button" variant="secondary" onClick={() => { onManagerApprovalOpenChange(false); onManagerPinDraftChange(''); onManagerPinErrorChange(''); approvedManagerPinRef.current = ''; }} disabled={pos.discountAuthorizationMutation.isPending}>إلغاء</Button>
          </div>
        </form>
      ) : null}

      <div className="pos-checkout-dialog-summary pos-checkout-payment-summary">
        <div className="pos-checkout-dialog-chip"><span>المطلوب دفعه</span><strong className="is-primary">{formatCurrency(pos.totals.total)}</strong></div>
        <div className="pos-checkout-dialog-chip"><span>المدفوع</span><strong className="is-success">{formatCurrency(paidAmount)}</strong></div>
        <div className="pos-checkout-dialog-chip"><span>{balance.label}</span><strong className={balance.tone === 'danger' ? 'is-danger' : 'is-primary'}>{formatCurrency(balance.value)}</strong></div>
      </div>

      {needsCreditCustomer ? <div className="error-box">البيع الآجل يحتاج اختيار عميل.</div> : null}
      {!pos.canApplyDiscount ? <div className="pos-payment-strip-notes"><span className="pos-payment-strip-note">{pos.discountApprovalGranted ? 'تم اعتماد الخصم لهذه الفاتورة فقط.' : 'لا تملك صلاحية تعديل الخصم. استخدم اعتماد المدير لهذه الفاتورة.'}</span></div> : null}
      {pos.hasDiscountPermissionViolation ? <div className="error-box">تم اكتشاف خصم غير مسموح به في هذه الفاتورة.</div> : null}
    </section>
  );
}
