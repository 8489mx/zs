import React, { useState, useMemo } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { VanStockItem } from '../api/van-sales.api';
import {
  PlusIcon,
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
  originalPrice?: number;
  offerBadge?: string;
  unitName?: string;
  unitMultiplier?: number;
  isBonus?: boolean;
  bonusReason?: string;
  availableUnits?: { id: number; name: string; multiplier: number; isBase: boolean }[];
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
  onToggleBonus?: (productId: number) => void;
  onChangeUnit?: (productId: number, unitName: string, multiplier: number) => void;
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
  onToggleBonus,
  onChangeUnit,
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

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, it) => {
      const orig = it.originalPrice && it.originalPrice > it.unitPrice ? it.originalPrice : it.unitPrice;
      return sum + it.qty * orig;
    }, 0);
  }, [cart]);

  const cartDiscount = useMemo(() => {
    return Math.max(0, cartSubtotal - cartTotal);
  }, [cartSubtotal, cartTotal]);

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
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '6px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
          إصدار فاتورة بيع ميداني للعميل
        </h3>
        {onGoToSalesHistory && (
          <button
            type="button"
            onClick={onGoToSalesHistory}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#170e5e',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="الانتقال لسجل الفواتير السابقة وإعادة الطباعة"
          >
            <ReceiptIcon size={13} color="#170e5e" />
            <span>سجل الفواتير</span>
          </button>
        )}
      </div>

      {/* Selected Customer Compact Card OR Customer Selection Form */}
      {selectedCustomer ? (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '7px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#166534', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedCustomer.name}
              </span>
              {selectedCustomer.customerCode && (
                <span style={{ fontSize: '10.5px', color: '#15803d', backgroundColor: '#dcfce7', padding: '1px 5px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  #{selectedCustomer.customerCode}
                </span>
              )}
              {selectedCustomer.route && (
                <span style={{ fontSize: '10.5px', color: '#475569', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                  {selectedCustomer.route}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {selectedCustomer.locationUrl && (
                <a
                  href={selectedCustomer.locationUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '10.5px',
                    color: '#0284c7',
                    fontWeight: 700,
                    textDecoration: 'none',
                    backgroundColor: '#e0f2fe',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                  title="فتح الموقع على خرائط جوجل"
                >
                  خريطة ↗
                </a>
              )}
              <button
                type="button"
                onClick={() => onSelectCustomer('')}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '5px',
                  padding: '2px 7px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: '#dc2626',
                  cursor: 'pointer',
                }}
              >
                تغيير العميل
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#374151', flexWrap: 'wrap' }}>
            <span>
              المديونية:{' '}
              <strong style={{ color: selectedCustomer.balance > 0 ? '#b91c1c' : '#059669' }}>
                {selectedCustomer.balance.toFixed(2)} <CurrencySymbol />
              </strong>
            </span>
            {selectedCustomer.creditLimit ? (
              <span>سقف الائتمان: <strong>{selectedCustomer.creditLimit.toFixed(2)} <CurrencySymbol /></strong></span>
            ) : null}
            {selectedCustomer.phone && <span>الهاتف: <strong style={{ color: '#0f172a' }}>{selectedCustomer.phone}</strong></span>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
              اختيار المحل / العميل:
            </label>
            <CustomSelect
              value=""
              onChange={(val) => onSelectCustomer(val ? Number(val) : '')}
              options={[
                { value: '', label: '-- عميل نقدي عام (أو اختر من خط السير) --' },
                ...customers.map((c) => ({
                  value: String(c.id),
                  label: `${c.customerCode ? `[#${c.customerCode}] ` : ''}${c.name}${c.route ? ` (${c.route})` : ''}`,
                  hint: `مديونية: ${c.balance.toFixed(2)}${c.creditLimit ? ` | سقف: ${c.creditLimit.toFixed(2)}` : ''}`,
                })),
              ]}
              placeholder="اختر المحل / العميل من القائمة"
            />
          </div>
          <div>
            <input
              type="text"
              value={newCustomerName}
              onChange={(e) => onNewCustomerNameChange(e.target.value)}
              placeholder="أو اكتب اسم محل جديد (عميل فوري نقدي)..."
              style={{
                width: '100%',
                height: '34px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '0 10px',
                fontSize: '11.5px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* Invoice Products Section */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontWeight: 800, fontSize: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShoppingCartIcon size={14} color="#170e5e" />
            <span>أصناف الفاتورة:</span>
            {cart.length > 0 && (
              <span style={{ fontSize: '10.5px', backgroundColor: '#eef2ff', color: '#170e5e', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                {cart.length} أصناف ({totalPieces} قطعة)
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={onGoToInventory}
            style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            title="الانتقال لتبويب جرد ومناقلات السيارة"
          >
            صفحة الجرد ↗
          </button>
        </div>

        {/* Unified Search & Quick Browse Bar (Height 34px) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <CustomSelect
              value=""
              onChange={handleQuickSelectProduct}
              options={inventorySelectOptions}
              placeholder="ابحث وأضف صنفاً من السيارة سريعاً..."
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsPickerOpen(true)}
            style={{
              height: '34px',
              fontSize: '11.5px',
              color: '#170e5e',
              fontWeight: 800,
              backgroundColor: '#eef2ff',
              border: '1px solid #c7d2fe',
              padding: '0 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <PackageIcon size={13} color="#170e5e" />
            <span>تصفح السيارة ({availableInventory.length})</span>
          </Button>
        </div>

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 10px', color: '#94a3b8', fontSize: '12px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>السلة فارغة - أضف أصناف الفاتورة للبدء</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPickerOpen(true)}
              style={{ fontSize: '11.5px', fontWeight: 800, color: '#170e5e', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', padding: '5px 12px', borderRadius: '6px' }}
            >
              <PackageIcon size={13} color="#170e5e" style={{ marginInlineEnd: '4px' }} />
              فتح قائمة بضاعة السيارة للاختيار
            </Button>
          </div>
        ) : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            {cart.map((c) => (
              <div
                key={c.productId}
                style={{
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #f1f5f9',
                  gap: '8px',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h5 style={{ margin: 0, fontWeight: 800, fontSize: '12px', color: '#0f172a', lineHeight: 1.35, paddingBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name}
                  </h5>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {c.isBonus ? (
                      <span style={{ fontSize: '11px', color: '#059669', fontWeight: 800, backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                        بونص ترويجي مجاناً (0.00 <CurrencySymbol />) × {c.qty} {c.unitName || ''}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                        {c.unitPrice.toFixed(2)} × {c.qty} {c.unitName || ''} = {(c.qty * c.unitPrice).toFixed(2)} <CurrencySymbol />
                      </span>
                    )}
                    {c.originalPrice && c.originalPrice > c.unitPrice && !c.isBonus && (
                      <span style={{ fontSize: '10px', color: '#94a3b8', textDecoration: 'line-through' }}>
                        {(c.originalPrice * c.qty).toFixed(2)} <CurrencySymbol />
                      </span>
                    )}
                    {c.offerBadge && (
                      <span style={{ fontSize: '9px', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                        {c.offerBadge}
                      </span>
                    )}
                    {c.availableUnits && c.availableUnits.length > 1 && onChangeUnit && (
                      <select
                        value={c.unitName || c.availableUnits[0].name}
                        onChange={(e) => {
                          const selected = c.availableUnits?.find((u) => u.name === e.target.value);
                          if (selected) {
                            onChangeUnit(c.productId, selected.name, selected.multiplier);
                          }
                        }}
                        style={{
                          fontSize: '10px',
                          padding: '1px 4px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          color: '#1e293b',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        title="اختيار وحدة البيع (كرتونة / قطعة)"
                      >
                        {c.availableUnits.map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.name} {u.multiplier > 1 ? `(${u.multiplier})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {onToggleBonus && (
                      <button
                        type="button"
                        onClick={() => onToggleBonus(c.productId)}
                        style={{
                          fontSize: '9.5px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          border: c.isBonus ? '1px solid #059669' : '1px solid #cbd5e1',
                          backgroundColor: c.isBonus ? '#ecfdf5' : '#ffffff',
                          color: c.isBonus ? '#065f46' : '#64748b',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        title="تحديد الصنف كبونص عيني ترويجي مجاني"
                      >
                        {c.isBonus ? 'بونص' : '+ بونص'}
                      </button>
                    )}
                  </div>
                </div>
                <div dir="rtl" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => onUpdateCartQty(c.productId, 1)}
                    style={{
                      width: '26px',
                      height: '26px',
                      backgroundColor: '#170e5e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="زيادة الكمية"
                  >
                    +
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '12px', width: '22px', textAlign: 'center', color: '#170e5e' }}>
                    {c.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateCartQty(c.productId, -1)}
                    style={{
                      width: '26px',
                      height: '26px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '5px',
                      fontWeight: 800,
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
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
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Cart Quick Summary Strip */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '7px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11.5px',
              color: '#334155',
            }}
          >
            <span>عدد البنود: <strong style={{ color: '#170e5e' }}>{cart.length} أصناف</strong></span>
            <span>إجمالي الكمية: <strong style={{ color: '#170e5e' }}>{totalPieces} قطعة</strong></span>
          </div>

          {/* Promotional Discounts and Subtotal */}
          {cartDiscount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11.5px',
                color: '#64748b',
                padding: '0 4px',
              }}
            >
              <span>المجموع الفرعي (قبل الخصم):</span>
              <span style={{ fontWeight: 700 }}>
                {cartSubtotal.toFixed(2)} <CurrencySymbol />
              </span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: cartDiscount > 0 ? '#b91c1c' : '#475569',
              fontWeight: 700,
              backgroundColor: cartDiscount > 0 ? '#fef2f2' : '#f8fafc',
              padding: '6px 12px',
              borderRadius: '8px',
              border: `1px solid ${cartDiscount > 0 ? '#fecaca' : '#e2e8f0'}`,
            }}
          >
            <span>إجمالي الخصومات والعروض الممنوحة:</span>
            <span style={{ fontWeight: 800 }}>
              {cartDiscount.toFixed(2)} <CurrencySymbol />
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 900, fontSize: '14px', backgroundColor: '#f1f5f9', padding: '9px 12px', borderRadius: '8px' }}>
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
              height: '42px',
              fontSize: '13px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              borderRadius: '8px',
            }}
          >
            <CreditCardIcon size={16} color="#ffffff" />
            <span>{isSubmitting ? 'جاري الحفظ والخصم...' : 'إتمام البيع والسداد'}</span>
          </Button>
        </div>
      )}

      {/* Quick Item Picker Modal - StandardDialog */}
      <StandardDialog
        open={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="بضاعة السيارة المتاحة للبيع"
        subtitle="حدد الكميات المطلوبة لكل صنف للإضافة المباشرة إلى الفاتورة"
        badge={`متاح ${availableInventory.length} صنف`}
        width="min(540px, 95vw)"
        compact={true}
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
              السلة: <strong style={{ color: '#170e5e' }}>{cart.length} {cart.length === 1 ? 'صنف' : cart.length === 2 ? 'صنفان' : cart.length <= 10 ? 'أصناف' : 'صنف'}</strong> ({totalPieces} {totalPieces === 1 ? 'قطعة' : totalPieces === 2 ? 'قطعتان' : totalPieces <= 10 ? 'قطع' : 'قطعة'}) | الإجمالي: <strong style={{ color: '#059669' }}>{cartTotal.toFixed(2)}</strong> <CurrencySymbol />
            </div>
            <Button
              variant="primary"
              onClick={() => setIsPickerOpen(false)}
              style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 800, fontSize: '12px', padding: '7px 16px', borderRadius: '6px' }}
            >
              حفظ والعودة للفاتورة ({cart.length})
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="text"
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder="بحث باسم الصنف أو الكود أو الباركود..."
            style={{
              width: '100%',
              height: '34px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0 10px',
              fontSize: '12px',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ maxHeight: 'min(420px, 62vh)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
            {filteredPickerInventory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8', fontSize: '12px' }}>
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
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: inCartQty > 0 ? '#f0fdf4' : '#ffffff',
                      border: inCartQty > 0 ? '1px solid #86efac' : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#0f172a', lineHeight: 1.35, paddingBottom: '1px' }}>
                          {item.productName}
                        </h4>
                        {inCartQty > 0 && (
                          <span style={{ fontSize: '10px', backgroundColor: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: '4px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            بالسلة: {inCartQty}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669' }}>
                          {item.retailPrice.toFixed(2)} <CurrencySymbol />
                        </span>
                        {item.originalPrice && item.originalPrice > item.retailPrice && (
                          <span style={{ fontSize: '10px', color: '#94a3b8', textDecoration: 'line-through' }}>
                            {item.originalPrice.toFixed(2)} <CurrencySymbol />
                          </span>
                        )}
                        {item.offerBadge && (
                          <span style={{ fontSize: '9px', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                            {item.offerBadge}
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          المتاح: {item.qty} {item.unitName || 'قطعة'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {inCartQty > 0 ? (
                        <div dir="rtl" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                              cursor: isMax ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title={isMax ? 'تم بلوغ أقصى كمية بالسيارة' : 'زيادة صنف'}
                          >
                            <span style={{ fontSize: '15px', fontWeight: 800, lineHeight: 1, color: isMax ? '#94a3b8' : '#ffffff' }}>+</span>
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
                            <span style={{ fontSize: '15px', fontWeight: 800, lineHeight: 1, color: '#0f172a' }}>−</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddToCart?.(item)}
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
