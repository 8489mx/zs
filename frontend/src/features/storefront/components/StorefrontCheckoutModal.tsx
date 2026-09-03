import React, { useState } from 'react';
import { CartItem, CreateOnlineOrderResponse, StorefrontInfo } from '../types/storefront.types';
import { storefrontApi } from '../api/storefront.api';

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
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 8) {
      setErrorMsg('يرجى إدخال رقم هاتف صحيح للتواصل');
      return;
    }
    if (!customerAddress.trim()) {
      setErrorMsg('يرجى إدخال عنوان التوصيل بالتفصيل');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      if (onSubmitOrder) {
        await onSubmitOrder({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          customerNotes: customerNotes.trim(),
        });
      } else if (tenantSlug && onOrderSuccess) {
        const payload = {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          customerNotes: customerNotes.trim(),
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
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
            {/* Customer Name */}
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

            {/* Customer Phone */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                رقم الهاتف (للتواصل وتأكيد الطلب) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="مثال: 01012345678"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#f8fafc',
                  fontFamily: 'inherit',
                  direction: 'ltr',
                  textAlign: 'right',
                }}
              />
            </div>

            {/* Customer Address */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                عنوان التوصيل بالتفصيل <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                required
                rows={2}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="المحافظة، المنطقة، اسم الشارع، رقم العمارة والشقة..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#f8fafc',
                  fontFamily: 'inherit',
                  resize: 'none',
                }}
              />
            </div>

            {/* Delivery Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                ملاحظات إضافية (اختياري)
              </label>
              <input
                type="text"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="مثال: يرجي الاتصال قبل الوصول"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#f8fafc',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Payment Badge */}
            <div
              style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>💵</span>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    الدفع عند الاستلام (COD)
                  </span>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    الدفع نقداً للمندوب عند معاينة واستلام الطلب
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#dcfce7',
                  color: '#166534',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                مفعل
              </span>
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
