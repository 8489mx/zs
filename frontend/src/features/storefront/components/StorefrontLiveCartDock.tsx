import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { useState, useEffect, useRef, useMemo } from 'react';
import { CartItem, StorefrontInfo, StorefrontProduct } from '../types/storefront.types';
import { StorefrontLiveCartItem } from './StorefrontLiveCartItem';
import { StorefrontLiveCartPill } from './StorefrontLiveCartPill';
import { Trash2Icon, XIcon, AlertTriangleIcon, TruckIcon, PlusIcon } from '@/shared/components/icons/AppIcons';

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
  suggestedProducts?: StorefrontProduct[];
  onAddToCart?: (product: StorefrontProduct) => void;
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
  suggestedProducts = [],
  onAddToCart,
}: StorefrontLiveCartDockProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const prevItemsCount = useRef(cartItems.length);
  const prevTotalQuantity = useRef(0);

  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = deliveryFeeProp ?? info?.deliveryFee ?? 0;
  const minOrder = minOrderProp ?? info?.minOrder ?? 0;
  const total = subtotal + deliveryFee;
  const isMinOrderMet = minOrder <= 0 || subtotal >= minOrder;

  const freeShippingThreshold = info?.freeShippingMinOrder || 500;
  const isFreeShippingQualified = Boolean(info?.freeShippingEnabled && subtotal >= freeShippingThreshold);
  const freeShippingPercent = info?.freeShippingEnabled
    ? Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))
    : 0;
  const freeShippingRemaining = Math.max(0, freeShippingThreshold - subtotal);

  const cartProductIds = useMemo(() => new Set(cartItems.map((item) => item.product.id)), [cartItems]);
  const crossSellProducts = useMemo(() => {
    return suggestedProducts.filter((p) => !cartProductIds.has(p.id)).slice(0, 4);
  }, [suggestedProducts, cartProductIds]);

  // Auto-restore visibility if items or quantities change
  useEffect(() => {
    if (cartItems.length !== prevItemsCount.current || totalQuantity !== prevTotalQuantity.current) {
      setIsDismissed(false);
      prevItemsCount.current = cartItems.length;
      prevTotalQuantity.current = totalQuantity;
    }
  }, [cartItems.length, totalQuantity]);

  if (cartItems.length === 0 || (isDismissed && !isOpen)) return null;

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
          onDismiss={() => setIsDismissed(true)}
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
          borderRight: `5px solid ${info?.brandColor || '#170e5e'}`,
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
                    color: info?.brandColor || '#170e5e',
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
            {showClearConfirm ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', animation: 'fadeIn 0.15s ease' }}>
                <button
                  type="button"
                  onClick={() => {
                    onClearCart();
                    setShowClearConfirm(false);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  تأكيد التفريغ
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  style={{
                    padding: '4px 6px',
                    borderRadius: '6px',
                    background: '#e2e8f0',
                    color: '#475569',
                    border: 'none',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="live-cart-ctrl-btn live-cart-clear-btn"
                onClick={() => setShowClearConfirm(true)}
                title="تفريغ السلة بالكامل"
              >
                <Trash2Icon size={15} />
              </button>
            )}

            <button
              type="button"
              className="live-cart-ctrl-btn live-cart-close-btn"
              onClick={onClose}
              title="تصغير ومتابعة التسوق"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Interactive Free Shipping Progress Bar */}
        {info?.freeShippingEnabled && (
          <div
            style={{
              padding: '10px 18px',
              background: isFreeShippingQualified ? '#f0fdf4' : '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              transition: 'background 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TruckIcon size={14} color={isFreeShippingQualified ? '#16a34a' : (info?.brandColor || '#170e5e')} />
                {isFreeShippingQualified ? (
                  <span style={{ fontWeight: 800, color: '#15803d' }}>
                    مبروك! حصلت على توصيل مجاني لطلبك!
                  </span>
                ) : (
                  <span style={{ color: '#334155' }}>
                    أضف بـ <strong style={{ color: info?.brandColor || '#170e5e' }}>{freeShippingRemaining.toFixed(0)} <CurrencySymbol /></strong> للشحن المجاني
                  </span>
                )}
              </div>
              <span style={{ fontWeight: 700, color: isFreeShippingQualified ? '#15803d' : '#64748b', fontSize: '11px' }}>
                {freeShippingPercent}%
              </span>
            </div>
            <div
              style={{
                height: '6px',
                width: '100%',
                background: '#e2e8f0',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${freeShippingPercent}%`,
                  background: isFreeShippingQualified ? '#22c55e' : (info?.brandColor || '#170e5e'),
                  borderRadius: '999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

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

        {/* Cross-Sell Recommendations */}
        {crossSellProducts.length > 0 && onAddToCart && (
          <div
            style={{
              padding: '10px 16px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
              قد يعجبك أيضاً (إضافة سريعة للسلة):
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {crossSellProducts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    minWidth: '130px',
                    maxWidth: '150px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>
                    {p.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: info?.brandColor || '#170e5e' }}>
                      {p.price} <CurrencySymbol />
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddToCart(p)}
                      style={{
                        padding: '3px 7px',
                        borderRadius: '6px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <PlusIcon size={12} />
                      <span>إضافة</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{subtotal.toFixed(0)} ${getGlobalCurrencySymbol()}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
            <span>مصاريف التوصيل:</span>
            <span style={{ fontWeight: 700, color: deliveryFee > 0 ? '#0f172a' : '#166534' }}>
              {deliveryFee > 0 ? `${deliveryFee.toFixed(0)} ${getGlobalCurrencySymbol()}` : 'توصيل مجاني'}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangleIcon size={14} color="#c2410c" />
              <span>الحد الأدنى للطلب هو {minOrder} ج (متبقي {(minOrder - subtotal).toFixed(0)} ج)</span>
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
            <span style={{ fontSize: '18px', color: '#166534' }}>{total.toFixed(0)} <CurrencySymbol /></span>
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
              background: isMinOrderMet ? (info?.brandColor || '#170e5e') : '#94a3b8',
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
            <span>إتمام الطلب الآن ({total.toFixed(0)} <CurrencySymbol />)</span>
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
