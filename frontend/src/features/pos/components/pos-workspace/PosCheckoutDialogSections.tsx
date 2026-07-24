import { useState, useEffect, type FormEvent, type RefObject } from 'react';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { paymentLabel } from '@/features/pos/lib/pos-workspace.helpers';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import type { DeliveryRep } from '@/features/delivery-reps/api/delivery-reps.api';

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

  const [percentStr, setPercentStr] = useState('');
  const [isPercentFocused, setIsPercentFocused] = useState(false);

  useEffect(() => {
    if (!isPercentFocused) {
      setPercentStr(pos.discount > 0 && pos.totals.subTotal > 0 ? ((pos.discount / pos.totals.subTotal) * 100).toFixed(2).replace(/\.00$/, '') : '');
    }
  }, [pos.discount, pos.totals.subTotal, isPercentFocused]);

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
        <label className="field"><span>الخصم (مبلغ)</span><input type="number" step="0.01" value={pos.discount === 0 ? '' : pos.discount} onChange={(event) => pos.setDiscount(Number(event.target.value || 0))} disabled={isDiscountLocked} placeholder="0" /></label>
        <label className="field">
          <span>الخصم (%)</span>
          <input
            type="number"
            step="0.01"
            value={isPercentFocused ? percentStr : (pos.discount > 0 && pos.totals.subTotal > 0 ? ((pos.discount / pos.totals.subTotal) * 100).toFixed(2).replace(/\.00$/, '') : '')}
            onFocus={() => setIsPercentFocused(true)}
            onBlur={() => setIsPercentFocused(false)}
            onChange={(event) => {
              setPercentStr(event.target.value);
              const p = Number(event.target.value || 0);
              pos.setDiscount(Number(((p / 100) * pos.totals.subTotal).toFixed(2)));
            }}
            disabled={isDiscountLocked || pos.totals.subTotal === 0}
            placeholder="0"
          />
        </label>
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
        <div className="pos-checkout-manager-approval" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onInlineManagerApproval(); } }}>
          <label className="field field-wide"><span>PIN المدير</span><input ref={managerPinInputRef} type="text" className="secure-password-field" inputMode="numeric" autoComplete="off" value={managerPinDraft} onChange={(event) => { onManagerPinDraftChange(event.target.value); if (managerPinError) onManagerPinErrorChange(''); }} placeholder="اكتب PIN المدير" disabled={pos.discountAuthorizationMutation.isPending} /></label>
          <div className="surface-note">يُستخدم PIN للتحقق فقط داخل هذه الفاتورة، ثم يتم مسحه ولا يُحفظ في المسودة.</div>
          {managerPinError ? <div className="error-box">{managerPinError}</div> : null}
          <div className="actions compact-actions">
            <Button type="button" disabled={pos.discountAuthorizationMutation.isPending} onClick={() => onInlineManagerApproval()}>{pos.discountAuthorizationMutation.isPending ? 'جاري التحقق...' : 'اعتماد الخصم'}</Button>
            <Button type="button" variant="secondary" onClick={() => { onManagerApprovalOpenChange(false); onManagerPinDraftChange(''); onManagerPinErrorChange(''); approvedManagerPinRef.current = ''; }} disabled={pos.discountAuthorizationMutation.isPending}>إلغاء</Button>
          </div>
        </div>
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

interface PosCheckoutDeliverySectionProps {
  pos: PosWorkspaceState;
  deliveryReps: DeliveryRep[];
}

export function PosCheckoutDeliverySection({ pos, deliveryReps }: PosCheckoutDeliverySectionProps) {
  const [repSearchOpen, setRepSearchOpen] = useState(false);
  const [repSearchQuery, setRepSearchQuery] = useState('');

  const isRestaurant = pos.settingsQuery?.data?.restaurantModuleEnabled === true;
  const activeReps = deliveryReps.filter((r) => r.is_active);
  const selectedRep = activeReps.find((r) => String(r.id) === String(pos.deliveryRepId));
  const filteredReps = activeReps.filter(r => r.name.toLowerCase().includes(repSearchQuery.toLowerCase()) || r.phone?.includes(repSearchQuery));

  return (
    <>
      <section className="pos-checkout-dialog-section">
        <div className="pos-checkout-section-head">
          <h4>نوع الفاتورة</h4>
          <strong>{pos.orderType === 'dine_in' ? 'صالة (طاولات)' : pos.orderType === 'delivery' ? 'توصيل (دليفري)' : 'تيك أواي (بيع مباشر)'}</strong>
        </div>
        <div className="pos-checkout-payment-methods" style={{ marginBottom: '16px' }}>
          <Button type="button" variant={pos.orderType === 'takeaway' || !pos.orderType ? 'primary' : 'secondary'} onClick={() => pos.setOrderType('takeaway')}>تيك أواي</Button>
          <Button type="button" variant={pos.orderType === 'delivery' ? 'primary' : 'secondary'} onClick={() => pos.setOrderType('delivery')}>دليفري (توصيل)</Button>
          {isRestaurant && (
            <Button type="button" variant={pos.orderType === 'dine_in' ? 'primary' : 'secondary'} onClick={() => pos.setOrderType('dine_in')}>صالة (طاولات)</Button>
          )}
        </div>
      </section>

      {pos.orderType === 'delivery' && (
        <section className="pos-checkout-dialog-section" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div className="pos-checkout-section-head">
            <h4>بيانات التوصيل</h4>
            <strong>{selectedRep?.name || 'لم يتم اختيار مندوب'}</strong>
          </div>

          <div className="document-prototype-grid compact-grid-2" style={{ gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <label className="field">
                <span>المندوب</span>
                <input
                  className="purchase-prototype-field-input"
                  placeholder={selectedRep?.name || "-- ابحث عن مندوب --"}
                  value={repSearchOpen ? repSearchQuery : (selectedRep?.name || '')}
                  onFocus={() => { setRepSearchOpen(true); setRepSearchQuery(''); }}
                  onBlur={() => setTimeout(() => setRepSearchOpen(false), 200)}
                  onChange={(e) => setRepSearchQuery(e.target.value)}
                  style={{ padding: '6px 8px', cursor: 'text', width: '100%' }}
                />
              </label>

              {repSearchOpen && (
                <div 
                  style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, 
                    background: 'white', border: '1px solid #cbd5e1', 
                    borderRadius: '4px', zIndex: 10, maxHeight: '200px', 
                    overflowY: 'auto', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                >
                  <div 
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: !pos.deliveryRepId ? '#f8fafc' : 'white' }}
                    onMouseDown={() => { pos.setDeliveryRepId(''); setRepSearchOpen(false); }}
                  >
                    -- بدون مندوب --
                  </div>
                  {filteredReps.length === 0 && (
                    <div style={{ padding: '8px 12px', color: '#64748b' }}>لا يوجد مناديب</div>
                  )}
                  {filteredReps.map(rep => (
                    <div 
                      key={rep.id}
                      style={{ 
                        padding: '8px 12px', cursor: 'pointer', 
                        borderBottom: '1px solid #f1f5f9',
                        background: String(rep.id) === String(pos.deliveryRepId) ? '#eff6ff' : 'white',
                        color: String(rep.id) === String(pos.deliveryRepId) ? '#2563eb' : '#334155'
                      }}
                      onMouseDown={(e) => { e.preventDefault(); pos.setDeliveryRepId(String(rep.id)); setRepSearchOpen(false); }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => {
                        if (String(rep.id) !== String(pos.deliveryRepId)) e.currentTarget.style.background = 'white';
                        else e.currentTarget.style.background = '#eff6ff';
                      }}
                    >
                      {rep.name} {rep.phone ? <span style={{ color: '#94a3b8', fontSize: '12px' }}>({rep.phone})</span> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="field">
              <span>حالة التحصيل</span>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {(['cod', 'prepaid_by_rep', 'prepaid_online'] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant={pos.collectionStatus === status ? 'primary' : 'secondary'}
                    onClick={() => {
                      pos.setCollectionStatus(status);
                      if (status === 'cod') {
                        pos.setPaymentChannel('cash');
                        pos.setCashAmount(0);
                        pos.setCardAmount(0);
                        pos.setTransferAmount(0);
                      } else if (status === 'prepaid_by_rep') {
                        pos.setPaymentChannel('cash');
                        pos.setCashAmount(Number(pos.totals.total || 0));
                        pos.setCardAmount(0);
                        pos.setTransferAmount(0);
                      } else if (status === 'prepaid_online') {
                        pos.setPaymentChannel('wallet');
                        pos.setTransferAmount(Number(pos.totals.total || 0));
                        pos.setCashAmount(0);
                        pos.setCardAmount(0);
                      }
                    }}
                    style={{ flex: 1, fontSize: '13px', padding: '6px 4px' }}
                  >
                    {status === 'cod' ? 'تحصيل من العميل' : status === 'prepaid_by_rep' ? 'خالص من المندوب' : 'خالص أونلاين'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
