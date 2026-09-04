import { useState } from 'react';
import { CartItem, StorefrontInfo } from '../types/storefront.types';
import { StorefrontLiveCartItem } from './StorefrontLiveCartItem';
import { StorefrontLiveCartPill } from './StorefrontLiveCartPill';

function formatArabicItems(count: number): string {
  if (count === 1) return 'صنف واحد';
  if (count === 2) return 'صنفان';
  if (count >= 3 && count <= 10) return `${count} أصناف`;
  return `${count} صنفاً`;
}

interface StorefrontLiveCartDockProps {
  cartItems: CartItem[];
  info?: StorefrontInfo;
  deliveryFee?: number;
  minOrder?: number;
  onUpdateQuantity: (productId: number, qty: number) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
}

export function StorefrontLiveCartDock({
  cartItems,
  info,
  deliveryFee: deliveryFeeProp,
  minOrder: minOrderProp,
  onUpdateQuantity,
  onClearCart,
  onProceedToCheckout,
}: StorefrontLiveCartDockProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (cartItems.length === 0) return null;

  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = deliveryFeeProp ?? info?.deliveryFee ?? 0;
  const minOrder = minOrderProp ?? info?.minOrder ?? 0;
  const total = subtotal + deliveryFee;
  const isMinOrderMet = minOrder <= 0 || subtotal >= minOrder;

  return (
    <div
      dir="rtl"
      className="storefront-live-cart-dock"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9990,
        fontFamily: 'inherit',
      }}
    >
      <style>{`
        @keyframes liveCartSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes livePulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
        .live-cart-scroll::-webkit-scrollbar { width: 5px; }
        .live-cart-scroll::-webkit-scrollbar-track { background: #f8fafc; }
        .live-cart-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .live-cart-ctrl-btn {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 7px;
          width: 28px;
          height: 28px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: all 0.15s ease;
        }
        .live-cart-clear-btn { color: #94a3b8; font-size: 12px; }
        .live-cart-clear-btn:hover { color: #ef4444; background: #fee2e2; border-color: #fca5a5; }
        .live-cart-collapse-btn { color: #64748b; font-size: 13px; line-height: 1; }
        .live-cart-collapse-btn:hover { background: #e2e8f0; color: #0f172a; }
        .storefront-checkout-btn:not(:disabled):hover { opacity: 0.94; transform: translateY(-1px); }
        .storefront-checkout-btn:not(:disabled):hover .storefront-checkout-arrow {
          transform: translateX(-4px);
        }
        @media (max-width: 640px) {
          .storefront-live-cart-dock { left: 12px !important; right: 12px !important; bottom: 16px !important; }
          .storefront-live-cart-card { width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      {isCollapsed ? (
        <StorefrontLiveCartPill
          totalQuantity={totalQuantity}
          total={total}
          isMinOrderMet={isMinOrderMet}
          onExpand={() => setIsCollapsed(false)}
          onProceedToCheckout={onProceedToCheckout}
        />
      ) : (
        /* Full Expanded Live Cart Card */
        <div
          className="storefront-live-cart-card"
          style={{
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            borderRight: '4.5px solid #170e5e',
            boxShadow: '0 20px 35px -8px rgba(15, 23, 42, 0.2), 0 8px 16px -4px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'liveCartSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    border: '2px solid #ffffff',
                    animation: 'livePulseDot 2s infinite ease-in-out',
                  }}
                />
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '14px', color: '#0f172a', fontWeight: 800 }}>
                    سلة المشتريات
                  </strong>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: '#f1f5f9',
                      color: '#170e5e',
                      border: '1px solid #e2e8f0',
                      padding: '1px 6px',
                      borderRadius: '5px',
                    }}
                  >
                    {formatArabicItems(totalQuantity)}
                  </span>
                </div>
              </div>
            </div>

            {/* Header controls: Clear Cart & Collapse */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                className="live-cart-ctrl-btn live-cart-clear-btn"
                onClick={() => {
                  if (window.confirm('هل تود تفريغ سلة المشتريات بالكامل؟')) {
                    onClearCart();
                  }
                }}
                title="تفريغ السلة"
              >
                🗑️
              </button>

              <button
                type="button"
                className="live-cart-ctrl-btn live-cart-collapse-btn"
                onClick={() => setIsCollapsed(true)}
                title="تصغير السلة"
              >
                —
              </button>
            </div>
          </div>

          {/* Items List (Auto-grow dynamic height up to screen limit) */}
          <div
            className="live-cart-scroll"
            style={{
              maxHeight: 'min(480px, calc(100vh - 220px))',
              overflowY: 'auto',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: '#ffffff',
            }}
          >
            {cartItems.map((item) => (
              <StorefrontLiveCartItem
                key={item.product.id}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
              />
            ))}
          </div>

          {/* Breakdown & Calculation Shelf */}
          <div
            style={{
              padding: '10px 14px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
              <span>قيمة الأصناف ({formatArabicItems(cartItems.length)}):</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{subtotal.toFixed(0)} ج.م</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
              <span>مصاريف التوصيل:</span>
              <span style={{ fontWeight: 700, color: deliveryFee > 0 ? '#0f172a' : '#166534' }}>
                {deliveryFee > 0 ? `${deliveryFee.toFixed(0)} ج.م` : 'توصيل مجاني ⚡'}
              </span>
            </div>

            {!isMinOrderMet && (
              <div
                style={{
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  color: '#c2410c',
                  fontWeight: 700,
                  marginTop: '2px',
                  textAlign: 'center',
                }}
              >
                الحد الأدنى للطلب هو {minOrder} ج (متبقي {(minOrder - subtotal).toFixed(0)} ج)
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '6px',
                marginTop: '4px',
                borderTop: '1px dashed #cbd5e1',
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              <span>الإجمالي النهائي:</span>
              <span style={{ fontSize: '15px', color: '#166534' }}>{total.toFixed(0)} ج.م</span>
            </div>
          </div>

          {/* Checkout CTA Button */}
          <div style={{ padding: '10px 14px', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              className="storefront-checkout-btn"
              onClick={onProceedToCheckout}
              disabled={!isMinOrderMet}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '10px',
                background: isMinOrderMet ? '#170e5e' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: isMinOrderMet ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isMinOrderMet ? '0 4px 12px rgba(23, 14, 94, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>إتمام الطلب الآن ({total.toFixed(0)} ج.م)</span>
              <span
                className="storefront-checkout-arrow"
                style={{
                  fontSize: '15px',
                  display: 'inline-block',
                  transition: 'transform 0.2s ease',
                }}
              >
                ←
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
