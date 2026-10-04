import { useState } from 'react';
import { Trash2Icon } from '@/shared/components/icons/AppIcons';
import { CartItem } from '../types/storefront.types';
import { ProductIcon } from '@/shared/components/icons/product-svg-catalog';
import { calculateCartLinePricing } from '../lib/storefront-cart-pricing';
import { resolveProductPhoto } from '../lib/storefront-photo-matcher';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';

interface StorefrontLiveCartItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: number, qty: number) => void;
}

export function StorefrontLiveCartItem({ item, onUpdateQuantity }: StorefrontLiveCartItemProps) {
  const linePricing = calculateCartLinePricing(item.product, item.quantity);
  const lineTotal = linePricing.lineTotal;
  const [imageError, setImageError] = useState(false);

  const photo = item.product.imageUrl || resolveProductPhoto(item.product.name, item.product.categoryName)?.url;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '7px 9px',
        borderRadius: '10px',
        background: '#f8fafc',
        border: '1px solid #f1f5f9',
        transition: 'background 0.15s ease',
      }}
    >
      {/* Product Thumbnail */}
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {photo && !imageError ? (
          <img
            src={photo}
            alt={item.product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImageError(true)}
          />
        ) : (
          <ProductIcon name={item.product.icon || 'box-package'} size={18} color="#170e5e" />
        )}
      </div>

      {/* Product Name & Pricing */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#0f172a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={item.product.name}
        >
          {item.product.name}
        </div>
        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <strong style={{ color: 'var(--storefront-primary-color, #170e5e)', fontWeight: 800 }}>
            {lineTotal.toFixed(0)} <CurrencySymbol />
          </strong>
          {linePricing.savings > 0 && (
            <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '10.5px' }}>
              {linePricing.originalLineTotal.toFixed(0)} <CurrencySymbol />
            </span>
          )}
          {item.quantity > 1 && (
            <span style={{ fontSize: '10px', color: '#64748b', background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
              ({linePricing.unitPrice.toFixed(0)} × {item.quantity})
            </span>
          )}
          {linePricing.savings > 0 && !linePricing.isBogoApplied && (
            <span style={{ fontSize: '10px', color: 'var(--storefront-secondary-color, #d97706)', fontWeight: 700 }}>
              (وفر {linePricing.savings.toFixed(0)} ج)
            </span>
          )}
          {linePricing.isBogoApplied && (
            <span style={{ fontSize: '9px', background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>
              {linePricing.offerBadge}
            </span>
          )}
        </div>
      </div>

      {/* Stepper Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '7px',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdateQuantity(Number(item.product.id), item.quantity + 1);
          }}
          title="زيادة الكمية"
          style={{
            width: '24px',
            height: '24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#170e5e',
            padding: 0,
          }}
        >
          +
        </button>

        <span
          style={{
            minWidth: '20px',
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
          onClick={(e) => {
            e.stopPropagation();
            onUpdateQuantity(Number(item.product.id), item.quantity - 1);
          }}
          title={item.quantity === 1 ? 'حذف من السلة' : 'تقليل الكمية'}
          style={{
            width: '24px',
            height: '24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 'bold',
            color: item.quantity === 1 ? '#ef4444' : '#475569',
            padding: 0,
          }}
        >
          {item.quantity === 1 ? <Trash2Icon size={13} /> : '−'}
        </button>
      </div>
    </div>
  );
}
