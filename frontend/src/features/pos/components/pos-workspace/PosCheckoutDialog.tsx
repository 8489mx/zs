import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { paymentLabel } from '@/features/pos/lib/pos-workspace.helpers';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';

interface PosCheckoutDialogProps {
  open: boolean;
  pos: PosWorkspaceState;
  selectedCustomerName: string;
  onClose: () => void;
  onConfirmSale: (managerPin?: string) => void;
}

type PaymentPreset = 'cash' | 'card' | 'wallet' | 'instapay' | 'credit';

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

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

export function PosCheckoutDialog({
  open,
  pos,
  selectedCustomerName,
  onClose,
  onConfirmSale,
}: PosCheckoutDialogProps) {
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [managerApprovalOpen, setManagerApprovalOpen] = useState(false);
  const [managerPinDraft, setManagerPinDraft] = useState('');
  const [managerPinError, setManagerPinError] = useState('');
  const cashAmountInputRef = useRef<HTMLInputElement | null>(null);
  const managerPinInputRef = useRef<HTMLInputElement | null>(null);
  const approvedManagerPinRef = useRef('');
  const openedOnceRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const createSalePendingRef = useRef(Boolean(pos.createSale.isPending));
  const isDiscountLocked = !pos.canApplyDiscount;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    createSalePendingRef.current = Boolean(pos.createSale.isPending);
  }, [pos.createSale.isPending]);

  const stableOnClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  const clearInlineManagerApproval = useCallback(() => {
    setManagerApprovalOpen(false);
    setManagerPinDraft('');
    setManagerPinError('');
    approvedManagerPinRef.current = '';
  }, []);

  const handleDialogClose = useCallback(() => {
    if (createSalePendingRef.current) return;
    clearInlineManagerApproval();
    stableOnClose();
  }, [clearInlineManagerApproval, stableOnClose]);

  const handleConfirmSale = useCallback(() => {
    const managerPin = approvedManagerPinRef.current || undefined;
    approvedManagerPinRef.current = '';
    onConfirmSale(managerPin);
  }, [onConfirmSale]);

  const handleInlineManagerApproval = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const managerPin = String(managerPinDraft || '').trim();
    setManagerPinError('');

    if (!managerPin) {
      setManagerPinError('اكتب PIN المدير أولًا.');
      managerPinInputRef.current?.focus();
      return;
    }

    try {
      await pos.discountAuthorizationMutation.mutateAsync(managerPin);
      approvedManagerPinRef.current = managerPin;
      pos.setDiscountApprovalGranted(true);
      pos.setDiscountApprovalSecret('');
      setManagerPinDraft('');
      setManagerApprovalOpen(false);
      pos.setSubmitMessage('تم اعتماد الخصم لهذه الفاتورة فقط.');
    } catch (error) {
      approvedManagerPinRef.current = '';
      pos.setDiscountApprovalSecret('');
      setManagerPinDraft('');
      setManagerPinError(getErrorMessage(error, 'تعذر اعتماد الخصم.'));
      managerPinInputRef.current?.focus();
    }
  }, [managerPinDraft, pos]);

  useEffect(() => {
    if (!open) {
      openedOnceRef.current = false;
      clearInlineManagerApproval();
      return;
    }
    if (openedOnceRef.current) return;
    openedOnceRef.current = true;
    const frameId = window.requestAnimationFrame(() => {
      if (customerPickerOpen || managerApprovalOpen) return;
      cashAmountInputRef.current?.focus();
      cashAmountInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [clearInlineManagerApproval, customerPickerOpen, managerApprovalOpen, open]);

  useEffect(() => {
    if (!isDiscountLocked || !pos.discountApprovalGranted) {
      approvedManagerPinRef.current = '';
    }
    if (!isDiscountLocked) {
      setManagerApprovalOpen(false);
      setManagerPinDraft('');
      setManagerPinError('');
    }
  }, [isDiscountLocked, pos.discountApprovalGranted]);

  useEffect(() => {
    if (!managerApprovalOpen || pos.discountApprovalGranted) return;
    const frameId = window.requestAnimationFrame(() => {
      managerPinInputRef.current?.focus();
      managerPinInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [managerApprovalOpen, pos.discountApprovalGranted]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'F2') return;
      event.preventDefault();
      event.stopPropagation();
      if (pos.createSale.isPending) return;
      if (managerApprovalOpen && !pos.discountApprovalGranted) {
        void handleInlineManagerApproval();
        return;
      }
      if (!pos.canSubmitSale) return;
      handleConfirmSale();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleConfirmSale, handleInlineManagerApproval, managerApprovalOpen, open, pos.canSubmitSale, pos.createSale.isPending, pos.discountApprovalGranted]);

  const customers = useMemo(
    () => (Array.isArray(pos.customersQuery.data) ? pos.customersQuery.data : []),
    [pos.customersQuery.data],
  );
  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer.id) === String(pos.customerId)) || null,
    [pos.customerId, customers],
  );
  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return customers.slice(0, 40);
    return customers.filter((customer) => (
      customer.name.toLowerCase().includes(query) || String(customer.phone || '').toLowerCase().includes(query)
    )).slice(0, 40);
  }, [customerQuery, customers]);
  const piecesCount = useMemo(
    () => pos.cart.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [pos.cart],
  );
  const itemsCount = pos.cart.length;
  const balance = getBalancePreview(pos);
  const paidAmount = Number(pos.paidAmount || 0);
  const needsCreditCustomer = pos.paymentType === 'credit' && !String(pos.customerId || '').trim();
  const transferSelected = pos.paymentType !== 'credit' && (pos.paymentChannel === 'wallet' || pos.paymentChannel === 'instapay');
  const isCreditSale = pos.paymentType === 'credit';

  async function handleQuickCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await pos.handleQuickCustomerSubmit(event);
  }

  function isPaymentActive(preset: PaymentPreset) {
    if (preset === 'credit') return pos.paymentType === 'credit';
    if (pos.paymentType === 'credit') return false;
    if (preset === 'wallet' || preset === 'instapay') return pos.paymentChannel === preset;
    return pos.paymentChannel === preset;
  }

  function selectPaymentPreset(preset: PaymentPreset) {
    pos.setPaymentPreset(preset);
  }

  if (!open) return null;

  return (
    <DialogShell
      open={open}
      onClose={handleDialogClose}
      width="min(980px, calc(100vw - 32px))"
      zIndex={86}
      ariaLabel="مراجعة وإتمام البيع"
    >
      <Card title="مراجعة وإتمام البيع" className="dialog-card pos-checkout-dialog-card">
        <div className="pos-checkout-dialog">
          <section className="pos-checkout-dialog-section pos-checkout-summary-section">
            <div className="pos-checkout-section-head">
              <h4>ملخص الفاتورة</h4>
              <span className="muted small">راجع الإجمالي قبل تأكيد البيع</span>
            </div>
            <div className="pos-checkout-dialog-summary pos-checkout-dialog-summary-main">
              <div className="pos-checkout-dialog-chip">
                <span>عدد العناصر</span>
                <strong>{itemsCount}</strong>
              </div>
              <div className="pos-checkout-dialog-chip">
                <span>عدد القطع</span>
                <strong>{piecesCount}</strong>
              </div>
              <div className="pos-checkout-dialog-chip is-total">
                <span>المطلوب دفعه</span>
                <strong className="is-primary">{formatCurrency(pos.totals.total)}</strong>
              </div>
            </div>
          </section>

          <section className="pos-checkout-dialog-section pos-checkout-customer-section">
            <div className="pos-checkout-section-head">
              <h4>بيانات العميل</h4>
              <strong>{selectedCustomer?.name || selectedCustomerName || 'عميل نقدي'}</strong>
            </div>
            <div className="pos-checkout-customer-actions">
              <Button type="button" variant="secondary" onClick={() => setCustomerPickerOpen((current) => !current)}>اختيار عميل</Button>
              <Button type="button" variant="secondary" onClick={() => { pos.setCustomerId(''); setCustomerPickerOpen(false); }}>عميل نقدي</Button>
            </div>

            {customerPickerOpen ? (
              <div className="pos-checkout-customer-picker" onKeyDown={(event) => {
                if (event.key === 'Escape' && !isTypingTarget(event.target)) setCustomerPickerOpen(false);
              }}>
                <label className="field field-wide">
                  <span>بحث العميل</span>
                  <input
                    data-autofocus
                    value={customerQuery}
                    onChange={(event) => setCustomerQuery(event.target.value)}
                    placeholder="اكتب اسم العميل أو رقم الهاتف"
                  />
                </label>
                <div className="pos-checkout-customer-results">
                  <button
                    type="button"
                    className={`pos-checkout-customer-result ${!pos.customerId ? 'is-selected' : ''}`.trim()}
                    onClick={() => { pos.setCustomerId(''); setCustomerPickerOpen(false); }}
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
                        onClick={() => { pos.setCustomerId(String(customer.id)); setCustomerPickerOpen(false); }}
                      >
                        <strong>{customer.name}</strong>
                        <span className="muted small">{customer.phone || 'بدون رقم هاتف'}</span>
                      </button>
                    );
                  }) : <div className="surface-note">لا توجد نتائج مطابقة الآن.</div>}
                </div>
              </div>
            ) : null}

            <form onSubmit={(event) => { void handleQuickCustomerSubmit(event); }} className="pos-checkout-quick-customer-form">
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

          <section className="pos-checkout-dialog-section pos-checkout-payment-section">
            <div className="pos-checkout-section-head">
              <h4>الدفع</h4>
              <strong>{paymentLabel(pos.paymentType, pos.paymentChannel)}</strong>
            </div>

            <div className="pos-checkout-payment-methods" aria-label="طريقة الدفع">
              <Button type="button" variant={isPaymentActive('cash') ? 'primary' : 'secondary'} onClick={() => selectPaymentPreset('cash')}>نقدي</Button>
              <Button type="button" variant={isPaymentActive('card') ? 'primary' : 'secondary'} onClick={() => selectPaymentPreset('card')}>فيزا</Button>
              <Button type="button" variant={isPaymentActive('credit') ? 'primary' : 'secondary'} onClick={() => selectPaymentPreset('credit')}>آجل</Button>
              <Button type="button" variant={transferSelected ? 'primary' : 'secondary'} onClick={() => selectPaymentPreset(pos.paymentChannel === 'instapay' ? 'instapay' : 'wallet')}>تحويلات</Button>
            </div>

            {transferSelected ? (
              <div className="pos-checkout-transfer-methods" aria-label="نوع التحويل">
                <Button type="button" variant={pos.paymentChannel === 'wallet' ? 'primary' : 'secondary'} onClick={() => selectPaymentPreset('wallet')}>محفظة إلكترونية</Button>
                <Button type="button" variant={pos.paymentChannel === 'instapay' ? 'primary' : 'secondary'} onClick={() => selectPaymentPreset('instapay')}>InstaPay</Button>
              </div>
            ) : null}

            <div className="pos-checkout-payment-inputs">
              <label className="field">
                <span>نقدي</span>
                <input
                  ref={cashAmountInputRef}
                  data-autofocus={!customerPickerOpen ? true : undefined}
                  type="number"
                  step="0.01"
                  value={pos.cashAmount}
                  onChange={(event) => pos.setCashAmount(Number(event.target.value || 0))}
                  disabled={isCreditSale || transferSelected}
                />
              </label>
              <label className="field">
                <span>فيزا</span>
                <input
                  type="number"
                  step="0.01"
                  value={pos.cardAmount}
                  onChange={(event) => pos.setCardAmount(Number(event.target.value || 0))}
                  disabled={isCreditSale || transferSelected}
                />
              </label>
              {transferSelected ? (
                <label className="field">
                  <span>{pos.paymentChannel === 'instapay' ? 'مدفوع InstaPay' : 'مدفوع محفظة'}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={pos.transferAmount}
                    onChange={(event) => pos.setTransferAmount(Number(event.target.value || 0))}
                    disabled={isCreditSale}
                  />
                </label>
              ) : null}
              <label className="field">
                <span>الخصم</span>
                <input
                  type="number"
                  step="0.01"
                  value={pos.discount}
                  onChange={(event) => pos.setDiscount(Number(event.target.value || 0))}
                  disabled={isDiscountLocked}
                />
              </label>
              {isDiscountLocked ? (
                <Button
                  type="button"
                  variant={pos.discountApprovalGranted ? 'success' : 'secondary'}
                  onClick={() => {
                    if (pos.discountApprovalGranted) return;
                    setManagerPinError('');
                    setManagerPinDraft('');
                    setManagerApprovalOpen((current) => !current);
                  }}
                  disabled={pos.discountAuthorizationMutation.isPending}
                >
                  {pos.discountAuthorizationMutation.isPending ? 'جاري التحقق...' : (pos.discountApprovalGranted ? 'الخصم معتمد' : 'اعتماد المدير')}
                </Button>
              ) : null}
              {!isCreditSale ? (
                <Button type="button" variant="secondary" onClick={pos.fillPaidAmount}>كامل</Button>
              ) : null}
            </div>

            {managerApprovalOpen && isDiscountLocked && !pos.discountApprovalGranted ? (
              <form className="pos-checkout-manager-approval" onSubmit={(event) => { void handleInlineManagerApproval(event); }}>
                <label className="field field-wide">
                  <span>PIN المدير</span>
                  <input
                    ref={managerPinInputRef}
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={managerPinDraft}
                    onChange={(event) => {
                      setManagerPinDraft(event.target.value);
                      if (managerPinError) setManagerPinError('');
                    }}
                    placeholder="اكتب PIN المدير"
                    disabled={pos.discountAuthorizationMutation.isPending}
                  />
                </label>
                <div className="surface-note">يُستخدم PIN للتحقق فقط داخل هذه الفاتورة، ثم يتم مسحه ولا يُحفظ في المسودة.</div>
                {managerPinError ? <div className="error-box">{managerPinError}</div> : null}
                <div className="actions compact-actions">
                  <Button type="submit" disabled={pos.discountAuthorizationMutation.isPending}>
                    {pos.discountAuthorizationMutation.isPending ? 'جاري التحقق...' : 'اعتماد الخصم'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setManagerApprovalOpen(false);
                      setManagerPinDraft('');
                      setManagerPinError('');
                      approvedManagerPinRef.current = '';
                    }}
                    disabled={pos.discountAuthorizationMutation.isPending}
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            ) : null}

            <div className="pos-checkout-dialog-summary pos-checkout-payment-summary">
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

            {needsCreditCustomer ? <div className="error-box">البيع الآجل يحتاج اختيار عميل.</div> : null}
            {!pos.canApplyDiscount ? (
              <div className="pos-payment-strip-notes">
                <span className="pos-payment-strip-note">
                  {pos.discountApprovalGranted ? 'تم اعتماد الخصم لهذه الفاتورة فقط.' : 'لا تملك صلاحية تعديل الخصم. استخدم اعتماد المدير لهذه الفاتورة.'}
                </span>
              </div>
            ) : null}
            {pos.hasDiscountPermissionViolation ? <div className="error-box">تم اكتشاف خصم غير مسموح به في هذه الفاتورة.</div> : null}
          </section>

          <section className="pos-checkout-dialog-section">
            <h4>ملاحظات الفاتورة</h4>
            <label className="field field-wide">
              <input
                value={pos.note}
                onChange={(event) => pos.setNote(event.target.value)}
                placeholder="ملاحظات اختيارية"
                disabled={pos.createSale.isPending}
              />
            </label>
          </section>

          <div className="actions compact-actions pos-checkout-dialog-actions">
            <Button type="button" variant="secondary" onClick={handleDialogClose} disabled={pos.createSale.isPending}>
              رجوع للسلة
            </Button>
            <Button
              type="button"
              variant="success"
              onClick={handleConfirmSale}
              disabled={pos.createSale.isPending || !pos.canSubmitSale}
            >
              {pos.createSale.isPending ? 'جاري الحفظ...' : 'تأكيد البيع (F2)'}
            </Button>
          </div>
        </div>
      </Card>
    </DialogShell>
  );
}
