import React from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { VanStockItem } from '../api/van-sales.api';
import { ShoppingCartIcon, PlusIcon, PackageIcon, SearchIcon } from '@/shared/components/icons/AppIcons';

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
  onRequestRequisition?: () => void;
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
  onRequestRequisition,
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
          placeholder="بحث باسم الصنف أو الباركود..."
          style={{
            flex: 1,
            height: '36px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0 12px',
            fontSize: '12px',
            boxSizing: 'border-box',
          }}
        />

        {onOpenTransferModal && (
          <button
            type="button"
            onClick={onOpenTransferModal}
            style={{
              height: '36px',
              padding: '0 12px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>مناقلة سيارات</span>
            {pendingTransfersCount > 0 && (
              <span
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '10.5px',
                  fontWeight: 900,
                  borderRadius: '10px',
                  padding: '1px 5px',
                }}
              >
                {pendingTransfersCount}
              </span>
            )}
          </button>
        )}
      </div>

      {filteredInventory.length === 0 ? (
        stockSearch.trim() ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '36px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '13px',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
            >
              <SearchIcon size={22} color="#64748b" />
            </div>
            <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
              لا توجد أصناف مطابقة للبحث
            </h4>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
              لم يتم العثور على أي صنف بالاسم أو الباركود &ldquo;{stockSearch}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => onSearchChange('')}
              style={{
                marginTop: '4px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              مسح البحث
            </button>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '36px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '15px',
                backgroundColor: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#170e5e',
              }}
            >
              <PackageIcon size={26} color="#170e5e" />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                لا توجد بضاعة في سيارة التوزيع حالياً
              </h4>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b', maxWidth: '300px', lineHeight: 1.5 }}>
                يمكنك إنشاء إذن شحن وتحميل بضاعة من المستودع الرئيسي للانطلاق وبدء البيع الميداني
              </p>
            </div>
            {onRequestRequisition && (
              <button
                type="button"
                onClick={onRequestRequisition}
                style={{
                  marginTop: '4px',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(23, 14, 94, 0.2)',
                }}
              >
                <PlusIcon size={14} color="#ffffff" />
                <span>+ طلب تحميل بضاعة من المستودع</span>
              </button>
            )}
          </div>
        )
      ) : (
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
                  <div dir="rtl" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                        cursor: isMaxReached ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={isMaxReached ? 'تم بلوغ أقصى كمية بالسيارة' : 'زيادة صنف في الفاتورة'}
                    >
                      <span style={{ fontSize: '15px', fontWeight: 800, lineHeight: 1, color: isMaxReached ? '#94a3b8' : '#ffffff' }}>+</span>
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
                        backgroundColor: '#ffffff',
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
                      <span style={{ fontSize: '15px', fontWeight: 800, lineHeight: 1, color: '#0f172a' }}>−</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddToCart(item)}
                    disabled={item.qty <= 0}
                    style={{
                      height: '28px',
                      fontSize: '11.5px',
                      backgroundColor: item.qty <= 0 ? '#cbd5e1' : '#170e5e',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: item.qty <= 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
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
    )}

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
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(23, 14, 94, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            border: '1px solid #312e81',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShoppingCartIcon size={18} color="#ffffff" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                الفاتورة: {cart.length} {cart.length === 1 ? 'صنف' : cart.length === 2 ? 'صنفان' : cart.length <= 10 ? 'أصناف' : 'صنف'} ({totalPiecesInCart} {totalPiecesInCart === 1 ? 'قطعة' : totalPiecesInCart === 2 ? 'قطعتان' : totalPiecesInCart <= 10 ? 'قطع' : 'قطعة'})
              </div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#34d399', whiteSpace: 'nowrap', marginTop: '1px' }}>
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
              padding: '7px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span>متابعة الفاتورة</span>
            <span style={{ fontSize: '13px' }}>←</span>
          </button>
        </div>
      )}
    </div>
  );
};
