import { CartItem } from '../types/storefront.types';
import { ProductIcon } from '@/shared/components/icons/product-svg-catalog';

interface StorefrontLiveCartItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: number, qty: number) => void;
}

export function StorefrontLiveCartItem({ item, onUpdateQuantity }: StorefrontLiveCartItemProps) {
  const lineTotal = item.product.price * item.quantity;

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
        {item.product.imageUrl ? (
          <img
            src={item.product.imageUrl}
            alt={item.product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => (e.currentTarget.style.display = 'none')}
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
        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
          <strong style={{ color: '#166534', fontWeight: 800 }}>
            {lineTotal.toFixed(0)} ج
          </strong>{' '}
          <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
            ({item.product.price.toFixed(0)} × {item.quantity})
          </span>
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
          {item.quantity === 1 ? '🗑' : '−'}
        </button>
      </div>
    </div>
  );
}
