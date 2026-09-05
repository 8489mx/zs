import { useState } from 'react';
import { CreateOnlineOrderResponse, StorefrontPaymentSessionResponse } from '../types/storefront.types';
import { storefrontApi } from '../api/storefront.api';

interface StorefrontOnlinePaymentModalProps {
  isOpen: boolean;
  session: StorefrontPaymentSessionResponse | null;
  orderData: CreateOnlineOrderResponse | null;
  tenantSlug: string;
  onSuccess: (paymentInfo: { orderNumber: string; transactionId: string }) => void;
  onClose: () => void;
}

export function StorefrontOnlinePaymentModal({
  isOpen,
  session,
  orderData,
  tenantSlug,
  onSuccess,
  onClose,
}: StorefrontOnlinePaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4242');
  const [cardHolder, setCardHolder] = useState(orderData?.orderNumber ? 'عميل المتجر' : 'Mohammed Ali');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');

  if (!isOpen || !session || !orderData) return null;

  const totalAmount = session.amount || orderData.totalAmount;
  const currencyLabel = session.currency || 'ج.م';
  const isLiveIframe =
    (session.mode === 'paymob' || session.mode === 'xpay' || session.mode === 'tap' || session.mode === 'stripe') &&
    !session.testMode &&
    Boolean(session.iframeUrl);

  const providerLabel =
    session.provider === 'tap' || session.mode === 'tap'
      ? 'تاب للمدفوعات (Tap GCC)'
      : session.provider === 'stripe' || session.mode === 'stripe'
      ? 'سترايب (Stripe Global)'
      : session.provider === 'xpay' || session.mode === 'xpay'
      ? 'إكس باي (XPay)'
      : session.provider === 'paymob' || session.mode === 'paymob'
      ? 'Paymob'
      : 'بيئة الاختبار التجريبية';

  const handleMockPay = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await storefrontApi.mockPayOrder(tenantSlug, session.orderNumber, {
        cardNumber: cardNumber.replace(/\s+/g, ''),
        cardHolder,
      });
      if (res.ok) {
        onSuccess({
          orderNumber: session.orderNumber,
          transactionId: res.transactionId,
        });
      } else {
        setErrorMsg('تعذر تأكيد الدفع التجريبي، يرجى المحاولة مرة أخرى');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء معالجة الدفع التجريبي');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setLoading(true);
    try {
      const statusRes = await storefrontApi.getPaymentStatus(tenantSlug, session.orderNumber);
      if (statusRes.ok && statusRes.paymentStatus === 'paid') {
        onSuccess({
          orderNumber: session.orderNumber,
          transactionId: statusRes.gatewayTransactionId || `${(session.provider || 'ONLINE').toUpperCase()}-PAID`,
        });
      } else {
        setErrorMsg('لم يتم رصد تأكيد الدفع بعد، يرجى استكمال السداد ثم الضغط على التحقق مجدداً.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر التحقق من حالة السداد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isLiveIframe ? '640px' : '460px',
          maxHeight: 'min(94vh, 750px)',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '16px 20px',
            background: '#170e5e',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🔒</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>
                {isLiveIframe ? `بوابة الدفع الآمنة (${providerLabel})` : `بوابة الدفع الإلكتروني (${providerLabel} - تجريبي)`}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.85 }}>
                طلب رقم: #{session.orderNumber} • الإجمالي: {totalAmount.toFixed(0)} {currencyLabel}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              color: '#ffffff',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: 700,
              }}
            >
              ✕ {errorMsg}
            </div>
          )}

          {isLiveIframe && session.iframeUrl ? (
            /* Embedded Iframe */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <iframe
                src={session.iframeUrl}
                title={providerLabel}
                allow="payment *"
                style={{
                  width: '100%',
                  height: '480px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCheckStatus}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'جاري التحقق...' : 'تأكيد إتمام السداد الآن ✓'}
                </button>
                <button
                  type="button"
                  onClick={() => window.open(session.iframeUrl, '_blank')}
                  style={{
                    background: '#f8fafc',
                    color: '#170e5e',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  فتح بنافذة مستقلة ↗
                </button>
              </div>
            </div>
          ) : (
            /* Realistic Card Payment Simulator */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Virtual Card Graphic */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #170e5e 0%, #312e81 60%, #1e1b4b 100%)',
                  borderRadius: '16px',
                  padding: '18px 22px',
                  color: '#ffffff',
                  boxShadow: '0 8px 20px rgba(23, 14, 94, 0.25)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '1px', opacity: 0.9 }}>
                    {session.provider === 'tap'
                      ? '🇸🇦 TAP GCC • تجريبي'
                      : session.provider === 'stripe'
                      ? '🌍 STRIPE • تجريبي'
                      : session.provider === 'xpay'
                      ? 'XPAY • تجريبي'
                      : 'BANK CARD • تجريبي'}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '1px' }}>
                    {session.provider === 'tap' ? 'MADA / KNET / APPLE' : session.provider === 'stripe' ? 'VISA / MC / APPLE' : 'VISA'}
                  </span>
                </div>

                <div
                  style={{
                    direction: 'ltr',
                    fontSize: '18px',
                    fontWeight: 700,
                    letterSpacing: '3px',
                    fontFamily: 'monospace',
                    marginBottom: '16px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px' }}>
                  <div>
                    <div style={{ opacity: 0.7, fontSize: '9px', marginBottom: '2px' }}>CARD HOLDER</div>
                    <div style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>
                      {cardHolder || 'CUSTOMER NAME'}
                    </div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.7, fontSize: '9px', marginBottom: '2px' }}>EXPIRES</div>
                    <div style={{ fontWeight: 800, fontSize: '12px' }}>{cardExpiry || 'MM/YY'}</div>
                  </div>
                </div>
              </div>

              {/* Quick Card Presets for Testing */}
              {session.provider === 'tap' && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCardNumber('4588 5233 4411 9660');
                      setCardHolder('حامل بطاقة مدى');
                      setCardExpiry('08/29');
                    }}
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#166534',
                      cursor: 'pointer',
                    }}
                  >
                    🇸🇦 مدى (Mada)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCardNumber('5210 8822 7733 9650');
                      setCardHolder('عميل كي نت الكويت');
                      setCardExpiry('11/28');
                    }}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#1d4ed8',
                      cursor: 'pointer',
                    }}
                  >
                    🇰🇼 كي نت (KNET)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCardNumber('4111 2222 3333 4242');
                      setCardHolder('Apple Pay User');
                      setCardExpiry('12/28');
                    }}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0f172a',
                      cursor: 'pointer',
                    }}
                  >
                    🍎 Apple Pay
                  </button>
                </div>
              )}

              {session.provider === 'stripe' && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCardNumber('4242 4242 4242 4242');
                      setCardHolder('Stripe Customer');
                      setCardExpiry('04/28');
                    }}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#1d4ed8',
                      cursor: 'pointer',
                    }}
                  >
                    💳 بطاقة سترايب تجريبية (4242)
                  </button>
                </div>
              )}

              {/* Notice Pill */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '11.5px',
                  color: '#475569',
                  lineHeight: '1.4',
                }}
              >
                🧪 <strong>محاكي السداد الإلكتروني:</strong> يمكنك الضغط فوراً على زر الدفع التجريبي لاختبار تأكيد الطلب وتحديث حالة الفاتورة تلقائياً.
              </div>

              {/* Card Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    رقم البطاقة (Card Number)
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      direction: 'ltr',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      الاسم على البطاقة
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        الانتهاء
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 8px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px',
                          direction: 'ltr',
                          boxSizing: 'border-box',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        CVV
                      </label>
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 8px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px',
                          direction: 'ltr',
                          boxSizing: 'border-box',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Pay Button */}
              <button
                type="button"
                onClick={handleMockPay}
                disabled={loading}
                style={{
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '13px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(23, 14, 94, 0.25)',
                  marginTop: '4px',
                }}
              >
                {loading ? 'جاري معالجة الدفع...' : `دفع فوري تجريبي (${totalAmount.toFixed(0)} ${currencyLabel}) ✓`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
