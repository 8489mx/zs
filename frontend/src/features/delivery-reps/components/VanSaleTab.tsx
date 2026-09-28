import React, { useState, useMemo } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { VanStockItem } from '../api/van-sales.api';
import {
  PlusIcon,
  MinusIcon,
  PackageIcon,
  ShoppingCartIcon,
  ReceiptIcon,
  CreditCardIcon,
} from '@/shared/components/icons/AppIcons';

export interface CartItem {
  productId: number;
  name: string;
  qty: number;
  unitPrice: number;
  maxQty: number;
}

interface CustomerOption {
  id: number;
  name: string;
  phone?: string;
  balance: number;
  creditLimit?: number;
  customerCode?: string;
  route?: string;
  locationUrl?: string;
}

interface VanSaleTabProps {
  customers: CustomerOption[];
  selectedCustomerId: number | '';
  onSelectCustomer: (val: number | '') => void;
  newCustomerName: string;
  onNewCustomerNameChange: (val: string) => void;
  paymentMethod?: 'cash' | 'credit' | 'card' | 'split';
  onPaymentMethodChange?: (val: any) => void;
  cart: CartItem[];
  onUpdateCartQty: (productId: number, delta: number) => void;
  cartTotal: number;
  onGoToInventory: () => void;
  onSubmitSale: () => void;
  isSubmitting: boolean;
  inventory?: VanStockItem[];
  onAddToCart?: (item: VanStockItem) => void;
  deliveryProofPhoto?: string;
  onDeliveryProofPhotoChange?: (photo: string) => void;
  cartonsCount?: string;
  onCartonsCountChange?: (count: string) => void;
  onGoToSalesHistory?: () => void;
}

export const VanSaleTab: React.FC<VanSaleTabProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  newCustomerName,
  onNewCustomerNameChange,
  paymentMethod: _paymentMethod,
  onPaymentMethodChange: _onPaymentMethodChange,
  cart,
  onUpdateCartQty,
  cartTotal,
  onGoToInventory,
  onSubmitSale,
  isSubmitting,
  inventory = [],
  onAddToCart,
  deliveryProofPhoto: _deliveryProofPhoto = '',
  onDeliveryProofPhotoChange: _onDeliveryProofPhotoChange,
  cartonsCount: _cartonsCount = '',
  onCartonsCountChange: _onCartonsCountChange,
  onGoToSalesHistory,
}) => {
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const totalPieces = cart.reduce((sum, it) => sum + it.qty, 0);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const availableInventory = useMemo(() => {
    return inventory.filter((item) => item.qty > 0);
  }, [inventory]);

  const filteredPickerInventory = useMemo(() => {
    if (!pickerSearch.trim()) return availableInventory;
    const q = pickerSearch.toLowerCase();
    return availableInventory.filter(
      (item) => item.productName.toLowerCase().includes(q) || item.barcode.toLowerCase().includes(q),
    );
  }, [availableInventory, pickerSearch]);

  const inventorySelectOptions = useMemo(() => {
    return [
      { value: '', label: '-- إضافة سريعة لصنف من بضاعة السيارة مباشرة --' },
      ...availableInventory.map((item) => {
        const inCart = cart.find((c) => c.productId === item.productId);
        const remaining = item.qty - (inCart ? inCart.qty : 0);
        return {
          value: String(item.productId),
          label: `${item.productName} (المتبقي بالسيارة: ${remaining}) - ${item.retailPrice.toFixed(2)} ج.م`,
          hint: item.barcode ? `باركود: ${item.barcode}` : undefined,
        };
      }),
    ];
  }, [availableInventory, cart]);

  const handleQuickSelectProduct = (val: string) => {
    if (!val) return;
    const item = availableInventory.find((p) => p.productId === Number(val));
    if (item && onAddToCart) {
      onAddToCart(item);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '8px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
          إصدار فاتورة بيع ميداني للعميل
        </h3>
        {onGoToSalesHistory && (
          <button
            type="button"
            onClick={onGoToSalesHistory}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#170e5e',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="الانتقال لسجل الفواتير السابقة وإعادة الطباعة"
          >
            <ReceiptIcon size={14} color="#170e5e" />
            <span>سجل الفواتير وإعادة الطباعة</span>
          </button>
        )}
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>اختيار المحل / العميل:</label>
        <CustomSelect
          value={selectedCustomerId ? String(selectedCustomerId) : ''}
          onChange={(val) => onSelectCustomer(val ? Number(val) : '')}
          options={[
            { value: '', label: '-- عميل نقدي عام (أو اختر من خط السير) --' },
            ...customers.map((c) => ({
              value: String(c.id),
              label: `${c.customerCode ? `[#${c.customerCode}] ` : ''}${c.name}${c.route ? ` (${c.route})` : ''}`,
              hint: `مديونية: ${c.balance.toFixed(2)}${c.creditLimit ? ` | سقف: ${c.creditLimit.toFixed(2)}` : ''}`,
            })),
          ]}
          placeholder="اختر المحل / العميل"
        />
        {selectedCustomer && (
          <div
            style={{
              marginTop: '8px',
              padding: '10px 12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                  {selectedCustomer.name}
                </span>
                {selectedCustomer.customerCode && (
                  <span style={{ fontSize: '11px', color: '#15803d', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    #{selectedCustomer.customerCode}
                  </span>
                )}
                {selectedCustomer.route && (
                  <span style={{ fontSize: '11px', color: '#475569', backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                    {selectedCustomer.route}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '11.5px', color: '#374151', flexWrap: 'wrap' }}>
                <span>المديونية: <strong style={{ color: selectedCustomer.balance > 0 ? '#b91c1c' : '#059669' }}>{selectedCustomer.balance.toFixed(2)} ج.م</strong></span>
                {selectedCustomer.creditLimit ? (
                  <span>سقف الائتمان: <strong>{selectedCustomer.creditLimit.toFixed(2)} ج.م</strong></span>
                ) : null}
                {selectedCustomer.phone && <span>الهاتف: {selectedCustomer.phone}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedCustomer.locationUrl && (
                <a
                  href={selectedCustomer.locationUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '11.5px',
                    color: '#0284c7',
                    textDecoration: 'underline',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  موقع المحل على الخرائط ↗
                </a>
              )}
              <button
                type="button"
                onClick={() => onSelectCustomer('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  textDecoration: 'underline',
                }}
              >
                إلغاء التحديد
              </button>
            </div>
          </div>
        )}
      </div>

      {!selectedCustomerId && (
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>أو كتابة اسم محل جديد:</label>
          <input
            type="text"
            value={newCustomerName}
            onChange={(e) => onNewCustomerNameChange(e.target.value)}
            placeholder="مثال: سوبرماركت البركة - شارع التحرير"
            style={{ width: '100%', height: '40px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', fontSize: '12px', boxSizing: 'border-box' }}
          />
        </div>
      )}


      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontWeight: 800, fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingCartIcon size={16} color="#170e5e" />
            الأصناف المحددة للبيع:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPickerOpen(true)}
              style={{
                fontSize: '11.5px',
                color: '#170e5e',
                fontWeight: 800,
                backgroundColor: '#eef2ff',
                border: '1px solid #c7d2fe',
                padding: '5px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <PackageIcon size={14} color="#170e5e" />
              <span>+ تصفح واختيار من السيارة</span>
            </Button>
            <button
              type="button"
              onClick={onGoToInventory}
              style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              title="الانتقال لتبويب جرد ومناقلات السيارة"
            >
              صفحة الجرد
            </button>
          </div>
        </div>

        {availableInventory.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <CustomSelect
              value=""
              onChange={handleQuickSelectProduct}
              options={inventorySelectOptions}
              placeholder="اختر صنفاً للإضافة الفورية للفاتورة مباشرة..."
            />
          </div>
        )}

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8', fontSize: '12px', border: '1px dashed #cbd5e1', borderRadius: '10px' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>السلة فارغة حالياً</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPickerOpen(true)}
              style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', padding: '6px 14px', borderRadius: '8px' }}
            >
              <PackageIcon size={14} color="#170e5e" style={{ marginInlineEnd: '6px' }} />
              فتح قائمة بضاعة السيارة للاختيار
            </Button>
          </div>
        ) : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            {cart.map((c) => (
              <div
                key={c.productId}
                style={{
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <h5 style={{ margin: 0, fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>{c.name}</h5>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {c.unitPrice.toFixed(2)} × {c.qty} = {(c.qty * c.unitPrice).toFixed(2)} <CurrencySymbol />
                  </span>
                </div>
                <div dir="rtl" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onUpdateCartQty(c.productId, 1)}
                    style={{ width: '28px', height: '28px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
                    title="زيادة الكمية"
                  >
                    +
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '12px', width: '24px', textAlign: 'center' }}>{c.qty}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateCartQty(c.productId, -1)}
                    style={{ width: '28px', height: '28px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
                    title="إنقاص الكمية"
                  >
                    -
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Cart Quick Summary Strip */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12.5px',
              color: '#334155',
            }}
          >
            <span>عدد البنود: <strong style={{ color: '#170e5e' }}>{cart.length} أصناف</strong></span>
            <span>إجمالي الكمية: <strong style={{ color: '#170e5e' }}>{totalPieces} قطعة</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 900, fontSize: '15px', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '10px' }}>
            <span>إجمالي الفاتورة المطلوب:</span>
            <span style={{ color: '#059669' }}>{cartTotal.toFixed(2)} <CurrencySymbol /></span>
          </div>

          <Button
            variant="primary"
            onClick={onSubmitSale}
            disabled={isSubmitting}
            style={{
              backgroundColor: '#170e5e',
              color: '#ffffff',
              height: '46px',
              fontSize: '13.5px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <CreditCardIcon size={18} color="#ffffff" />
            <span>{isSubmitting ? 'جاري الحفظ والخصم...' : 'إتمام البيع والسداد'}</span>
          </Button>
        </div>
      )}

      {/* Quick Item Picker Modal - StandardDialog */}
      <StandardDialog
        open={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="اختيار أصناف من بضاعة السيارة"
        subtitle="حدد الكميات المطلوبة للإضافة مباشرة إلى الفاتورة دون مغادرة الشاشة"
        width="min(560px, 95vw)"
        minHeight="480px"
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
              السلة: <strong style={{ color: '#170e5e' }}>{cart.length} أصناف</strong> ({totalPieces} قطعة) | الإجمالي: <strong style={{ color: '#059669' }}>{cartTotal.toFixed(2)}</strong> <CurrencySymbol />
            </div>
            <Button
              variant="primary"
              onClick={() => setIsPickerOpen(false)}
              style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 800, fontSize: '12.5px' }}
            >
              حفظ والعودة للفاتورة ({cart.length})
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder="بحث في بضاعة السيارة بالاسم أو الباركود..."
            style={{
              width: '100%',
              height: '38px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0 12px',
              fontSize: '12.5px',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
            {filteredPickerInventory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '12px' }}>
                لا توجد أصناف مطابقة في بضاعة السيارة الحالية
              </div>
            ) : (
              filteredPickerInventory.map((item) => {
                const inCartItem = cart.find((c) => c.productId === item.productId);
                const inCartQty = inCartItem ? inCartItem.qty : 0;
                const isMax = inCartQty >= item.qty;

                return (
                  <div
                    key={item.productId}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: inCartQty > 0 ? '#f0fdf4' : '#ffffff',
                      border: inCartQty > 0 ? '1px solid #86efac' : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>{item.productName}</h4>
                        {inCartQty > 0 && (
                          <span style={{ fontSize: '10px', backgroundColor: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                            بالسلة: {inCartQty}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                          {item.retailPrice.toFixed(2)} <CurrencySymbol />
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          المتاح بالسيارة: {item.qty} {item.unitName || 'قطعة'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {inCartQty > 0 ? (
                        <div dir="rtl" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            type="button"
                            onClick={() => onAddToCart?.(item)}
                            disabled={isMax}
                            style={{
                              width: '28px',
                              height: '28px',
                              backgroundColor: isMax ? '#f1f5f9' : '#170e5e',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: 800,
                              color: '#ffffff',
                              cursor: isMax ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title={isMax ? 'تم بلوغ أقصى كمية بالسيارة' : 'زيادة صنف'}
                          >
                            <PlusIcon size={13} color={isMax ? '#94a3b8' : '#ffffff'} />
                          </button>
                          <span style={{ fontWeight: 800, fontSize: '12.5px', width: '22px', textAlign: 'center', color: '#170e5e' }}>
                            {inCartQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateCartQty(item.productId, -1)}
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
                            title="إنقاص صنف"
                          >
                            <MinusIcon size={13} color="#0f172a" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddToCart?.(item)}
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
                          <span>إضافة</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </StandardDialog>
    </div>
  );
};
