import { useState } from 'react';
import { StorefrontProduct, StorefrontInfo } from '../types/storefront.types';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { XIcon, PlusIcon, Share2Icon, CheckIcon, ShoppingBagIcon } from '@/shared/components/icons/AppIcons';
import { trackStorefrontEvent } from '../lib/storefront-pixel-tracker';

interface StorefrontProductQuickViewModalProps {
  product: StorefrontProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: StorefrontProduct, quantity: number) => void;
  info?: StorefrontInfo;
  tenantSlug?: string;
  slug?: string;
}

export function StorefrontProductQuickViewModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  info,
  tenantSlug,
  slug,
}: StorefrontProductQuickViewModalProps) {
  const [qty, setQty] = useState(1);
  const [copied, setCopied] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);

  if (!isOpen || !product) return null;

  const brandColor = info?.brandColor || '#170e5e';
  const inStock = product.inStock !== false && product.stockQty > 0;

  const effectiveSlug = tenantSlug || slug;
  const productUrl = `${window.location.origin}${effectiveSlug ? `/store/${effectiveSlug}` : window.location.pathname}#product-${product.id}`;

  const handleShareWhatsApp = () => {
    const text = `شاهد هذا المنتج الرائع في ${info?.title || 'متجرنا'}:\n*${product.name}*\nالسعر: ${product.price} ${info?.currency || 'ج.م'}\n${productUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(productUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdd = () => {
    if (!inStock) return;
    onAddToCart(product, qty);
    setAddedAnimation(true);
    trackStorefrontEvent('AddToCart', {
      contentName: product.name,
      contentId: product.id,
      value: product.price * qty,
      currency: info?.currency || 'EGP',
    });
    setTimeout(() => {
      setAddedAnimation(false);
      onClose();
    }, 450);
  };

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
            {product.categoryName || 'تفاصيل الصنف'}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Product Image */}
          <div
            style={{
              width: '100%',
              height: '280px',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '36px', fontWeight: 800 }}>
                {product.icon || product.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                {product.name}
              </h2>
              {product.barcode && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    fontFamily: 'monospace',
                  }}
                >
                  {product.barcode}
                </span>
              )}
            </div>

            {/* Price & Stock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: 900, color: brandColor }}>
                  {product.price.toLocaleString()}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
                  <CurrencySymbol />
                </span>
              </div>

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: inStock ? '#dcfce7' : '#fee2e2',
                  color: inStock ? '#15803d' : '#b91c1c',
                }}
              >
                {inStock ? `متوفر بالمخزون (${product.stockQty})` : 'غير متوفر حالياً'}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <div
                style={{
                  marginTop: '14px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#475569',
                  textAlign: 'justify',
                  textJustify: 'inter-word',
                  backgroundColor: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #f1f5f9',
                }}
              >
                {product.description}
              </div>
            )}
          </div>

          {/* Social Share Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 0',
              borderTop: '1px solid #f1f5f9',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748b' }}>مشاركة الصنف:</span>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#25d366',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              واتساب
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {copied ? <CheckIcon size={14} color="#16a34a" /> : <Share2Icon size={14} />}
              {copied ? 'تم النسخ!' : 'نسخ الرابط'}
            </button>
          </div>

          {/* Actions: Quantity + Add to Cart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
            {/* Quantity Controls */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                padding: '4px',
              }}
            >
              <button
                type="button"
                disabled={qty <= 1 || !inStock}
                onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: qty <= 1 || !inStock ? 'not-allowed' : 'pointer',
                  opacity: qty <= 1 ? 0.4 : 1,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <span
                style={{
                  minWidth: '40px',
                  textAlign: 'center',
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                {qty}
              </span>
              <button
                type="button"
                disabled={!inStock || qty >= product.stockQty}
                onClick={() => setQty((prev) => prev + 1)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: !inStock || qty >= product.stockQty ? 'not-allowed' : 'pointer',
                  opacity: qty >= product.stockQty ? 0.4 : 1,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <PlusIcon size={16} color="#0f172a" />
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              type="button"
              disabled={!inStock}
              onClick={handleAdd}
              style={{
                flex: 1,
                height: '46px',
                borderRadius: '10px',
                backgroundColor: inStock ? brandColor : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                fontSize: '14.5px',
                fontWeight: 800,
                cursor: inStock ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: inStock ? '0 4px 12px rgba(23, 14, 94, 0.25)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {addedAnimation ? (
                <>
                  <CheckIcon size={18} color="#ffffff" />
                  <span>تمت الإضافة بنجاح!</span>
                </>
              ) : (
                <>
                  <ShoppingBagIcon size={18} color="#ffffff" />
                  <span>إضافة إلى السلة ({(product.price * qty).toLocaleString()} <CurrencySymbol />)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
