import React, { useState, useEffect } from 'react';
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
  onOrderSuccess?: (orderData: CreateOnlineOrderResponse) => void;
  onSubmitOrder?: (formData: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerNotes: string;
    paymentMethod?: string;
  }) => Promise<void>;
}

export function StorefrontCheckoutModal({
  isOpen,
  onClose,
  cartItems,
  info,
  deliveryFee: deliveryFeeProp,
  tenantSlug,
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

  useEffect(() => {
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

    if (val.length === 11 && val.startsWith('01')) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('يرجى إدخال اسم المستلم');
      return;
    }
    const cleanDigits = customerPhone.replace(/\D/g, '');
    if (!cleanDigits.startsWith('01') || cleanDigits.length !== 11) {
      setErrorMsg('يرجى إدخال رقم محمول مصري صحيح مكون من 11 رقماً يبدأ بـ 01 (مثال: 01012345678)');
      return;
    }
    if (!customerAddress.trim()) {
      setErrorMsg('يرجى إدخال عنوان التوصيل بالتفصيل');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

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

      if (onSubmitOrder) {
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
        onOrderSuccess(res);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تأكيد الطلب، يرجى المحاولة مرة أخرى');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              إتمام وتأكيد الطلب
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              الدفع نقداً عند استلام الطلب
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
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
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
                      color: customerPhone.length === 11 && customerPhone.startsWith('01') ? '#16a34a' : '#e11d48',
                    }}
                  >
                    {customerPhone.length === 11 && customerPhone.startsWith('01')
                      ? '✓ رقم صحيح (11 رقم)'
                      : `متبقي ${11 - customerPhone.length} رقم`}
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
                    customerPhone.length > 0 && (customerPhone.length !== 11 || !customerPhone.startsWith('01'))
                      ? '1.5px solid #f87171'
                      : '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#f8fafc',
                  fontFamily: 'inherit',
                  direction: 'ltr',
                  textAlign: 'right',
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                يجب إدخال 11 رقماً ويبدأ بـ 01 (فودافون / أورانج / اتصالات / وي)
              </div>

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
                    <span style={{ fontSize: '15px' }}>🔒</span>
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
                placeholder="مثال: أحمد محمد"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#f8fafc',
                  fontFamily: 'inherit',
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
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#f8fafc',
                  fontFamily: 'inherit',
                  resize: 'none',
                  minHeight: '52px',
                  maxHeight: '64px',
                  lineHeight: '1.4',
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
                💡 ملاحظاتك تصل لإدارة المحل والكاشير فوراً لتجهيز الأصناف وتغليفها بدقة دون الحاجة للاتصال تليفونياً.
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
                    borderRadius: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💵</span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                        الدفع عند الاستلام
                      </span>
                    </div>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: paymentMethod === 'cod' ? '4px solid #170e5e' : '1.5px solid #94a3b8',
                        background: '#ffffff',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>
                    الدفع نقداً للمندوب عند المعاينة
                  </span>
                </div>

                {/* Pre-payment Option */}
                <div
                  onClick={() => setPaymentMethod('instapay_wallet')}
                  style={{
                    border: paymentMethod === 'instapay_wallet' ? '2px solid #170e5e' : '1.5px solid #cbd5e1',
                    background: paymentMethod === 'instapay_wallet' ? '#f8fafc' : '#ffffff',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📱</span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                        إنستاباي / محفظة
                      </span>
                    </div>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: paymentMethod === 'instapay_wallet' ? '4px solid #170e5e' : '1.5px solid #94a3b8',
                        background: '#ffffff',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>
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
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', color: '#64748b' }}>المبلغ الإجمالي للدفع:</span>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  ({subtotal.toFixed(0)} أصناف + {deliveryFee.toFixed(0)} توصيل)
                </div>
              </div>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                {total.toFixed(0)} ج.م
              </span>
            </div>

            {/* Remember details checkbox (default checked) */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '12.5px',
                color: '#334155',
                userSelect: 'none',
                background: '#f8fafc',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}
            >
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                style={{
                  width: '17px',
                  height: '17px',
                  accentColor: '#170e5e',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontWeight: 700, color: '#1e293b' }}>
                تذكر بياناتي على هذا الجهاز لتسريع الطلب في المرات القادمة ⚡
              </span>
            </label>
          </div>

          {/* Submit CTA */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '13px 20px',
                borderRadius: '10px',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 800,
                border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? 'جاري تأكيد الطلب...' : 'إرسال وتأكيد الطلب الآن'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '13px 18px',
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
