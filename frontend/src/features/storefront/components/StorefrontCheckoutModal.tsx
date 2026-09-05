import React, { useState, useEffect, useRef } from 'react';
import { CartItem, CreateOnlineOrderResponse, StorefrontInfo } from '../types/storefront.types';
import { storefrontApi } from '../api/storefront.api';

const STOREFRONT_SAVED_CUSTOMER_KEY = 'zsystems.storefront.saved_customer';

interface StorefrontCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  info?: StorefrontInfo;
  deliveryFee?: number;
  tenantSlug?: string;
  editingOrderNumber?: string;
  onEditSuccess?: (orderNumber: string) => void;
  onOrderSuccess?: (orderData: CreateOnlineOrderResponse) => void;
  onSubmitOrder?: (formData: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerNotes: string;
    paymentMethod?: string;
  }) => Promise<void>;
}

const EGYPT_PHONE_REGEX = /^01[0125]\d{8}$/;
const VALID_EGYPT_PREFIXES = ['010', '011', '012', '015'];

export function getEgyptianPhoneValidation(phone: string): { isValid: boolean; message: string; isComplete: boolean } {
  const clean = phone.replace(/\D/g, '');
  if (!clean) return { isValid: false, message: '', isComplete: false };
  if (!clean.startsWith('01')) {
    return { isValid: false, message: 'يجب أن يبدأ بـ 01', isComplete: false };
  }
  if (clean.length >= 3 && !VALID_EGYPT_PREFIXES.includes(clean.slice(0, 3))) {
    return { isValid: false, message: 'كود شبكة غير صحيح (010, 011, 012, 015)', isComplete: false };
  }
  if (clean.length === 11 && EGYPT_PHONE_REGEX.test(clean)) {
    return { isValid: true, message: '✓ رقم صحيح (11 رقم)', isComplete: true };
  }
  return { isValid: false, message: `متبقي ${11 - clean.length} أرقام`, isComplete: false };
}

export function getCustomerNameValidation(name: string): { isValid: boolean; message: string } {
  const trimmed = name.trim();
  if (!trimmed) return { isValid: false, message: '' };
  const lettersCount = (trimmed.match(/[\p{L}\p{M}]/gu) || []).length;
  if (trimmed.length < 3 || lettersCount < 3) {
    return { isValid: false, message: 'الاسم يجب ألا يقل عن 3 أحرف' };
  }
  return { isValid: true, message: '✓ الاسم مكتمل' };
}

export function getCustomerAddressValidation(address: string): { isValid: boolean; message: string } {
  const trimmed = address.trim();
  if (!trimmed) return { isValid: false, message: '' };
  const lettersCount = (trimmed.match(/[\p{L}\p{M}]/gu) || []).length;
  if (trimmed.length < 5 || lettersCount < 3) {
    return { isValid: false, message: 'العنوان يجب ألا يقل عن 5 أحرف بالتفصيل' };
  }
  return { isValid: true, message: '✓ العنوان واضح' };
}

export function StorefrontCheckoutModal({
  isOpen,
  onClose,
  cartItems,
  info,
  deliveryFee: deliveryFeeProp,
  tenantSlug,
  editingOrderNumber,
  onEditSuccess,
  onOrderSuccess,
  onSubmitOrder,
}: StorefrontCheckoutModalProps) {
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'instapay_wallet'>('cod');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isDeviceMatched, setIsDeviceMatched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const isSubmittingRef = useRef(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    // Always reset loading and error states whenever modal open state toggles
    setLoading(false);
    setErrorMsg('');
    isSubmittingRef.current = false;

    if (!isOpen) return;

    try {
      const saved = localStorage.getItem(STOREFRONT_SAVED_CUSTOMER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.phone) {
          setCustomerPhone(parsed.phone);
          if (parsed?.name) setCustomerName(parsed.name);
          if (parsed?.address) setCustomerAddress(parsed.address);
          setIsDeviceMatched(true);
        }
      }
    } catch {}
  }, [isOpen]);

  const handlePhoneChange = (rawVal: string) => {
    const val = rawVal.replace(/\D/g, '').slice(0, 11);
    setCustomerPhone(val);

    if (val.length === 11 && EGYPT_PHONE_REGEX.test(val)) {
      try {
        const saved = localStorage.getItem(STOREFRONT_SAVED_CUSTOMER_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const savedClean = (parsed?.phone || '').replace(/\D/g, '');
          if (savedClean === val) {
            if (parsed?.name) setCustomerName(parsed.name);
            if (parsed?.address) setCustomerAddress(parsed.address);
            setIsDeviceMatched(true);
            return;
          }
        }
      } catch {}
    }
    setIsDeviceMatched(false);
  };

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = deliveryFeeProp ?? info?.deliveryFee ?? 0;
  const total = subtotal + deliveryFee;

  const phoneStatus = getEgyptianPhoneValidation(customerPhone);
  const nameStatus = getCustomerNameValidation(customerName);
  const addressStatus = getCustomerAddressValidation(customerAddress);

  const handleModalClose = () => {
    setLoading(false);
    setErrorMsg('');
    isSubmittingRef.current = false;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    if (!editingOrderNumber && cartItems.length === 0) {
      showError('سلة المشتريات فارغة، يرجى إضافة أصناف إلى السلة أولاً.');
      return;
    }

    const cleanDigits = customerPhone.replace(/\D/g, '');
    if (!EGYPT_PHONE_REGEX.test(cleanDigits)) {
      showError('يرجى إدخال رقم محمول مصري صحيح مكون من 11 رقماً ويبدأ بـ (010، 011، 012، 015)');
      return;
    }

    const trimmedName = customerName.trim();
    const nameLetters = (trimmedName.match(/[\p{L}\p{M}]/gu) || []).length;
    if (trimmedName.length < 3 || nameLetters < 3) {
      showError('يرجى إدخال اسم مستلم صحيح لا يقل عن 3 أحرف (مثال: علي، مازن، محمد)');
      return;
    }

    const trimmedAddress = customerAddress.trim();
    const addressLetters = (trimmedAddress.match(/[\p{L}\p{M}]/gu) || []).length;
    if (trimmedAddress.length < 5 || addressLetters < 3) {
      showError('يرجى إدخال عنوان توصيل واضح ومفصل لا يقل عن 5 أحرف (المنطقة، الشارع، رقم العقار)');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMsg('');

    try {
      // Persist customer details on this device if requested
      if (rememberDevice) {
        try {
          localStorage.setItem(
            STOREFRONT_SAVED_CUSTOMER_KEY,
            JSON.stringify({
              name: customerName.trim(),
              phone: customerPhone.trim(),
              address: customerAddress.trim(),
              savedAt: new Date().toISOString(),
            })
          );
        } catch {}
      } else {
        try {
          localStorage.removeItem(STOREFRONT_SAVED_CUSTOMER_KEY);
        } catch {}
      }

      if (editingOrderNumber && tenantSlug) {
        const payload = {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          customerNotes: customerNotes.trim(),
          paymentMethod,
          items: cartItems.map((item) => ({
            productId: Number(item.product.id),
            quantity: Number(item.quantity) || 1,
          })),
        };
        await storefrontApi.updateCustomerOrder(tenantSlug, editingOrderNumber, payload);
        try {
          localStorage.setItem(`zs_customer_phone_${tenantSlug}`, customerPhone.trim());
        } catch {}
        if (onEditSuccess) {
          onEditSuccess(editingOrderNumber);
        } else {
          alert('تم تحديث طلبك بنجاح!');
          handleModalClose();
        }
      } else if (onSubmitOrder) {
        await onSubmitOrder({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          customerNotes: customerNotes.trim(),
          paymentMethod,
        });
      } else if (tenantSlug && onOrderSuccess) {
        const payload = {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          customerNotes: customerNotes.trim(),
          paymentMethod,
          items: cartItems.map((item) => ({
            productId: Number(item.product.id),
            quantity: Number(item.quantity) || 1,
          })),
        };
        const res = await storefrontApi.createOrder(tenantSlug, payload);
        try {
          const key = `zs_customer_orders_${tenantSlug}`;
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          if (!existing.includes(res.orderNumber)) {
            existing.unshift(res.orderNumber);
            localStorage.setItem(key, JSON.stringify(existing.slice(0, 30)));
          }
          localStorage.setItem(`zs_customer_phone_${tenantSlug}`, customerPhone.trim());
        } catch {}
        onOrderSuccess(res);
      } else {
        throw new Error('تعذر إرسال الطلب لعدم اكتمال بيانات المتجر، يرجى تحديث الصفحة والمحاولة مجدداً.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تأكيد الطلب، يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={handleModalClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: 'min(92vh, calc(100dvh - 24px))',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              {editingOrderNumber ? `تعديل الطلب #${editingOrderNumber}` : 'إتمام وتأكيد الطلب'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              {editingOrderNumber ? 'تعديل بيانات وأصناف طلبك قبل اعتماده من المتجر' : 'الدفع نقداً عند استلام الطلب'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Scrollable Fields Body */}
          <div
            ref={scrollBodyRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              padding: '18px 20px',
            }}
          >
            {errorMsg && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#991b1b',
                  marginBottom: '16px',
                }}
              >
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Field 1: Customer Phone (First field) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  رقم الهاتف (للتواصل وتأكيد الطلب) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {customerPhone.length > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: phoneStatus.isValid ? '#16a34a' : '#e11d48',
                    }}
                  >
                    {phoneStatus.message}
                  </span>
                )}
              </div>
              <input
                type="tel"
                required
                maxLength={11}
                autoFocus
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="01XXXXXXXXX (11 رقم)"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border:
                    customerPhone.length > 0
                      ? phoneStatus.isValid
                        ? '1.5px solid #22c55e'
                        : '1.5px solid #f87171'
                      : '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#f8fafc',
                  fontFamily: 'inherit',
                  direction: 'ltr',
                  textAlign: 'right',
                  transition: 'border-color 0.2s ease',
                }}
              />

              {/* Reassurance security badge if matched on this device */}
              {isDeviceMatched && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '11.5px',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    animation: 'fadeIn 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>
                      <strong>تم استرجاع بياناتك تلقائياً:</strong> لأنك طلبت من هذا الهاتف مسبقاً (بياناتك مؤمنة ومحفوظة على جهازك فقط).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerName('');
                      setCustomerAddress('');
                      setIsDeviceMatched(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#15803d',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      whiteSpace: 'nowrap',
                      marginRight: '8px',
                    }}
                  >
                    تغيير
                  </button>
                </div>
              )}
            </div>

            {/* Field 2: Customer Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                الاسم بالكامل <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: علي محمد / مازن أحمد"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border:
                    customerName.length > 0
                      ? nameStatus.isValid
                        ? '1.5px solid #22c55e'
                        : '1.5px solid #f87171'
                      : '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#f8fafc',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>

            {/* Field 3: Customer Address */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                عنوان التوصيل بالتفصيل <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                required
                rows={2}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="اسم الشارع، رقم العمارة، الطابق، الشقة، وعلامة مميزة (مثال: أمام مسجد التقوى / بجوار صيدلية...)"
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border:
                    customerAddress.length > 0
                      ? addressStatus.isValid
                        ? '1.5px solid #22c55e'
                        : '1.5px solid #f87171'
                      : '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#f8fafc',
                  fontFamily: 'inherit',
                  resize: 'none',
                  minHeight: '52px',
                  maxHeight: '64px',
                  lineHeight: '1.4',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>

            {/* Delivery Notes with rich examples */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                ملاحظات خاصة للأصناف أو التوصيل (اختياري)
              </label>
              <textarea
                rows={3}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder={"اكتب أي تعليمات لتحضير طلبك أو للتوصيل، مثلاً:\n• الجبنة كل ربع كيلو في علبة لوحدها\n• 5 كيلو أرز مقسمين (2 كيلو لوحدهم و 3 لوحدهم في شنطة)\n• البوابة مقفولة، رن الجرس مرتين أو كلمني قبل ما توصل"}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '12.5px',
                  outline: 'none',
                  background: '#f8fafc',
                  fontFamily: 'inherit',
                  resize: 'none',
                  minHeight: '85px',
                  lineHeight: '1.5',
                }}
              />
              <div style={{ fontSize: '11px', color: '#047857', marginTop: '4px', lineHeight: '1.4', background: '#ecfdf5', padding: '5px 10px', borderRadius: '6px', border: '1px solid #d1fae5' }}>
                ملاحظاتك تصل لإدارة المحل والكاشير فوراً لتجهيز الأصناف وتغليفها بدقة دون الحاجة للاتصال تليفونياً.
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                طريقة الدفع
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {/* COD Option */}
                <div
                  onClick={() => setPaymentMethod('cod')}
                  style={{
                    border: paymentMethod === 'cod' ? '2px solid #170e5e' : '1.5px solid #cbd5e1',
                    background: paymentMethod === 'cod' ? '#f8fafc' : '#ffffff',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                      الدفع عند الاستلام
                    </span>
                    <div
                      style={{
                        width: '13px',
                        height: '13px',
                        borderRadius: '50%',
                        border: paymentMethod === 'cod' ? '4px solid #170e5e' : '1.5px solid #94a3b8',
                        background: '#ffffff',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#64748b', lineHeight: '1.2' }}>
                    الدفع نقداً للمندوب عند المعاينة
                  </span>
                </div>

                {/* Pre-payment Option */}
                <div
                  onClick={() => setPaymentMethod('instapay_wallet')}
                  style={{
                    border: paymentMethod === 'instapay_wallet' ? '2px solid #170e5e' : '1.5px solid #cbd5e1',
                    background: paymentMethod === 'instapay_wallet' ? '#f8fafc' : '#ffffff',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                      إنستاباي / محفظة
                    </span>
                    <div
                      style={{
                        width: '13px',
                        height: '13px',
                        borderRadius: '50%',
                        border: paymentMethod === 'instapay_wallet' ? '4px solid #170e5e' : '1.5px solid #94a3b8',
                        background: '#ffffff',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#64748b', lineHeight: '1.2' }}>
                    تحويل مسبق لحساب المتجر
                  </span>
                </div>
              </div>

              {/* Notice if instapay/wallet is selected */}
              {paymentMethod === 'instapay_wallet' && (
                <div
                  style={{
                    marginTop: '8px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: '#166534',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    رقم التحويل (إنستاباي / كاش):{' '}
                    <span style={{ direction: 'ltr', display: 'inline-block', color: '#170e5e', fontWeight: 900 }}>
                      {info?.whatsappPhone || 'يرجى التواصل عبر الواتساب'}
                    </span>
                  </div>
                  <div style={{ color: '#15803d', fontSize: '11px', lineHeight: '1.4' }}>
                    يرجى تحويل مبلغ الطلب ({total.toFixed(0)} ج.م) وإرسال إشعار التحويل عبر الواتساب لتأكيد الشحن فوراً.
                  </div>
                </div>
              )}
            </div>

            {/* Order Total Summary */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>المبلغ الإجمالي للدفع:</span>
                <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  ({subtotal.toFixed(0)} أصناف + {deliveryFee.toFixed(0)} توصيل)
                </span>
              </div>
              <span style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                {total.toFixed(0)} ج.م
              </span>
            </div>

            {/* Remember details checkbox (default checked) */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '11px',
                color: '#334155',
                userSelect: 'none',
                background: '#f8fafc',
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                style={{
                  width: '14px',
                  height: '14px',
                  accentColor: '#170e5e',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                تذكر بياناتي على هذا الجهاز لتسريع الطلب في المرات القادمة
              </span>
            </label>
          </div>
        </div>

        {/* Sticky Bottom Actions Bar (Always visible & accessible on all screens) */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            gap: '10px',
            flexShrink: 0,
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.04)',
            zIndex: 10,
          }}
        >
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '10px',
              background: '#170e5e',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 800,
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(23, 14, 94, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? 'جاري الحفظ...' : editingOrderNumber ? 'حفظ تعديلات الطلب' : 'إرسال وتأكيد الطلب الآن'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '12px 18px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  </div>
);
}
