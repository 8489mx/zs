import { CreateOnlineOrderResponse } from '../types/storefront.types';

interface StorefrontSuccessModalProps {
  order?: CreateOnlineOrderResponse | null;
  orderData?: CreateOnlineOrderResponse | null;
  isOpen?: boolean;
  whatsappPhone?: string;
  onClose: () => void;
  onTrackOrder?: () => void;
}

export function StorefrontSuccessModal({
  order,
  orderData,
  isOpen = true,
  whatsappPhone,
  onClose,
  onTrackOrder,
}: StorefrontSuccessModalProps) {
  const activeOrder = order || orderData;
  if (!activeOrder || !isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'rgba(15, 23, 42, 0.65)',
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
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          textAlign: 'center',
          padding: '32px 24px',
        }}
      >
        {/* Success Icon */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: '#dcfce7',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 8px 16px rgba(22, 163, 74, 0.15)',
          }}
        >
          <svg width="34" height="34" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
          تم استلام طلبك بنجاح!
        </h2>
        <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b' }}>
          رقم الطلب الخاص بك:{' '}
          <strong style={{ color: '#0f172a', fontWeight: 800, fontSize: '15px' }}>
            #{activeOrder.orderNumber}
          </strong>
        </p>

        {/* Order Details Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'right',
            marginBottom: '22px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              marginBottom: '10px',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '6px',
            }}
          >
            ملخص الطلب:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            {activeOrder.items.map((i, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                <span>
                  {i.name} (×{i.quantity})
                </span>
                <span style={{ fontWeight: 600 }}>{i.total.toFixed(0)} ج</span>
              </div>
            ))}

            {activeOrder.deliveryFee === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontSize: '12.5px' }}>
                <span>خدمة التوصيل {activeOrder.deliveryZoneName ? `(${activeOrder.deliveryZoneName})` : ''}:</span>
                <span style={{ fontWeight: 700 }}>مجاناً 🚚</span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12.5px' }}>
                <span>خدمة التوصيل {activeOrder.deliveryZoneName ? `(${activeOrder.deliveryZoneName})` : ''}:</span>
                <span style={{ fontWeight: 600 }}>{activeOrder.deliveryFee.toFixed(0)} ج</span>
              </div>
            )}

            {(activeOrder.discountAmount ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontSize: '12.5px' }}>
                <span>خصم الكوبون {activeOrder.couponCode ? `(${activeOrder.couponCode})` : ''}:</span>
                <span style={{ fontWeight: 700 }}>-{(activeOrder.discountAmount ?? 0).toFixed(0)} ج.م</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '8px',
                marginTop: '6px',
                borderTop: '1px dashed #cbd5e1',
                fontWeight: 800,
                color: '#0f172a',
                fontSize: '15px',
              }}
            >
              <span>المطلوب دفعه:</span>
              <span>{activeOrder.totalAmount.toFixed(0)} ج.م</span>
            </div>
          </div>
        </div>

        {/* Track Order in My Orders CTA Button */}
        {onTrackOrder && (
          <button
            type="button"
            onClick={onTrackOrder}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '13px 18px',
              borderRadius: '12px',
              background: '#170e5e',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              marginBottom: '10px',
              boxShadow: '0 4px 14px rgba(23, 14, 94, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>تتبع حالة الطلب في (طلباتي)</span>
            <span>📦</span>
          </button>
        )}

        {/* WhatsApp Direct Action */}
        {activeOrder.whatsappUrl && (
          <a
            href={activeOrder.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '13px 18px',
              borderRadius: '12px',
              background: '#25D366',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              textDecoration: 'none',
              marginBottom: '10px',
              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.181-.076.355.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
            </svg>
            <span>متابعة الطلب عبر واتساب المتجر</span>
          </a>
        )}

        {/* Continue Shopping Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#334155',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          متابعة التسوق في المتجر
        </button>
      </div>
    </div>
  );
}
