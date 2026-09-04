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
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onUpdateQuantity: (productId: number, qty: number) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
}

export function StorefrontLiveCartDock({
  cartItems,
  info,
  deliveryFee: deliveryFeeProp,
  minOrder: minOrderProp,
  isOpen,
  onOpen,
  onClose,
  onUpdateQuantity,
  onClearCart,
  onProceedToCheckout,
}: StorefrontLiveCartDockProps) {
  if (cartItems.length === 0) return null;

  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = deliveryFeeProp ?? info?.deliveryFee ?? 0;
  const minOrder = minOrderProp ?? info?.minOrder ?? 0;
  const total = subtotal + deliveryFee;
  const isMinOrderMet = minOrder <= 0 || subtotal >= minOrder;

  // Case 1: Collapsed State -> Sleek Floating Pill at Bottom
  if (!isOpen) {
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
          @media (max-width: 640px) {
            .storefront-live-cart-dock { left: 12px !important; right: 12px !important; bottom: 16px !important; }
          }
        `}</style>

        <StorefrontLiveCartPill
          itemsCount={cartItems.length}
          totalQuantity={totalQuantity}
          total={total}
          isMinOrderMet={isMinOrderMet}
          onExpand={onOpen}
          onProceedToCheckout={onProceedToCheckout}
        />
      </div>
    );
  }

  // Case 2: Expanded State -> Full-Height Premium Drawer with Backdrop Blur
  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'flex-start', // In RTL flex-start aligns to the right edge
        alignItems: 'stretch',
        animation: 'fadeIn 0.2s ease',
        fontFamily: 'inherit',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes liveCartSlideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
          width: 30px;
          height: 30px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: all 0.15s ease;
        }
        .live-cart-clear-btn { color: #94a3b8; font-size: 13px; }
        .live-cart-clear-btn:hover { color: #ef4444; background: #fee2e2; border-color: #fca5a5; }
        .live-cart-close-btn { color: #64748b; font-size: 16px; font-weight: 700; line-height: 1; }
        .live-cart-close-btn:hover { background: #e2e8f0; color: #0f172a; }
        .storefront-checkout-btn:not(:disabled):hover { opacity: 0.94; transform: translateY(-1px); }
        .storefront-checkout-btn:not(:disabled):hover .storefront-checkout-arrow {
          transform: translateX(-4px);
        }
        @media (max-width: 640px) {
          .storefront-live-cart-fullsheet { width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      <div
        className="storefront-live-cart-fullsheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '430px',
          height: '100%',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          borderRight: '5px solid #170e5e',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          animation: 'liveCartSlideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Full-Height Drawer Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
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
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  border: '2px solid #ffffff',
                  animation: 'livePulseDot 2s infinite ease-in-out',
                }}
              />
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 800 }}>
                  سلة المشتريات
                </h3>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    background: '#f0f3ff',
                    color: '#170e5e',
                    border: '1px solid #d8e0fc',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {cartItems.length === totalQuantity ? formatArabicItems(cartItems.length) : `${cartItems.length} صنف • ${totalQuantity} قطعة`}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {cartItems.length === totalQuantity ? `${cartItems.length} صنف مختلف في السلة` : `${cartItems.length} صنف مختلف بإجمالي ${totalQuantity} قطعة`}
              </div>
            </div>
          </div>

          {/* Controls: Clear Cart & Close / Minimize */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="live-cart-ctrl-btn live-cart-clear-btn"
              onClick={() => {
                if (window.confirm('هل تود تفريغ سلة المشتريات بالكامل؟')) {
                  onClearCart();
                }
              }}
              title="تفريغ السلة بالكامل"
            >
              🗑️
            </button>

            <button
              type="button"
              className="live-cart-ctrl-btn live-cart-close-btn"
              onClick={onClose}
              title="تصغير ومتابعة التسوق"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Items List */}
        <div
          className="live-cart-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
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
            padding: '14px 18px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
            <span>قيمة الأصناف ({cartItems.length === totalQuantity ? formatArabicItems(cartItems.length) : `${cartItems.length} صنف • ${totalQuantity} قطعة`}):</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{subtotal.toFixed(0)} ج.م</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
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
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '12px',
                color: '#c2410c',
                fontWeight: 700,
                marginTop: '4px',
                textAlign: 'center',
              }}
            >
              ⚠️ الحد الأدنى للطلب هو {minOrder} ج (متبقي {(minOrder - subtotal).toFixed(0)} ج)
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '8px',
              marginTop: '4px',
              borderTop: '1.5px dashed #cbd5e1',
              fontSize: '15px',
              fontWeight: 800,
              color: '#0f172a',
            }}
          >
            <span>المبلغ الإجمالي:</span>
            <span style={{ fontSize: '18px', color: '#166534' }}>{total.toFixed(0)} ج.م</span>
          </div>
        </div>

        {/* Action Buttons: Checkout CTA + Continue Shopping */}
        <div style={{ padding: '14px 18px', background: '#ffffff', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="storefront-checkout-btn"
            onClick={onProceedToCheckout}
            disabled={!isMinOrderMet}
            style={{
              width: '100%',
              padding: '13px 18px',
              borderRadius: '12px',
              background: isMinOrderMet ? '#170e5e' : '#94a3b8',
              color: '#ffffff',
              border: 'none',
              fontSize: '14px',
              fontWeight: 800,
              cursor: isMinOrderMet ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isMinOrderMet ? '0 4px 14px rgba(23, 14, 94, 0.28)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>إتمام الطلب الآن ({total.toFixed(0)} ج.م)</span>
            <span
              className="storefront-checkout-arrow"
              style={{
                fontSize: '16px',
                display: 'inline-block',
                transition: 'transform 0.2s ease',
              }}
            >
              ←
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            متابعة التسوق ومواصلة اختيار المنتجات
          </button>
        </div>
      </div>
    </div>
  );
}
