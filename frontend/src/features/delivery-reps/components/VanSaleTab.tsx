import React from 'react';
import { Button } from '@/shared/ui/button';

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
}) => {
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
        <select
          value={selectedCustomerId}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : '';
            onSelectCustomer(val);
          }}
          style={{ width: '100%', height: '40px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', fontSize: '12px', fontWeight: 600 }}
        >
          <option value="">-- عميل نقدي عام (أو اختر من خط السير) --</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.phone ? `(${c.phone})` : ''} - مديونية: {c.balance.toFixed(2)} ج.م
            </option>
          ))}
        </select>
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
                    {c.unitPrice.toFixed(2)} × {c.qty} = {(c.qty * c.unitPrice).toFixed(2)} ج.م
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 900, fontSize: '15px', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '10px' }}>
            <span>إجمالي الفاتورة المطلوب:</span>
            <span style={{ color: '#059669' }}>{cartTotal.toFixed(2)} ج.م</span>
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
