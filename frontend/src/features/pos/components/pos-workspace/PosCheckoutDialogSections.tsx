import { useState, useEffect, type FormEvent, type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/shared/api/customers.api';
import { posApi } from '@/features/pos/api/pos.api';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';
import type { DeliveryRep } from '@/shared/api/delivery-reps.api';

export type PaymentPreset = 'cash' | 'card' | 'wallet' | 'instapay' | 'credit';

type CustomerOption = { id: string | number; name: string; phone?: string | null; address?: string | null };

function getBalancePreview(pos: Pick<PosWorkspaceState, 'paymentType' | 'amountDue' | 'changeAmount' | 'totals' | 'paidAmount' | 'customerId'>) {
  const paid = Number(pos.paidAmount || 0);
  const total = Number(pos.totals?.total || 0);
  const remainingDebt = Math.max(0, total - paid);

  if (pos.paymentType === 'credit' || (pos.customerId && paid < total)) {
    if (remainingDebt > 0.009) {
      return { label: 'المتبقي على العميل (آجل)', value: -remainingDebt, tone: 'danger' as const };
    }
  }
  if (Number(pos.amountDue || 0) > 0.009) {
    return { label: 'المتبقي', value: -Math.abs(Number(pos.amountDue || 0)), tone: 'danger' as const };
  }
  return { label: 'الباقي', value: Math.abs(Number(pos.changeAmount || 0)), tone: 'primary' as const };
}

export interface PosCheckoutCustomerSectionProps {
  pos: PosWorkspaceState;
  selectedCustomerName: string;
  selectedCustomer: CustomerOption | null;
  filteredCustomers: CustomerOption[];
  customerPickerOpen: boolean;
  customerQuery: string;
  onCustomerPickerOpenChange: (value: boolean | ((current: boolean) => boolean)) => void;
  onCustomerQueryChange: (value: string) => void;
  onQuickCustomerSubmit: (event: FormEvent<HTMLFormElement>) => void;
  needsCustomer?: boolean;
  isManualOpen?: boolean;
  onManualOpen?: () => void;
}

export function PosCheckoutCustomerSection({
  pos,
  selectedCustomerName,
  selectedCustomer,
  filteredCustomers,
  customerQuery,
  onCustomerPickerOpenChange,
  onCustomerQueryChange,
  onQuickCustomerSubmit,
  needsCustomer,
  isManualOpen,
  onManualOpen,
}: PosCheckoutCustomerSectionProps) {
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  const addressesQuery = useQuery({
    queryKey: ['customerAddresses', pos.customerId],
    queryFn: () => pos.customerId ? customersApi.addresses(pos.customerId) : Promise.resolve([]),
    enabled: !!pos.customerId,
  });

  const addresses = Array.from(new Set([
    ...(selectedCustomer?.address ? [selectedCustomer.address] : []),
    ...(addressesQuery.data || [])
  ])).filter(Boolean);

  const customerPosSummaryQuery = useQuery({
    queryKey: ['posCustomerSummaryCheckout', pos.customerId],
    queryFn: () => pos.customerId ? posApi.customerPosSummary(String(pos.customerId)) : Promise.resolve(null),
    enabled: !!pos.customerId,
    staleTime: 30_000,
  });
  const loyaltyPoints = Number(customerPosSummaryQuery.data?.loyaltyPoints || 0);

  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  const handleSelectCustomer = (id: string, phone: string, address: string) => {
    pos.setCustomerId(id);
    pos.setQuickCustomerPhone(phone);
    pos.setQuickCustomerAddress(address);
    setIsAddingCustomer(false);
    onCustomerQueryChange('');
    onCustomerPickerOpenChange(false);
  };

  const isHidden = !needsCustomer && !isManualOpen && !pos.customerId;

  if (isHidden) {
    return (
      <section className="pos-checkout-dialog-section pos-checkout-customer-section" style={{ padding: 0, marginBottom: '6px' }}>
        <Button type="button" variant="secondary" onClick={onManualOpen} style={{ width: '100%', borderStyle: 'dashed', minHeight: '34px', fontSize: '13px' }}>
          + ربط الفاتورة ببيانات عميل (اختياري)
        </Button>
      </section>
    );
  }

  return (
    <section className="pos-checkout-dialog-section pos-checkout-customer-section" style={{ padding: 0, marginBottom: '6px' }}>
      {!pos.customerId ? (
        isAddingCustomer ? (
          <form onSubmit={onQuickCustomerSubmit} style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
            <input
              autoFocus
              value={pos.quickCustomerName}
              onChange={(event) => pos.setQuickCustomerName(event.target.value)}
              placeholder="اسم العميل *"
              disabled={pos.quickCustomerMutation.isPending}
              style={{ flex: 1.5, padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', height: '38px' }}
            />
            <input
              value={pos.quickCustomerPhone}
              onChange={(event) => pos.setQuickCustomerPhone(event.target.value)}
              placeholder="الهاتف"
              disabled={pos.quickCustomerMutation.isPending}
              style={{ flex: 1.2, padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', height: '38px' }}
            />
            <input
              value={pos.quickCustomerAddress}
              onChange={(event) => pos.setQuickCustomerAddress(event.target.value)}
              placeholder="العنوان (اختياري)"
              disabled={pos.quickCustomerMutation.isPending}
              style={{ flex: 2, padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', height: '38px' }}
            />
            <Button type="submit" variant="primary" style={{ flex: '0 0 auto', height: '38px', whiteSpace: 'nowrap', fontSize: '13px', borderRadius: '6px', padding: '0 12px' }} disabled={pos.quickCustomerMutation.isPending || !pos.quickCustomerName.trim()}>
              {pos.quickCustomerMutation.isPending ? 'جاري...' : 'حفظ'}
            </Button>
            <Button type="button" variant="secondary" style={{ flex: '0 0 auto', height: '38px', whiteSpace: 'nowrap', fontSize: '13px', borderRadius: '6px', padding: '0 10px' }} onClick={() => setIsAddingCustomer(false)}>
              إلغاء
            </Button>
          </form>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', position: 'relative' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                autoFocus
                value={customerQuery}
                onChange={(event) => onCustomerQueryChange(event.target.value)}
                placeholder="ابحث عن عميل بالاسم أو رقم الهاتف..."
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', height: '38px' }}
              />
              {customerQuery.trim() && (
                <div className="pos-checkout-customer-results" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: '4px', background: '#fff', borderRadius: '8px', padding: '6px', border: '1px solid #cbd5e1', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: '200px', overflowY: 'auto' }}>
                  {filteredCustomers.length ? filteredCustomers.map((customer) => {
                    const isSelected = String(customer.id) === String(pos.customerId);
                    return (
                      <button
                        key={customer.id}
                        type="button"
                        className={`pos-checkout-customer-result ${isSelected ? 'is-selected' : ''}`.trim()}
                        onClick={() => handleSelectCustomer(String(customer.id), customer.phone || '', customer.address || '')}
                        style={{ width: '100%', textAlign: 'right', display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '4px', border: 'none', background: isSelected ? '#eff6ff' : 'transparent', cursor: 'pointer' }}
                      >
                        <strong>{customer.name}</strong>
                        <span className="muted small">{customer.phone || 'بدون هاتف'}</span>
                      </button>
                    );
                  }) : (
                    <div className="surface-note" style={{ padding: '8px', fontSize: '13px' }}>
                      لا توجد نتائج لـ "{customerQuery}".
                      <Button type="button" variant="secondary" style={{ marginTop: '8px', width: '100%', height: '34px' }} onClick={() => {
                        pos.setQuickCustomerName(customerQuery);
                        setIsAddingCustomer(true);
                      }}>
                        إضافة "{customerQuery}" كعميل جديد
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                pos.setQuickCustomerName(customerQuery);
                setIsAddingCustomer(true);
              }}
              style={{ flex: '0 0 auto', height: '38px', whiteSpace: 'nowrap', fontSize: '13px', borderRadius: '6px', padding: '0 12px' }}
            >
              + عميل جديد
            </Button>
          </div>
        )
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(140px, 1.2fr) minmax(110px, 1fr) minmax(160px, 2fr) auto',
          gap: '8px',
          alignItems: 'center',
          background: '#fff',
          padding: '6px 10px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          width: '100%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, flexShrink: 0 }}>العميل:</span>
            <strong style={{ fontSize: '14px', color: '#0f172a', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedCustomer?.name || pos.quickCustomerName || (selectedCustomerName !== 'عميل نقدي' ? selectedCustomerName : '') || 'عميل نقدي'}
            </strong>
          </div>
          <div style={{ minWidth: 0 }}>
            <input
              value={pos.quickCustomerPhone || selectedCustomer?.phone || ''}
              onChange={(event) => pos.setQuickCustomerPhone(event.target.value)}
              placeholder="رقم الهاتف"
              style={{ width: '100%', padding: '6px 10px', fontSize: '13px', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
            />
          </div>
          <div style={{ minWidth: 0, position: 'relative' }}>
            <input
              value={pos.quickCustomerAddress || selectedCustomer?.address || ''}
              onChange={(event) => pos.setQuickCustomerAddress(event.target.value)}
              onFocus={() => setAddressDropdownOpen(true)}
              onBlur={() => setTimeout(() => setAddressDropdownOpen(false), 200)}
              placeholder="العنوان أو المكان"
              style={{ width: '100%', padding: '6px 10px', fontSize: '13px', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
            />
            {addressDropdownOpen && addresses.length > 0 && (
              <div className="pos-checkout-customer-results" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: '2px', background: '#fff', borderRadius: '6px', padding: '4px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                {addresses.map((addr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="pos-checkout-customer-result"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pos.setQuickCustomerAddress(addr);
                      setAddressDropdownOpen(false);
                    }}
                    style={{ width: '100%', textAlign: 'right', padding: '6px 10px', fontSize: '12px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                  >
                    <strong>{addr}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSelectCustomer('', '', '')}
            style={{ flexShrink: 0, height: '36px', padding: '0 14px', fontSize: '12px', borderRadius: '6px' }}
          >
            تغيير
          </Button>
        </div>
      )}

      {pos.customerId && loyaltyPoints > 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          marginTop: '6px',
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          border: '1px solid #fcd34d',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#92400e'
        }}>
          <span>⭐ رصيد نقاط الولاء: <strong>{loyaltyPoints.toLocaleString()} نقطة</strong> (تساوي {loyaltyPoints.toLocaleString()} ج.م خصم)</span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const subTotal = Number(pos.totals?.subTotal || 0);
              const pointsToRedeem = Math.min(loyaltyPoints, subTotal);
              if (pointsToRedeem > 0) {
                pos.setDiscount(pointsToRedeem);
              }
            }}
            style={{
              height: '28px',
              padding: '0 10px',
              fontSize: '11px',
              fontWeight: 700,
              background: '#b45309',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            استبدال النقاط بخصم
          </Button>
        </div>
      ) : null}
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
    <div style={{
      display: 'grid',
      gap: '8px',
      background: '#fff',
      padding: '8px 10px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
    }}>
      {/* Single Unified Row: Cash, Card/Transfer, Discount (Amount), Discount (%) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isDiscountLocked ? 'repeat(auto-fit, minmax(130px, 1fr))' : 'repeat(4, minmax(0, 1fr))',
          gap: '8px',
          alignItems: 'end'
        }}
      >
        <label className="field" style={{ margin: 0 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '2px', display: 'block' }}>نقدي</span>
          <input
            ref={cashAmountInputRef}
            data-autofocus={!customerPickerOpen ? true : undefined}
            type="number"
            step="0.01"
            value={pos.cashAmount}
            onChange={(event) => pos.setCashAmount(Number(event.target.value || 0))}
            style={{ height: '38px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid #cbd5e1' }}
          />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '2px', display: 'block' }}>{transferSelected ? (pos.paymentChannel === 'instapay' ? 'InstaPay' : 'محفظة') : 'فيزا'}</span>
          <input
            type="number"
            step="0.01"
            value={transferSelected ? pos.transferAmount : pos.cardAmount}
            onChange={(event) => {
              const val = Number(event.target.value || 0);
              if (transferSelected) pos.setTransferAmount(val);
              else pos.setCardAmount(val);
            }}
            style={{ height: '38px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, border: '1px solid #cbd5e1' }}
          />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '2px', display: 'block' }}>الخصم (مبلغ)</span>
          <input
            type="number"
            step="0.01"
            value={pos.discount === 0 ? '' : pos.discount}
            onChange={(event) => pos.setDiscount(Number(event.target.value || 0))}
            disabled={isDiscountLocked}
            placeholder="0"
            style={{ height: '38px', borderRadius: '6px', fontSize: '14px', border: '1px solid #cbd5e1' }}
          />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '2px', display: 'block' }}>الخصم (%)</span>
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
            style={{ height: '38px', borderRadius: '6px', fontSize: '14px', border: '1px solid #cbd5e1' }}
          />
        </label>
        {isDiscountLocked ? (
          <Button
            type="button"
            variant={pos.discountApprovalGranted ? 'success' : 'secondary'}
            onClick={() => {
              if (pos.discountApprovalGranted) return;
              onManagerPinErrorChange('');
              onManagerPinDraftChange('');
              onManagerApprovalOpenChange((current) => !current);
            }}
            disabled={pos.discountAuthorizationMutation.isPending}
            style={{ height: '38px', alignSelf: 'end', fontSize: '12px' }}
          >
            {pos.discountAuthorizationMutation.isPending ? 'جاري...' : (pos.discountApprovalGranted ? 'معتمد' : 'اعتماد المدير')}
          </Button>
        ) : null}
      </div>

      {/* Row 2: Payment method buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
        <Button type="button" variant={isPaymentActive('cash') ? 'primary' : 'secondary'} onClick={() => onSelectPaymentPreset('cash')} style={{ minHeight: '38px', fontSize: '13px', fontWeight: 700 }}>نقدي</Button>
        <Button type="button" variant={isPaymentActive('card') ? 'primary' : 'secondary'} onClick={() => onSelectPaymentPreset('card')} style={{ minHeight: '38px', fontSize: '13px', fontWeight: 700 }}>فيزا</Button>
        <Button type="button" variant={isPaymentActive('credit') ? 'primary' : 'secondary'} onClick={() => onSelectPaymentPreset('credit')} style={{ minHeight: '38px', fontSize: '13px', fontWeight: 700 }}>آجل</Button>
        <Button type="button" variant={transferSelected ? 'primary' : 'secondary'} onClick={() => onSelectPaymentPreset(pos.paymentChannel === 'instapay' ? 'instapay' : 'wallet')} style={{ minHeight: '38px', fontSize: '13px', fontWeight: 700 }}>تحويلات</Button>
      </div>

      {transferSelected ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', padding: '6px', background: '#f1f0fa', borderRadius: '6px' }}>
          <Button type="button" variant={pos.paymentChannel === 'wallet' ? 'primary' : 'secondary'} onClick={() => onSelectPaymentPreset('wallet')} style={{ minHeight: '34px', fontSize: '12px' }}>محفظة إلكترونية</Button>
          <Button type="button" variant={pos.paymentChannel === 'instapay' ? 'primary' : 'secondary'} onClick={() => onSelectPaymentPreset('instapay')} style={{ minHeight: '34px', fontSize: '12px' }}>InstaPay</Button>
        </div>
      ) : null}

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
        <div className="pos-checkout-dialog-chip" style={{ minHeight: '48px', padding: '6px 12px', borderRadius: '6px' }}>
          <span style={{ fontSize: '11px' }}>المطلوب دفعه</span>
          <strong className="is-primary" style={{ fontSize: '15px' }}>{formatCurrency(pos.totals.total)}</strong>
        </div>
        <div className="pos-checkout-dialog-chip" style={{ minHeight: '48px', padding: '6px 12px', borderRadius: '6px' }}>
          <span style={{ fontSize: '11px' }}>المدفوع</span>
          <strong className="is-success" style={{ fontSize: '15px' }}>{formatCurrency(paidAmount)}</strong>
        </div>
        <div className="pos-checkout-dialog-chip" style={{ minHeight: '48px', padding: '6px 12px', borderRadius: '6px' }}>
          <span style={{ fontSize: '11px' }}>{balance.label}</span>
          <strong className={balance.tone === 'danger' ? 'is-danger' : 'is-primary'} style={{ fontSize: '15px' }}>{formatCurrency(balance.value)}</strong>
        </div>
      </div>

      {needsCreditCustomer ? <div className="error-box" style={{ margin: 0 }}>البيع الآجل يحتاج اختيار عميل.</div> : null}
      {!pos.canApplyDiscount ? <div className="pos-payment-strip-notes" style={{ margin: 0 }}><span className="pos-payment-strip-note">{pos.discountApprovalGranted ? 'تم اعتماد الخصم لهذه الفاتورة فقط.' : 'لا تملك صلاحية تعديل الخصم. استخدم اعتماد المدير لهذه الفاتورة.'}</span></div> : null}
      {pos.hasDiscountPermissionViolation ? <div className="error-box" style={{ margin: 0 }}>تم اكتشاف خصم غير مسموح به في هذه الفاتورة.</div> : null}
    </div>
  );
}

export function PosCheckoutOrderTypeSection({
  pos,
  onDeliverySelected
}: {
  pos: PosWorkspaceState;
  onDeliverySelected?: () => void;
}) {
  const isRestaurant = pos.settingsQuery?.data?.restaurantModuleEnabled === true;

  return (
    <div style={{ display: 'flex', gap: '8px', width: '100%', marginBottom: '6px' }}>
      <Button
        type="button"
        variant={pos.orderType === 'takeaway' || !pos.orderType ? 'primary' : 'secondary'}
        onClick={() => pos.setOrderType('takeaway')}
        style={{ flex: 1, minHeight: '38px', fontSize: '13px', fontWeight: 700 }}
      >
        تيك أواي
      </Button>
      <Button 
        type="button" 
        variant={pos.orderType === 'delivery' ? 'primary' : 'secondary'} 
        onClick={() => {
          pos.setOrderType('delivery');
          if (pos.orderType !== 'delivery') {
            onDeliverySelected?.();
          }
        }}
        style={{ flex: 1, minHeight: '38px', fontSize: '13px', fontWeight: 700 }}
      >
        دليفري (توصيل)
      </Button>
      {isRestaurant && (
        <Button
          type="button"
          variant={pos.orderType === 'dine_in' ? 'primary' : 'secondary'}
          onClick={() => pos.setOrderType('dine_in')}
          style={{ flex: 1, minHeight: '38px', fontSize: '13px', fontWeight: 700 }}
        >
          صالة (طاولات)
        </Button>
      )}
    </div>
  );
}

export function PosCheckoutDeliverySection({ pos, deliveryReps }: { pos: PosWorkspaceState, deliveryReps: DeliveryRep[] }) {
  const [repSearchOpen, setRepSearchOpen] = useState(false);
  const [repSearchQuery, setRepSearchQuery] = useState('');

  const activeReps = deliveryReps.filter((r) => r.is_active);
  const selectedRep = activeReps.find((r) => String(r.id) === String(pos.deliveryRepId));
  const filteredReps = activeReps.filter(r => r.name.toLowerCase().includes(repSearchQuery.toLowerCase()) || r.phone?.includes(repSearchQuery));

  if (pos.orderType !== 'delivery') return null;

  return (
    <div style={{
      display: 'grid',
      gap: '8px',
      background: '#fff',
      padding: '8px 10px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      marginBottom: '6px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '8px', alignItems: 'end' }}>
        <div style={{ position: 'relative' }}>
          <label className="field" style={{ margin: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: !selectedRep ? '#dc2626' : '#64748b', marginBottom: '2px', display: 'block' }}>
              مندوب التوصيل {!selectedRep ? '*' : ''}
            </span>
            <input
              placeholder={selectedRep?.name || "-- اختر مندوب التوصيل --"}
              value={repSearchOpen ? repSearchQuery : (selectedRep?.name || '')}
              onFocus={() => { setRepSearchOpen(true); setRepSearchQuery(''); }}
              onBlur={() => setTimeout(() => setRepSearchOpen(false), 200)}
              onChange={(e) => setRepSearchQuery(e.target.value)}
              style={{
                padding: '6px 10px',
                height: '38px',
                width: '100%',
                borderRadius: '6px',
                border: !selectedRep ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                background: !selectedRep ? '#fff5f5' : 'white',
                fontSize: '13px'
              }}
            />
          </label>

          {repSearchOpen && (
            <div 
              style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, 
                background: 'white', border: '1px solid #cbd5e1', 
                borderRadius: '6px', zIndex: 30, maxHeight: '180px', 
                overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
              }}
            >
              {filteredReps.length === 0 && (
                <div style={{ padding: '8px 12px', color: '#dc2626', fontSize: '12px', fontWeight: 600 }}>
                  {activeReps.length === 0 ? 'لا يوجد مناديب مسجلين بالنظام' : 'لا توجد نتائج مطابقة'}
                </div>
              )}
              {filteredReps.map(rep => (
                <div 
                  key={rep.id}
                  style={{ 
                    padding: '6px 10px', cursor: 'pointer', 
                    borderBottom: '1px solid #f1f5f9',
                    background: String(rep.id) === String(pos.deliveryRepId) ? '#eff6ff' : 'white',
                    color: String(rep.id) === String(pos.deliveryRepId) ? '#170c5c' : '#334155',
                    fontSize: '13px'
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pos.setDeliveryRepId(String(rep.id));
                    if ((rep as any).rep_type === 'store_fleet') {
                      pos.setDeliveryFeeMode('store_fleet');
                    } else if ((rep as any).rep_type === 'freelance') {
                      pos.setDeliveryFeeMode('freelance_courier');
                    }
                    setRepSearchOpen(false);
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => {
                    if (String(rep.id) !== String(pos.deliveryRepId)) e.currentTarget.style.background = 'white';
                    else e.currentTarget.style.background = '#eff6ff';
                  }}
                >
                  {rep.name} {rep.phone ? <span style={{ color: '#94a3b8', fontSize: '11px' }}>({rep.phone})</span> : null}
                  {(rep as any).rep_type === 'store_fleet' ? <span style={{ color: '#059669', fontSize: '10px', marginRight: '6px' }}>[أسطول المحل]</span> : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="field" style={{ margin: 0 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '2px', display: 'block' }}>رسوم التوصيل (ج.م)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={pos.deliveryFee === 0 ? '' : pos.deliveryFee}
            onChange={(event) => pos.setDeliveryFee(Number(event.target.value || 0))}
            placeholder="0"
            style={{ padding: '6px 10px', height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '14px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
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
            style={{ flex: 1, fontSize: '13px', padding: '6px 4px', minHeight: '38px', fontWeight: 700 }}
          >
            {status === 'cod' ? 'تحصيل من العميل' : status === 'prepaid_by_rep' ? 'خالص من المندوب' : 'خالص أونلاين'}
          </Button>
        ))}
      </div>
    </div>
  );
}
