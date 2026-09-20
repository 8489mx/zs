import { useState, useEffect } from 'react';
import { StorefrontProduct, StorefrontInfo } from '../types/storefront.types';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import {
  XIcon,
  PlusIcon,
  Share2Icon,
  CheckIcon,
  ShoppingBagIcon,
  TruckIcon,
  ClockIcon,
  TagIcon,
  CheckCircleIcon,
} from '@/shared/components/icons/AppIcons';
import { IconStar, IconFlame } from './StorefrontIcons';
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
  const [activePhoto, setActivePhoto] = useState('');
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);

  useEffect(() => {
    if (product) {
      setQty(1);
      setCopied(false);
      setAddedAnimation(false);
      const gallery = (product as any).gallery || [];
      setActivePhoto(gallery[0] || product.imageUrl || '');
      const variants = (product as any).variants || [];
      setSelectedVariantIndex(variants.length > 0 ? 0 : null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const brandColor = info?.brandColor || '#170e5e';
  const inStock = product.inStock !== false;
  const isLowStock = inStock && product.stockQty > 0 && product.stockQty <= 5;

  const gallery: string[] = (product as any).gallery && (product as any).gallery.length > 0
    ? (product as any).gallery
    : (product.imageUrl ? [product.imageUrl] : []);

  const variants: Array<{ name: string; price?: number; extraPrice?: number }> = (product as any).variants || [];
  const selectedVariant = selectedVariantIndex !== null ? variants[selectedVariantIndex] : null;

  const basePrice = selectedVariant?.price !== undefined
    ? Number(selectedVariant.price)
    : (product.price + (selectedVariant?.extraPrice ? Number(selectedVariant.extraPrice) : 0));

  const effectiveSlug = tenantSlug || slug;
  /*
   * رابط المنتج القابل للمشاركة.
   *
   * كان `#product-<id>` — جزء Hash لا يصل إلى الخادم إطلاقاً، فلا تراه زواحف
   * واتساب/فيسبوك ولا جوجل، وبالتالي لا بطاقة معاينة ولا فهرسة. صار مساراً
   * حقيقياً `/p/:id` يقرؤه الخادم ويرد عليه بوسوم OG.
   */
  const productUrl = `${window.location.origin}${effectiveSlug ? `/store/${effectiveSlug}` : window.location.pathname.replace(/\/p\/\d+$/, '')}/p/${product.id}`;

  const handleShareWhatsApp = () => {
    const text = `شاهد هذا المنتج في ${info?.title || 'متجرنا'}:\n*${product.name}*\nالسعر: ${basePrice} ${info?.currency || 'ج.م'}\n${productUrl}`;
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
    const finalProduct = {
      ...product,
      price: basePrice,
      name: selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name,
    };

    onAddToCart(finalProduct, qty);
    setAddedAnimation(true);
    trackStorefrontEvent('AddToCart', {
      contentName: finalProduct.name,
      contentId: product.id,
      value: basePrice * qty,
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
        backdropFilter: 'blur(5px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Category and Close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#170e5e',
                background: '#f0f3ff',
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid #d8e0fc',
              }}
            >
              {product.categoryName || 'تفاصيل الصنف'}
            </span>
            {product.rating && product.rating >= 4.5 && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: '#b45309',
                  background: '#fef3c7',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                <IconStar size={12} fill="#f59e0b" color="#f59e0b" />
                <span>{Number(product.rating).toFixed(1)}</span>
                {product.reviewCount ? (
                  <span style={{ color: '#92400e', fontSize: '10px' }}>({product.reviewCount} تقييم)</span>
                ) : null}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Main Product Image & Multi-photo Gallery */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                width: '100%',
                height: '280px',
                borderRadius: '14px',
                overflow: 'hidden',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {activePhoto ? (
                <img
                  src={activePhoto}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '36px', fontWeight: 800 }}>
                  {product.icon || product.name.charAt(0)}
                </div>
              )}

              {/* Urgency Badge overlay on image */}
              {isLowStock && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  <IconFlame size={13} color="#ffffff" strokeWidth={2.2} />
                  <span>متبقي {product.stockQty} قطع فقط!</span>
                </div>
              )}
            </div>

            {/* Gallery Thumbnails (if multiple images) */}
            {gallery.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {gallery.map((imgUrl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhoto(imgUrl)}
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '8px',
                      border: activePhoto === imgUrl ? '2px solid #170e5e' : '1px solid #e2e8f0',
                      padding: '2px',
                      background: '#ffffff',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      flexShrink: 0,
                      boxShadow: activePhoto === imgUrl ? '0 2px 8px rgba(23, 14, 94, 0.2)' : 'none',
                    }}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Title, Barcode & Price */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0', lineHeight: 1.35 }}>
                {product.name}
              </h2>
              {product.barcode && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    fontFamily: 'monospace',
                    flexShrink: 0,
                  }}
                >
                  {product.barcode}
                </span>
              )}
            </div>

            {/* Price & Stock status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '26px', fontWeight: 900, color: brandColor, letterSpacing: '-0.5px' }}>
                  {basePrice.toLocaleString()}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748b' }}>
                  <CurrencySymbol />
                </span>
              </div>

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: inStock ? '#dcfce7' : '#fee2e2',
                  color: inStock ? '#15803d' : '#b91c1c',
                  border: inStock ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {inStock ? <CheckCircleIcon size={13} color="#16a34a" /> : null}
                <span>{inStock ? (product.stockQty >= 999 ? 'متوفر للطلب الفوري' : `متوفر بالمخزون (${product.stockQty})`) : 'غير متوفر حالياً'}</span>
              </span>
            </div>

            {/* Product Variants (e.g. Size / Options) */}
            {variants.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TagIcon size={13} color="#170e5e" />
                  <span>اختر المقاس / الحجم:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {variants.map((v, idx) => {
                    const isSelected = selectedVariantIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedVariantIndex(idx)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #170e5e' : '1px solid #cbd5e1',
                          background: isSelected ? '#170e5e' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#1e293b',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{v.name}</span>
                        {v.price && <span>({Number(v.price).toLocaleString()} ج)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div
                style={{
                  marginTop: '14px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#334155',
                  textAlign: 'justify',
                  textJustify: 'inter-word',
                  backgroundColor: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9',
                }}
              >
                {product.description}
              </div>
            )}
          </div>

          {/* Social Proof & Delivery Highlights */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TruckIcon size={14} color="#170e5e" />
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                توصيل سريع حتى باب منزلك
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockIcon size={14} color="#b45309" />
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                تجهيز فوري طازج عند الطلب
              </span>
            </div>
          </div>

          {/* Share Product Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>مشاركة الصنف:</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
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
                <span>واتساب</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
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
                <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
            </div>
          </div>

          {/* Action Row: Quantity + Add to Cart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            {/* Quantity Stepper */}
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
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: qty <= 1 || !inStock ? 'not-allowed' : 'pointer',
                  opacity: qty <= 1 ? 0.4 : 1,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  fontWeight: 800,
                  fontSize: '16px',
                }}
              >
                -
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
                disabled={!inStock || (product.stockQty > 0 && product.stockQty < 999 && qty >= product.stockQty)}
                onClick={() => setQty((prev) => prev + 1)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: !inStock || (product.stockQty > 0 && product.stockQty < 999 && qty >= product.stockQty) ? 'not-allowed' : 'pointer',
                  opacity: product.stockQty > 0 && product.stockQty < 999 && qty >= product.stockQty ? 0.4 : 1,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <PlusIcon size={16} color="#0f172a" />
              </button>
            </div>

            {/* Add to Cart CTA */}
            <button
              type="button"
              disabled={!inStock}
              onClick={handleAdd}
              style={{
                flex: 1,
                height: '48px',
                borderRadius: '10px',
                backgroundColor: inStock ? brandColor : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 800,
                cursor: inStock ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: inStock ? '0 4px 14px rgba(23, 14, 94, 0.25)' : 'none',
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
                  <span>إضافة إلى السلة ({(basePrice * qty).toLocaleString()} <CurrencySymbol />)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
