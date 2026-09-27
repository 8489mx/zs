import React from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';

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
  paymentMethod: 'cash' | 'credit';
  onPaymentMethodChange: (val: 'cash' | 'credit') => void;
  cart: CartItem[];
  onUpdateCartQty: (productId: number, delta: number) => void;
  cartTotal: number;
  onGoToInventory: () => void;
  onSubmitSale: () => void;
  isSubmitting: boolean;
  deliveryProofPhoto?: string;
  onDeliveryProofPhotoChange?: (photo: string) => void;
  cartonsCount?: string;
  onCartonsCountChange?: (count: string) => void;
}

export const VanSaleTab: React.FC<VanSaleTabProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  newCustomerName,
  onNewCustomerNameChange,
  paymentMethod,
  onPaymentMethodChange,
  cart,
  onUpdateCartQty,
  cartTotal,
  onGoToInventory,
  onSubmitSale,
  isSubmitting,
  deliveryProofPhoto = '',
  onDeliveryProofPhotoChange,
  cartonsCount = '',
  onCartonsCountChange,
}) => {
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const totalPieces = cart.reduce((sum, it) => sum + it.qty, 0);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && onDeliveryProofPhotoChange) {
        onDeliveryProofPhotoChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
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
      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
        إصدار فاتورة بيع ميداني للعميل
      </h3>

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
        {selectedCustomer?.locationUrl && (
          <div style={{ marginTop: '6px' }}>
            <a
              href={selectedCustomer.locationUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '11.5px', color: '#0284c7', textDecoration: 'underline', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              فتح موقع المحل على خرائط جوجل ↗
            </a>
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

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>طريقة الدفع:</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onPaymentMethodChange('cash')}
            style={{
              height: '38px',
              borderRadius: '8px',
              border: paymentMethod === 'cash' ? '1px solid #059669' : '1px solid #e2e8f0',
              backgroundColor: paymentMethod === 'cash' ? '#059669' : '#f8fafc',
              color: paymentMethod === 'cash' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            نقدي (Cash)
          </button>
          <button
            type="button"
            onClick={() => onPaymentMethodChange('credit')}
            style={{
              height: '38px',
              borderRadius: '8px',
              border: paymentMethod === 'credit' ? '1px solid #d97706' : '1px solid #e2e8f0',
              backgroundColor: paymentMethod === 'credit' ? '#d97706' : '#f8fafc',
              color: paymentMethod === 'credit' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            آجل (على الحساب)
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '12px', color: '#1e293b' }}>الأصناف المحددة للبيع:</span>
          <button
            type="button"
            onClick={onGoToInventory}
            style={{ fontSize: '11.5px', color: '#170e5e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            + إضافة أصناف من بضاعة السيارة
          </button>
        </div>

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8', fontSize: '12px', border: '1px dashed #cbd5e1', borderRadius: '10px' }}>
            السلة فارغة. اختر أصنافاً من تبويب "بضاعة السيارة" لإضافتها هنا.
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onUpdateCartQty(c.productId, -1)}
                    style={{ width: '28px', height: '28px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '12px', width: '24px', textAlign: 'center' }}>{c.qty}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateCartQty(c.productId, 1)}
                    style={{ width: '28px', height: '28px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Packaging Breakdown Banner */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span>عدد البنود: <strong style={{ color: '#170e5e' }}>{cart.length}</strong></span>
            <span>إجمالي القطع: <strong style={{ color: '#170e5e' }}>{totalPieces}</strong></span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontWeight: 700, color: '#334155' }}>عدد الكراتين:</label>
              <input
                type="number"
                min="0"
                value={cartonsCount}
                onChange={(e) => onCartonsCountChange?.(e.target.value)}
                placeholder="0"
                style={{ width: '60px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center' }}
              />
            </div>
          </div>

          {/* Delivery Proof Photo */}
          <div
            style={{
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              backgroundColor: '#fafafa',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', display: 'block' }}>
                📷 صورة إثبات تسليم البضاعة للمحل:
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {deliveryProofPhoto ? 'تم التقاط صورة إثبات التسليم' : 'التقط صورة للبضاعة أمام المحل أو إيصال الاستلام'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {deliveryProofPhoto ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img
                    src={deliveryProofPhoto}
                    alt="Proof"
                    style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                  />
                  <button
                    type="button"
                    onClick={() => onDeliveryProofPhotoChange?.('')}
                    style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}
                  >
                    حذف
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    backgroundColor: '#eef2ff',
                    color: '#170e5e',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: '1px solid #c7d2fe',
                  }}
                >
                  التقاط / رفع صورة
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 900, fontSize: '15px', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '10px' }}>
            <span>إجمالي الفاتورة المطلوب:</span>
            <span style={{ color: '#059669' }}>{cartTotal.toFixed(2)} <CurrencySymbol /></span>
          </div>

          <Button
            variant="primary"
            onClick={onSubmitSale}
            disabled={isSubmitting}
            style={{ backgroundColor: '#170e5e', color: '#ffffff', height: '46px', fontSize: '13.5px', fontWeight: 800 }}
          >
            {isSubmitting ? 'جاري الحفظ والخصم...' : 'حفظ وإصدار الفاتورة الميدانية'}
          </Button>
        </div>
      )}
    </div>
  );
};
