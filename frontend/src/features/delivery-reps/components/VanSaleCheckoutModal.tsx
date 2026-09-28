import React, { useState, useEffect, useMemo } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import {
  CreditCardIcon,
  CheckCircleIcon,
  CameraIcon,
  PackageIcon,
  AlertTriangleIcon,
} from '@/shared/components/icons/AppIcons';

export type VanPaymentMethod = 'cash' | 'credit' | 'card' | 'split';

export interface VanSaleCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  cartTotal: number;
  cartItemsCount: number;
  cartTotalPieces: number;
  customer?: {
    id: number;
    name: string;
    phone?: string;
    balance: number;
    creditLimit?: number;
    customerCode?: string;
    route?: string;
  } | null;
  newCustomerName?: string;
  cartonsCount: string;
  onCartonsCountChange: (count: string) => void;
  deliveryProofPhoto: string;
  onDeliveryProofPhotoChange: (photo: string) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  isSubmitting: boolean;
  onConfirmCheckout: (data: {
    paymentMethod: VanPaymentMethod;
    paidAmount?: number;
    notes?: string;
    cartonsCount?: number;
    deliveryProofPhoto?: string;
  }) => void;
}

export const VanSaleCheckoutModal: React.FC<VanSaleCheckoutModalProps> = ({
  open,
  onClose,
  cartTotal,
  cartItemsCount,
  cartTotalPieces,
  customer,
  newCustomerName,
  cartonsCount,
  onCartonsCountChange,
  deliveryProofPhoto,
  onDeliveryProofPhotoChange,
  notes: propNotes = '',
  onNotesChange,
  isSubmitting,
  onConfirmCheckout,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<VanPaymentMethod>('cash');
  const [cashInput, setCashInput] = useState<string>(cartTotal.toFixed(2));
  const [localNotes, setLocalNotes] = useState<string>(propNotes);
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (open) {
      setCashInput(cartTotal.toFixed(2));
      setPaymentMethod('cash');
      setValidationError('');
      setLocalNotes(propNotes);
    }
  }, [open, cartTotal, propNotes]);

  const hasCustomer = Boolean(customer?.id || (newCustomerName && newCustomerName.trim()));
  const customerDisplayName = customer?.name || newCustomerName || 'عميل نقدي عام';

  const cashPaid = useMemo(() => {
    const val = parseFloat(cashInput);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [cashInput]);

  // Denomination shortcuts for quick cash payment
  const quickCashOptions = useMemo(() => {
    const ceil50 = Math.ceil(cartTotal / 50) * 50;
    const ceil100 = Math.ceil(cartTotal / 100) * 100;
    const ceil200 = Math.ceil(cartTotal / 200) * 200;
    const options = [cartTotal];
    if (ceil50 > cartTotal) options.push(ceil50);
    if (ceil100 > ceil50) options.push(ceil100);
    if (ceil200 > ceil100) options.push(ceil200);
    return Array.from(new Set(options)).slice(0, 4);
  }, [cartTotal]);

  const changeDue = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    return Math.max(0, Number((cashPaid - cartTotal).toFixed(2)));
  }, [paymentMethod, cashPaid, cartTotal]);

  const remainingCashShortage = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    return Math.max(0, Number((cartTotal - cashPaid).toFixed(2)));
  }, [paymentMethod, cashPaid, cartTotal]);

  const splitCreditDebt = useMemo(() => {
    if (paymentMethod !== 'split') return 0;
    return Math.max(0, Number((cartTotal - cashPaid).toFixed(2)));
  }, [paymentMethod, cashPaid, cartTotal]);

  const customerBalanceAfter = useMemo(() => {
    const curBal = Number(customer?.balance || 0);
    if (paymentMethod === 'credit') {
      return curBal + cartTotal;
    }
    if (paymentMethod === 'split') {
      return curBal + splitCreditDebt;
    }
    return curBal;
  }, [customer?.balance, paymentMethod, cartTotal, splitCreditDebt]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onDeliveryProofPhotoChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    setValidationError('');

    if ((paymentMethod === 'credit' || paymentMethod === 'split') && !hasCustomer) {
      setValidationError('البيع الآجل أو المجزأ يتطلب اختيار العميل أو إدخال اسم المحل لتسجيل المديونية على حسابه.');
      return;
    }

    if (paymentMethod === 'split') {
      if (cashPaid <= 0) {
        setValidationError('في الدفع المجزأ يرجى إدخال المبلغ المدفوع نقداً، أو اختيار "آجل بالكامل" إن لم يسدد أي مبالغ.');
        return;
      }
      if (cashPaid >= cartTotal) {
        setValidationError('المبلغ المدفوع يغطي الفاتورة بالكامل، يرجى اختيار السداد "نقدي (كاش)".');
        return;
      }
    }

    if (paymentMethod === 'cash' && cashPaid < cartTotal) {
      setValidationError('المبلغ المدفوع أقل من إجمالي الفاتورة. إذا كان العميل سيدفع الباقي لاحقاً، يرجى اختيار "دفع مركب (جزء كاش وجزء آجل)".');
      return;
    }

    onConfirmCheckout({
      paymentMethod,
      paidAmount: paymentMethod === 'cash' ? cartTotal : (paymentMethod === 'split' ? cashPaid : (paymentMethod === 'card' ? cartTotal : 0)),
      notes: localNotes,
      cartonsCount: Number(cartonsCount) || undefined,
      deliveryProofPhoto: deliveryProofPhoto || undefined,
    });
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إتمام الفاتورة والسداد الميداني"
      subtitle="اختر طريقة الدفع وتفاصيل الاستلام لإصدار الفاتورة فورياً"
      badge="نقطة توزيع الفان"
      width="min(560px, 96vw)"
      minHeight="480px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', gap: '10px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ minHeight: '40px', fontSize: '13px', padding: '0 18px' }}
          >
            إلغاء
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            disabled={isSubmitting}
            style={{
              minHeight: '40px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '13.5px',
              fontWeight: 800,
              padding: '0 24px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircleIcon size={16} color="#ffffff" />
            <span>{isSubmitting ? 'جاري الإصدار والخصم...' : 'تأكيد وإصدار الفاتورة'}</span>
          </Button>
        </div>
      }
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Customer Header Info Strip */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>العميل / المحل:</span>
              <strong style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 800 }}>
                {customerDisplayName}
              </strong>
              {customer?.customerCode && (
                <span style={{ fontSize: '10.5px', backgroundColor: '#e2e8f0', color: '#334155', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  #{customer.customerCode}
                </span>
              )}
            </div>
            {customer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '3px', fontSize: '11.5px', color: '#475569' }}>
                <span>
                  المديونية الحالية: <strong style={{ color: customer.balance > 0 ? '#b91c1c' : '#15803d' }}>{customer.balance.toFixed(2)} ج.م</strong>
                </span>
                {customer.creditLimit ? (
                  <span>سقف الائتمان: <strong>{customer.creditLimit.toFixed(2)} ج.م</strong></span>
                ) : null}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>إجمالي الفاتورة</span>
            <span style={{ fontSize: '17px', fontWeight: 900, color: '#170e5e' }}>
              {cartTotal.toFixed(2)} <CurrencySymbol />
            </span>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangleIcon size={16} color="#dc2626" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Payment Method Selector Grid - 4 Balanced Methods */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
            طريقة السداد:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('cash');
                setCashInput(cartTotal.toFixed(2));
                setValidationError('');
              }}
              style={{
                minHeight: '40px',
                borderRadius: '8px',
                border: paymentMethod === 'cash' ? '2px solid #059669' : '1px solid #cbd5e1',
                backgroundColor: paymentMethod === 'cash' ? '#ecfdf5' : '#ffffff',
                color: paymentMethod === 'cash' ? '#065f46' : '#334155',
                fontWeight: 800,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'none',
              }}
            >
              نقدي (كاش)
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentMethod('credit');
                setValidationError('');
              }}
              style={{
                minHeight: '40px',
                borderRadius: '8px',
                border: paymentMethod === 'credit' ? '2px solid #d97706' : '1px solid #cbd5e1',
                backgroundColor: paymentMethod === 'credit' ? '#fffbeb' : '#ffffff',
                color: paymentMethod === 'credit' ? '#92400e' : '#334155',
                fontWeight: 800,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'none',
              }}
            >
              آجل (بالكامل)
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentMethod('split');
                setCashInput((cartTotal / 2).toFixed(2));
                setValidationError('');
              }}
              style={{
                minHeight: '40px',
                borderRadius: '8px',
                border: paymentMethod === 'split' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                backgroundColor: paymentMethod === 'split' ? '#f5f3ff' : '#ffffff',
                color: paymentMethod === 'split' ? '#5b21b6' : '#334155',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'none',
              }}
            >
              دفع مركب (جزء كاش)
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentMethod('card');
                setValidationError('');
              }}
              style={{
                minHeight: '40px',
                borderRadius: '8px',
                border: paymentMethod === 'card' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                backgroundColor: paymentMethod === 'card' ? '#f0f9ff' : '#ffffff',
                color: paymentMethod === 'card' ? '#0369a1' : '#334155',
                fontWeight: 800,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'none',
              }}
            >
              شبكة / فيزا
            </button>
          </div>
        </div>

        {/* Dynamic Payment Body Section */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* 1. CASH PAYMENT MODE */}
          {paymentMethod === 'cash' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  المبلغ المستلم نقداً من العميل:
                </label>
                <button
                  type="button"
                  onClick={() => setCashInput(cartTotal.toFixed(2))}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#059669',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  المبلغ بالضبط ({cartTotal.toFixed(2)} ج.م)
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  step="0.5"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder="0.00"
                  style={{
                    flex: 1,
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '16px',
                    fontWeight: 800,
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Quick Cash Presets */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {quickCashOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCashInput(opt.toFixed(2))}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: Math.abs(cashPaid - opt) < 0.01 ? '#059669' : '#f1f5f9',
                      color: Math.abs(cashPaid - opt) < 0.01 ? '#ffffff' : '#334155',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.toFixed(0)} ج.م
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. FULL CREDIT PAYMENT MODE */}
          {paymentMethod === 'credit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!hasCustomer ? (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#92400e' }}>
                  <strong>تنبيه:</strong> لم يتم تحديد عميل أو كتابة اسم المحل. البيع الآجل يتطلب تحديد العميل لتسجيل المديونية.
                </div>
              ) : (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#166534' }}>المديونية السابقة:</span>
                    <strong>{(customer?.balance || 0).toFixed(2)} ج.م</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #86efac', paddingTop: '4px' }}>
                    <span style={{ color: '#166534', fontWeight: 800 }}>الرصيد بعد إضافة الفاتورة:</span>
                    <strong style={{ color: '#b91c1c', fontSize: '13px' }}>{customerBalanceAfter.toFixed(2)} ج.م</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. SPLIT PAYMENT MODE (CASH + CREDIT) */}
          {paymentMethod === 'split' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!hasCustomer ? (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#92400e' }}>
                  <strong>تنبيه:</strong> لم يتم تحديد عميل. المتبقي الآجل يتطلب تحديد العميل لتسجيل المديونية.
                </div>
              ) : (
                <>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                    المبلغ المسدد نقداً للمندوب حالياً:
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    placeholder="0.00"
                    style={{
                      height: '40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '15px',
                      fontWeight: 800,
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '8px 12px', fontSize: '11.5px', color: '#5b21b6', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>المتبقي على الحساب (آجل):</span>
                      <strong style={{ color: '#b91c1c' }}>{splitCreditDebt.toFixed(2)} ج.م</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>رصيد العميل بعد السداد:</span>
                      <strong>{customerBalanceAfter.toFixed(2)} ج.م</strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 4. CARD PAYMENT MODE */}
          {paymentMethod === 'card' && (
            <div style={{ padding: '8px 12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px dashed #bae6fd', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CreditCardIcon size={24} color="#0284c7" />
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0369a1' }}>
                  الدفع عبر البطاقة البنكية / ماكينة الدفع المحمولة
                </div>
                <div style={{ fontSize: '11px', color: '#0284c7' }}>
                  سيتم تسجيل الفاتورة كدفع إلكتروني بقيمة {cartTotal.toFixed(2)} ج.م
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3-Chips Financial Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
          <div style={{ backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '6px 8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>المطلوب</span>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>{cartTotal.toFixed(2)}</strong>
          </div>

          <div style={{ backgroundColor: '#ecfdf5', borderRadius: '8px', padding: '6px 8px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '11px', color: '#166534', display: 'block' }}>
              {paymentMethod === 'card' ? 'المدفوع إلكترونياً' : 'المدفوع كاش'}
            </span>
            <strong style={{ fontSize: '14px', color: '#15803d' }}>
              {paymentMethod === 'card' ? cartTotal.toFixed(2) : (paymentMethod === 'credit' ? '0.00' : cashPaid.toFixed(2))}
            </strong>
          </div>

          <div
            style={{
              backgroundColor: paymentMethod === 'cash' && changeDue > 0 ? '#eff6ff' : (paymentMethod === 'credit' || (paymentMethod === 'split' && splitCreditDebt > 0) ? '#fef2f2' : '#f8fafc'),
              borderRadius: '8px',
              padding: '6px 8px',
              textAlign: 'center',
              border: `1px solid ${paymentMethod === 'cash' && changeDue > 0 ? '#bfdbfe' : (paymentMethod === 'credit' || (paymentMethod === 'split' && splitCreditDebt > 0) ? '#fecaca' : '#e2e8f0')}`,
            }}
          >
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
              {paymentMethod === 'cash' ? (changeDue > 0 ? 'الباقي للعميل' : (remainingCashShortage > 0 ? 'عجز مدفوع' : 'الباقي')) : 'المتبقي (آجل)'}
            </span>
            <strong style={{ fontSize: '14px', color: paymentMethod === 'credit' || (paymentMethod === 'split' && splitCreditDebt > 0) ? '#b91c1c' : (changeDue > 0 ? '#1d4ed8' : '#0f172a') }}>
              {paymentMethod === 'cash' ? (changeDue > 0 ? changeDue.toFixed(2) : remainingCashShortage.toFixed(2)) : (paymentMethod === 'credit' ? cartTotal.toFixed(2) : (paymentMethod === 'split' ? splitCreditDebt.toFixed(2) : '0.00'))}
            </strong>
          </div>
        </div>

        {/* Operational Distribution Details: Cartons, Proof Photo, Notes */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PackageIcon size={16} color="#170e5e" />
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                عدد الكراتين / الطرود:
              </label>
              <input
                type="number"
                min="0"
                value={cartonsCount}
                onChange={(e) => onCartonsCountChange(e.target.value)}
                placeholder="0"
                style={{
                  width: '56px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  textAlign: 'center',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  backgroundColor: '#ffffff',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                ({cartItemsCount} أصناف • {cartTotalPieces} قطعة)
              </span>
            </div>

            {/* Proof Photo Button / Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {deliveryProofPhoto ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img
                    src={deliveryProofPhoto}
                    alt="Proof"
                    style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                  />
                  <button
                    type="button"
                    onClick={() => onDeliveryProofPhotoChange('')}
                    style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                  >
                    حذف الصورة
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#170e5e',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CameraIcon size={13} color="#170e5e" />
                  <span>+ صورة التسليم</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Notes Input */}
          <input
            type="text"
            value={localNotes}
            onChange={(e) => {
              setLocalNotes(e.target.value);
              onNotesChange?.(e.target.value);
            }}
            placeholder="ملاحظات على الفاتورة أو التسليم (اختياري)..."
            style={{
              width: '100%',
              height: '34px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </StandardDialog>
  );
};
