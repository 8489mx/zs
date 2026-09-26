import React from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { VanStockItem } from '../api/van-sales.api';

interface VanInventoryTabProps {
  stockSearch: string;
  onSearchChange: (value: string) => void;
  filteredInventory: VanStockItem[];
  onAddToCart: (item: VanStockItem) => void;
}

export const VanInventoryTab: React.FC<VanInventoryTabProps> = ({
  stockSearch,
  onSearchChange,
  filteredInventory,
  onAddToCart,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input
        type="text"
        value={stockSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="بحث في بضاعة السيارة بالاسم أو الباركود..."
        style={{
          width: '100%',
          height: '42px',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '0 14px',
          fontSize: '12.5px',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
        {filteredInventory.map((item) => (
          <div
            key={item.productId}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '12px 14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>{item.productName}</h4>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', display: 'block' }}>{item.barcode}</span>
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
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                style={{
                  fontSize: '11.5px',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                + إضافة للفاتورة
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
