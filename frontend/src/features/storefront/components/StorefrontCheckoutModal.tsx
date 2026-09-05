import React, { useState, useEffect, useRef } from 'react';
import { CartItem, CreateOnlineOrderResponse, StorefrontInfo, ValidateCouponResponse } from '../types/storefront.types';
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
    couponCode?: string;
    deliveryZoneId?: number;
    deliveryZoneName?: string;
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
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResponse | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const isSubmittingRef = useRef(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const activeDeliveryZones = (info?.deliveryZones || []).filter((z) => z.isActive !== false);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const savedZone = localStorage.getItem('zsystems.storefront.saved_zone_id');
      if (savedZone && activeDeliveryZones.some((z) => z.id === Number(savedZone))) {
        setSelectedZoneId(Number(savedZone));
      } else if (activeDeliveryZones.length > 0) {
        setSelectedZoneId((prev) => (prev !== null && activeDeliveryZones.some((z) => z.id === prev) ? prev : activeDeliveryZones[0].id));
      }
    } catch {
      if (activeDeliveryZones.length > 0) {
        setSelectedZoneId((prev) => (prev !== null && activeDeliveryZones.some((z) => z.id === prev) ? prev : activeDeliveryZones[0].id));
      }
    }
  }, [isOpen, activeDeliveryZones.length]);

  const handleZoneSelect = (zoneId: number) => {
    setSelectedZoneId(zoneId);
    try {
      localStorage.setItem('zsystems.storefront.saved_zone_id', String(zoneId));
    } catch {}
  };

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
    setCouponError('');
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

  const handleModalClose = () => {
    setLoading(false);
    setErrorMsg('');
    setCouponCodeInput('');
    setAppliedCoupon(null);
    setCouponError('');
    isSubmittingRef.current = false;
    onClose();
  };

  const handleApplyCoupon = async () => {
    const cleanCode = couponCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('يرجى كتابة كود الكوبون أولاً');
      return;
    }
    if (!tenantSlug) return;

    setCouponLoading(true);
    setCouponError('');

    try {
      const res = await storefrontApi.validateCoupon(tenantSlug, cleanCode, subtotal);
      if (res.ok) {
        setAppliedCoupon(res);
        setCouponError('');
      } else {
        setAppliedCoupon(null);
        setCouponError(res.message || 'كود الكوبون غير صالح');
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'تعذر التحقق من كود الكوبون');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
  };

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const selectedZone = activeDeliveryZones.find((z) => z.id === selectedZoneId) || (activeDeliveryZones.length > 0 ? activeDeliveryZones[0] : null);
  const rawDeliveryFee = selectedZone ? selectedZone.deliveryFee : (deliveryFeeProp ?? info?.deliveryFee ?? 0);

  // Automatic Free Shipping Rule
  const isAutoFreeShipping = Boolean(info?.freeShippingEnabled && subtotal >= (info?.freeShippingMinOrder || 500));
  const freeShippingThreshold = info?.freeShippingMinOrder || 500;
  const freeShippingRemaining = (info?.freeShippingEnabled && !isAutoFreeShipping)
    ? Math.max(0, freeShippingThreshold - subtotal)
    : 0;

  // Coupon Free Shipping & Discount
  const isCouponFreeShipping = Boolean(appliedCoupon?.ok && appliedCoupon?.isFreeShipping);
  const effectiveDeliveryFee = (isAutoFreeShipping || isCouponFreeShipping) ? 0 : rawDeliveryFee;

  let discountAmount = 0;
  if (appliedCoupon?.ok && appliedCoupon.discountAmount) {
    discountAmount = Math.min(subtotal, appliedCoupon.discountAmount);
  }

  const total = Math.max(0, subtotal - discountAmount) + effectiveDeliveryFee;

  const phoneStatus = getEgyptianPhoneValidation(customerPhone);
  const nameStatus = getCustomerNameValidation(customerName);
  const addressStatus = getCustomerAddressValidation(customerAddress);

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
          couponCode: appliedCoupon?.ok ? appliedCoupon.code : undefined,
          deliveryZoneId: selectedZone ? selectedZone.id : undefined,
          deliveryZoneName: selectedZone ? selectedZone.name : undefined,
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
          couponCode: appliedCoupon?.ok ? appliedCoupon.code : undefined,
          deliveryZoneId: selectedZone ? selectedZone.id : undefined,
          deliveryZoneName: selectedZone ? selectedZone.name : undefined,
        });
      } else if (tenantSlug && onOrderSuccess) {
        const payload = {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          customerNotes: customerNotes.trim(),
          paymentMethod,
          couponCode: appliedCoupon?.ok ? appliedCoupon.code : undefined,
          deliveryZoneId: selectedZone ? selectedZone.id : undefined,
          deliveryZoneName: selectedZone ? selectedZone.name : undefined,
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

            {/* Field: Delivery Zone Matrix Selector */}
            {activeDeliveryZones.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                    منطقة / حي التوصيل <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {selectedZone?.estimatedTime && (
                    <span style={{ fontSize: '11px', color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 7px', borderRadius: '4px', fontWeight: 600 }}>
                      ⏱️ التوصيل المتوقع: {selectedZone.estimatedTime}
                    </span>
                  )}
                </div>

                <select
                  value={selectedZone?.id ?? ''}
                  onChange={(e) => handleZoneSelect(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#f8fafc',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  {activeDeliveryZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} — {z.deliveryFee === 0 ? 'توصيل مجاني (0 ج)' : `${z.deliveryFee} ج.م`} {z.estimatedTime ? `(${z.estimatedTime})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

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

            {/* Automatic Free Shipping Callout */}
            {info?.freeShippingEnabled && (
              <div>
                {isAutoFreeShipping ? (
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#065f46',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    <span>🎉</span>
                    <span>
                      مبروك! مشترياتك تجاوزت {freeShippingThreshold} ج.م وحصلت على شحن مجاني (توفير {rawDeliveryFee.toFixed(0)} ج.م).
                    </span>
                  </div>
                ) : freeShippingRemaining > 0 ? (
                  <div
                    style={{
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: '#0369a1',
                      fontSize: '11.5px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🚚</span>
                      <span>
                        أضف بـ <strong style={{ color: '#0284c7' }}>{freeShippingRemaining.toFixed(0)} ج.م</strong> إضافية للحصول على شحن مجاني!
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '10.5px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontWeight: 700,
                      }}
                    >
                      عرض الشحن
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Promo Code Input Box */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  كود الخصم أو الكوبون (Promo Code):
                </label>
                {appliedCoupon?.ok && (
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                    ✓ تم التطبيق
                  </span>
                )}
              </div>

              {appliedCoupon?.ok ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ecfdf5',
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    padding: '6px 10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>🏷️</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#166534', fontSize: '12.5px' }}>
                      {appliedCoupon.code}
                    </span>
                    <span style={{ fontSize: '11px', color: '#15803d', marginRight: '4px' }}>
                      {appliedCoupon.isFreeShipping ? '(شحن مجاني)' : `(خصم ${discountAmount.toFixed(0)} ج)`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '2px 4px',
                    }}
                  >
                    إلغاء ✕
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      value={couponCodeInput}
                      onChange={(e) => {
                        setCouponCodeInput(e.target.value.toUpperCase().replace(/\s+/g, ''));
                        setCouponError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      placeholder="أدخل كود الكوبون هنا..."
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: couponError ? '1.5px solid #f87171' : '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        direction: 'ltr',
                        textAlign: 'right',
                        background: '#ffffff',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCodeInput.trim()}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: '#170e5e',
                        color: '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: couponLoading || !couponCodeInput.trim() ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {couponLoading ? 'جاري...' : 'تطبيق'}
                    </button>
                  </div>
                  {couponError && (
                    <span style={{ display: 'block', fontSize: '11px', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>
                      ⚠️ {couponError}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Order Total Summary */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>مجموع الأصناف:</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{subtotal.toFixed(0)} ج.م</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>خدمة التوصيل {selectedZone ? `(${selectedZone.name})` : ''}:</span>
                {effectiveDeliveryFee === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {rawDeliveryFee > 0 && (
                      <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{rawDeliveryFee.toFixed(0)} ج</span>
                    )}
                    <strong style={{ color: '#16a34a' }}>مجاناً 🚚</strong>
                  </div>
                ) : (
                  <span style={{ fontWeight: 600, color: '#334155' }}>{effectiveDeliveryFee.toFixed(0)} ج.م</span>
                )}
              </div>

              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#16a34a' }}>
                  <span>خصم الكوبون ({appliedCoupon?.code}):</span>
                  <strong style={{ fontWeight: 800 }}>- {discountAmount.toFixed(0)} ج.م</strong>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  marginTop: '2px',
                  borderTop: '1px dashed #cbd5e1',
                }}
              >
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                  المبلغ الإجمالي للدفع:
                </span>
                <span style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                  {total.toFixed(0)} ج.م
                </span>
              </div>
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
