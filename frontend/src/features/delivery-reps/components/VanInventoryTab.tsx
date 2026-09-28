import React from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { VanStockItem } from '../api/van-sales.api';
import { ShoppingCartIcon, PlusIcon, MinusIcon } from '@/shared/components/icons/AppIcons';

interface CartItemSummary {
  productId: number;
  qty: number;
}

interface VanInventoryTabProps {
  stockSearch: string;
  onSearchChange: (value: string) => void;
  filteredInventory: VanStockItem[];
  cart?: CartItemSummary[];
  cartTotal?: number;
  onAddToCart: (item: VanStockItem) => void;
  onUpdateCartQty?: (productId: number, delta: number) => void;
  onGoToSale?: () => void;
  onOpenTransferModal?: () => void;
  pendingTransfersCount?: number;
}

export const VanInventoryTab: React.FC<VanInventoryTabProps> = ({
  stockSearch,
  onSearchChange,
  filteredInventory,
  cart = [],
  cartTotal = 0,
  onAddToCart,
  onUpdateCartQty,
  onGoToSale,
  onOpenTransferModal,
  pendingTransfersCount = 0,
}) => {
  const totalPiecesInCart = cart.reduce((sum, it) => sum + it.qty, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          value={stockSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="بحث في بضاعة السيارة بالاسم أو الباركود..."
          style={{
            flex: 1,
            height: '42px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '0 14px',
            fontSize: '12.5px',
            boxSizing: 'border-box',
          }}
        />

        {onOpenTransferModal && (
          <button
            type="button"
            onClick={onOpenTransferModal}
            style={{
              height: '42px',
              padding: '0 14px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>مناقلة سيارات (شارع)</span>
            {pendingTransfersCount > 0 && (
              <span
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 900,
                  borderRadius: '10px',
                  padding: '1px 6px',
                }}
              >
                {pendingTransfersCount}
              </span>
            )}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
        {filteredInventory.map((item) => {
          const inCartItem = cart.find((c) => c.productId === item.productId);
          const inCartQty = inCartItem ? inCartItem.qty : 0;
          const isMaxReached = inCartQty >= item.qty;

          return (
            <div
              key={item.productId}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '12px 14px',
                border: inCartQty > 0 ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>{item.productName}</h4>
                  {inCartQty > 0 && (
                    <span
                      style={{
                        backgroundColor: '#eef2ff',
                        color: '#4338ca',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        border: '1px solid #c7d2fe',
                      }}
                    >
                      مضاف: {inCartQty}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', display: 'block', marginTop: '2px' }}>
                  {item.barcode}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#059669' }}>
                    {item.retailPrice.toFixed(2)} <CurrencySymbol />
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: '#64748b',
                      backgroundColor: '#f1f5f9',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                    title="الكمية المتاحة حالياً في المستودع الرئيسي"
                  >
                    المستودع الرئيسي: {item.mainWarehouseQty ?? 0}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                <span
                  style={{
                    backgroundColor: '#eef2ff',
                    color: '#170e5e',
                    fontWeight: 800,
                    fontSize: '11.5px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #c7d2fe',
                  }}
                  title="الكمية المحملة داخل سيارة التوزيع"
                >
                  السيارة: {item.qty} {item.unitName || 'قطعة'}
                </span>

                {inCartQty > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <button
                      type="button"
                      onClick={() => onAddToCart(item)}
                      disabled={isMaxReached}
                      style={{
                        width: '28px',
                        height: '28px',
                        backgroundColor: isMaxReached ? '#f1f5f9' : '#170e5e',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 800,
                        color: '#ffffff',
                        cursor: isMaxReached ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={isMaxReached ? 'تم بلوغ أقصى كمية بالسيارة' : 'زيادة صنف في الفاتورة'}
                    >
                      <PlusIcon size={13} color={isMaxReached ? '#94a3b8' : '#ffffff'} />
                    </button>
                    <span style={{ fontWeight: 800, fontSize: '12.5px', width: '22px', textAlign: 'center', color: '#170e5e' }}>
                      {inCartQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateCartQty?.(item.productId, -1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="إنقاص صنف من الفاتورة"
                    >
                      <MinusIcon size={13} color="#0f172a" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddToCart(item)}
                    disabled={item.qty <= 0}
                    style={{
                      fontSize: '11.5px',
                      backgroundColor: item.qty <= 0 ? '#cbd5e1' : '#170e5e',
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: item.qty <= 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <PlusIcon size={12} color="#ffffff" />
                    <span>إضافة للفاتورة</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && onGoToSale && (
        <div
          style={{
            position: 'sticky',
            bottom: '10px',
            zIndex: 30,
            marginTop: '12px',
            backgroundColor: '#170e5e',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 8px 24px rgba(23, 14, 94, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            border: '1px solid #312e81',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShoppingCartIcon size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800 }}>
                الفاتورة الحالية: {cart.length} أصناف ({totalPiecesInCart} قطعة)
              </div>
              <div style={{ fontSize: '11.5px', color: '#cbd5e1' }}>
                الإجمالي: {cartTotal.toFixed(2)} <CurrencySymbol />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToSale}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>المتابعة لإصدار الفاتورة</span>
            <span style={{ fontSize: '14px' }}>←</span>
          </button>
        </div>
      )}
    </div>
  );
};
