import { useEffect } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { CartItem, StorefrontInfo } from '../types/storefront.types';
import { ProductIcon } from '@/shared/components/icons/product-svg-catalog';
import { StorefrontFreeShippingBar } from './StorefrontFreeShippingBar';
import { calculateCartSubtotal, calculateCartLinePricing } from '../lib/storefront-cart-pricing';
import { resolveProductPhoto } from '../lib/storefront-photo-matcher';

interface StorefrontCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  info?: StorefrontInfo;
  deliveryFee?: number;
  minOrder?: number;
  onUpdateQuantity: (productId: number, qty: number) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
}

export function StorefrontCartDrawer({
  isOpen,
  onClose,
  cartItems,
  info,
  deliveryFee: deliveryFeeProp,
  minOrder: minOrderProp,
  onUpdateQuantity,
  onClearCart,
  onProceedToCheckout,
}: StorefrontCartDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cartTotals = calculateCartSubtotal(cartItems);
  const subtotal = cartTotals.subtotal;
  const totalSavings = cartTotals.totalSavings;
  const freeShippingThreshold = info?.freeShippingMinOrder || 500;
  const isFreeShippingQualified = Boolean(info?.freeShippingEnabled && subtotal >= freeShippingThreshold);
  const baseDeliveryFee = deliveryFeeProp ?? info?.deliveryFee ?? 0;
  const deliveryFee = isFreeShippingQualified ? 0 : baseDeliveryFee;
  const minOrder = minOrderProp ?? info?.minOrder ?? 0;
  const total = subtotal + deliveryFee;
  const isMinOrderMet = minOrder <= 0 || subtotal >= minOrder;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-start',
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          background: '#ffffff',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          cursor: 'default',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              سلة المشتريات
            </h2>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                background: '#f1f5f9',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)} منتج
            </span>
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
            <XIcon size={15} />
          </button>
        </div>

        {/* Free Shipping Progress inside Drawer */}
        {info?.freeShippingEnabled && (
          <div style={{ padding: '6px 14px 0' }}>
            <StorefrontFreeShippingBar
              subtotal={subtotal}
              freeShippingEnabled={info.freeShippingEnabled}
              freeShippingMinOrder={info.freeShippingMinOrder}
              currency={info.currency}
              compact
            />
          </div>
        )}

        {/* Drawer Body: Cart Items */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {cartItems.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#94a3b8',
                textAlign: 'center',
                padding: '40px 20px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  color: '#cbd5e1',
                }}
              >
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#334155' }}>
                سلة التسوق فارغة
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                تصفح المنتجات وأضف ما ترغب لطلبك الآن
              </p>
            </div>
          ) : (
            cartItems.map((item) => {
              const photo = item.product.imageUrl || resolveProductPhoto(item.product.name, item.product.categoryName)?.url;
              return (
              <div
                key={item.product.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  background: '#ffffff',
                }}
              >
                {/* Visual */}
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt={item.product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <ProductIcon name={item.product.icon || 'box-package'} size={24} color="#0f172a" />
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.product.name}
                  </h4>
                  {(() => {
                    const linePricing = calculateCartLinePricing(item.product, item.quantity);
                    return (
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {linePricing.lineTotal.toFixed(0)} <CurrencySymbol />
                        </span>
                        {linePricing.savings > 0 && (
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '11px' }}>
                            {linePricing.originalLineTotal.toFixed(0)} <CurrencySymbol />
                          </span>
                        )}
                        {item.quantity > 1 && (
                          <span style={{ fontSize: '10.5px', color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                            ({linePricing.unitPrice.toFixed(0)} × {item.quantity})
                          </span>
                        )}
                        {linePricing.isBogoApplied && (
                          <span style={{ fontSize: '9.5px', background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                            {linePricing.offerBadge}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Stepper Controls */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#f1f5f9',
                    borderRadius: '8px',
                    padding: '2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    title="زيادة الكمية"
                    style={{
                      width: '26px',
                      height: '26px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    +
                  </button>
                  <span
                    style={{
                      minWidth: '22px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#0f172a',
                    }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    title="تقليل الكمية"
                    style={{
                      width: '26px',
                      height: '26px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    -
                  </button>
                </div>
              </div>
            );
          }))}
        </div>

        {/* Drawer Footer: Summary & Checkout Button */}
        {cartItems.length > 0 && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          >
            {/* Min order check warning */}
            {!isMinOrderMet && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#991b1b',
                  marginBottom: '12px',
                  textAlign: 'center',
                }}
              >
                الحد الأدنى للطلب هو {minOrder} <CurrencySymbol /> (متبقي {(minOrder - subtotal).toFixed(0)} ج)
              </div>
            )}

            {/* Calculations Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                <span>مجموع الأصناف:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{subtotal.toFixed(0)} <CurrencySymbol /></span>
              </div>
              {totalSavings > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--storefront-secondary-color, #e11d48)' }}>
                  <span style={{ fontWeight: 700 }}>وفرت من العروض:</span>
                  <span style={{ fontWeight: 800 }}>- {totalSavings.toFixed(0)} <CurrencySymbol /></span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                <span>رسوم التوصيل:</span>
                <span style={{ fontWeight: 600, color: deliveryFee > 0 ? '#0f172a' : '#166534', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  {deliveryFee === 0 && baseDeliveryFee > 0 && (
                    <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '12px' }}>
                      {baseDeliveryFee.toFixed(0)} <CurrencySymbol />
                    </span>
                  )}
                  <span>{deliveryFee > 0 ? `${deliveryFee.toFixed(0)} ${getGlobalCurrencySymbol()}` : 'مجاناً'}</span>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#0f172a',
                  paddingTop: '8px',
                  borderTop: '1px dashed #cbd5e1',
                }}
              >
                <span>المبلغ الإجمالي:</span>
                <span>{total.toFixed(0)} <CurrencySymbol /></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onProceedToCheckout}
                disabled={!isMinOrderMet}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: isMinOrderMet ? 'var(--storefront-primary-color, #170e5e)' : '#94a3b8',
                  color: 'var(--storefront-primary-contrast, #ffffff)',
                  fontSize: '14px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: isMinOrderMet ? 'pointer' : 'not-allowed',
                  boxShadow: isMinOrderMet ? '0 4px 14px var(--storefront-primary-subtle, rgba(0, 0, 0, 0.15))' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                إتمام الطلب الآن ({total.toFixed(0)} ج)
              </button>
              <button
                type="button"
                onClick={onClearCart}
                title="تفريغ السلة"
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                مسح
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
