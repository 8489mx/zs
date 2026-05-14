import { FormEvent, useMemo, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { paymentLabel } from '@/features/pos/lib/pos-workspace.helpers';
import { PosCartPaymentSection } from '@/features/pos/components/pos-cart-panel/PosCartPaymentSection';
import { PosCustomerPickerDialog } from '@/features/pos/components/pos-cart-panel/PosCustomerPickerDialog';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';

interface PosCheckoutDialogProps {
  open: boolean;
  pos: PosWorkspaceState;
  selectedCustomerName: string;
  onClose: () => void;
  onRequestDiscountAuthorization: () => void;
  onConfirmSale: () => void;
}

function getBalancePreview(pos: Pick<PosWorkspaceState, 'paymentType' | 'amountDue' | 'changeAmount'>) {
  if (pos.paymentType === 'credit') {
    return {
      label: 'المتبقي على العميل',
      value: -Math.abs(Number(pos.amountDue || 0)),
      tone: 'danger' as const,
    };
  }
  if (Number(pos.amountDue || 0) > 0.009) {
    return {
      label: 'المتبقي',
      value: -Math.abs(Number(pos.amountDue || 0)),
      tone: 'danger' as const,
    };
  }
  return {
    label: 'الباقي',
    value: Math.abs(Number(pos.changeAmount || 0)),
    tone: 'primary' as const,
  };
}

export function PosCheckoutDialog({
  open,
  pos,
  selectedCustomerName,
  onClose,
  onRequestDiscountAuthorization,
  onConfirmSale,
}: PosCheckoutDialogProps) {
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  const selectedCustomer = useMemo(
    () => (pos.customersQuery.data || []).find((customer) => String(customer.id) === String(pos.customerId)) || null,
    [pos.customerId, pos.customersQuery.data],
  );
  const piecesCount = useMemo(
    () => pos.cart.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [pos.cart],
  );
  const itemsCount = pos.cart.length;
  const balance = getBalancePreview(pos);
  const paidAmount = Number(pos.paidAmount || 0);
  const needsCreditCustomer = pos.paymentType === 'credit' && !String(pos.customerId || '').trim();

  async function handleQuickCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await pos.handleQuickCustomerSubmit(event);
  }

  if (!open) return null;

  return (
    <>
      <DialogShell
        open={open}
        onClose={pos.createSale.isPending ? () => {} : onClose}
        width="min(920px, 100%)"
        zIndex={86}
        ariaLabel="مراجعة وإتمام البيع"
      >
        <Card title="مراجعة وإتمام البيع" className="dialog-card">
          <div className="pos-checkout-dialog">
            <div className="pos-checkout-dialog-section">
              <h4>ملخص الفاتورة</h4>
              <div className="pos-checkout-dialog-summary">
                <div className="pos-checkout-dialog-chip">
                  <span>عدد العناصر</span>
                  <strong>{itemsCount}</strong>
                </div>
                <div className="pos-checkout-dialog-chip">
                  <span>عدد القطع</span>
                  <strong>{piecesCount}</strong>
                </div>
                <div className="pos-checkout-dialog-chip">
                  <span>المطلوب دفعه</span>
                  <strong className="is-primary">{formatCurrency(pos.totals.total)}</strong>
                </div>
              </div>
            </div>

            <div className="pos-checkout-dialog-section">
              <h4>بيانات العميل</h4>
              <div className="actions compact-actions" style={{ justifyContent: 'space-between' }}>
                <strong>{selectedCustomer?.name || selectedCustomerName || 'عميل نقدي'}</strong>
                <div className="actions compact-actions">
                  <Button variant="secondary" onClick={() => setCustomerPickerOpen(true)}>اختيار عميل</Button>
                  <Button variant="secondary" onClick={() => pos.setCustomerId('')}>عميل نقدي</Button>
                </div>
              </div>
              <form onSubmit={(event) => { void handleQuickCustomerSubmit(event); }}>
                <div className="form-grid">
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
                </div>
                <div className="actions compact-actions" style={{ marginTop: 10 }}>
                  <Button type="submit" variant="secondary" disabled={pos.quickCustomerMutation.isPending || !pos.quickCustomerName.trim()}>
                    {pos.quickCustomerMutation.isPending ? 'جاري الإضافة...' : 'إضافة عميل'}
                  </Button>
                </div>
              </form>
            </div>

            <div className="pos-checkout-dialog-section">
              <h4>الدفع</h4>
              <PosCartPaymentSection
                paymentType={pos.paymentType}
                paymentChannel={pos.paymentChannel}
                cashAmount={pos.cashAmount}
                cardAmount={pos.cardAmount}
                transferAmount={pos.transferAmount}
                discount={pos.discount}
                amountDue={pos.amountDue}
                changeAmount={pos.changeAmount}
                customerId={pos.customerId}
                canApplyDiscount={pos.canApplyDiscount}
                discountApprovalGranted={pos.discountApprovalGranted}
                isDiscountAuthorizationPending={pos.discountAuthorizationMutation.isPending}
                hasDiscountPermissionViolation={pos.hasDiscountPermissionViolation}
                onPaymentPresetChange={pos.setPaymentPreset}
                onCashAmountChange={pos.setCashAmount}
                onCardAmountChange={pos.setCardAmount}
                onTransferAmountChange={pos.setTransferAmount}
                onDiscountChange={pos.setDiscount}
                onFillPaidAmount={pos.fillPaidAmount}
                onRequestDiscountAuthorization={onRequestDiscountAuthorization}
              />

              <div className="pos-checkout-dialog-summary">
                <div className="pos-checkout-dialog-chip">
                  <span>طريقة الدفع</span>
                  <strong>{paymentLabel(pos.paymentType, pos.paymentChannel)}</strong>
                </div>
                <div className="pos-checkout-dialog-chip">
                  <span>المطلوب دفعه</span>
                  <strong className="is-primary">{formatCurrency(pos.totals.total)}</strong>
                </div>
                <div className="pos-checkout-dialog-chip">
                  <span>المدفوع</span>
                  <strong className="is-success">{formatCurrency(paidAmount)}</strong>
                </div>
                <div className="pos-checkout-dialog-chip">
                  <span>{balance.label}</span>
                  <strong className={balance.tone === 'danger' ? 'is-danger' : 'is-primary'}>
                    {formatCurrency(balance.value)}
                  </strong>
                </div>
              </div>
              {needsCreditCustomer ? (
                <div className="error-box">البيع الآجل يحتاج اختيار عميل.</div>
              ) : null}
            </div>

            <div className="pos-checkout-dialog-section">
              <h4>ملاحظات الفاتورة</h4>
              <label className="field field-wide">
                <input
                  value={pos.note}
                  onChange={(event) => pos.setNote(event.target.value)}
                  placeholder="ملاحظات اختيارية"
                  disabled={pos.createSale.isPending}
                />
              </label>
            </div>

            <div className="actions compact-actions" style={{ justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={onClose} disabled={pos.createSale.isPending}>
                رجوع للسلة
              </Button>
              <Button
                type="button"
                variant="success"
                onClick={onConfirmSale}
                disabled={pos.createSale.isPending || !pos.canSubmitSale}
              >
                {pos.createSale.isPending ? 'جاري الحفظ...' : 'تأكيد البيع'}
              </Button>
            </div>
          </div>
        </Card>
      </DialogShell>

      <PosCustomerPickerDialog
        open={customerPickerOpen}
        customers={pos.customersQuery.data || []}
        customerId={pos.customerId}
        onClose={() => setCustomerPickerOpen(false)}
        onSelect={(customerId) => pos.setCustomerId(customerId)}
      />
    </>
  );
}
