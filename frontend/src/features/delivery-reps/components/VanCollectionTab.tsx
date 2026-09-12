import React from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { Button } from '@/shared/ui/button';

interface CustomerOption {
  id: number;
  name: string;
  balance: number;
}

interface VanCollectionTabProps {
  customers: CustomerOption[];
  colCustomerId: number | '';
  onColCustomerChange: (val: number | '') => void;
  colAmount: string;
  onColAmountChange: (val: string) => void;
  onSubmitCollection: () => void;
  isSubmitting: boolean;
}

export const VanCollectionTab: React.FC<VanCollectionTabProps> = ({
  customers,
  colCustomerId,
  onColCustomerChange,
  colAmount,
  onColAmountChange,
  onSubmitCollection,
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
        gap: '12px',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
        تحصيل مديونية سابقة من عميل في الشارع
      </h3>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
          العميل المطلوب تحصيل حسابه:
        </label>
        <select
          value={colCustomerId}
          onChange={(e) => onColCustomerChange(e.target.value ? Number(e.target.value) : '')}
          style={{ width: '100%', height: '40px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', fontSize: '12px', fontWeight: 600 }}
        >
          <option value="">-- اختر العميل --</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} - مديونية حالية: {c.balance.toFixed(2)} <CurrencySymbol />
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
          المبلغ المحصل نقداً (${getGlobalCurrencySymbol()}):
        </label>
        <input
          type="number"
          step="0.01"
          value={colAmount}
          onChange={(e) => onColAmountChange(e.target.value)}
          placeholder="0.00"
          style={{ width: '100%', height: '40px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', fontSize: '13px', fontWeight: 700, boxSizing: 'border-box' }}
        />
      </div>

      <Button
        variant="primary"
        onClick={onSubmitCollection}
        disabled={isSubmitting}
        style={{ backgroundColor: '#059669', color: '#ffffff', height: '44px', fontSize: '13px', fontWeight: 800 }}
      >
        {isSubmitting ? 'جاري قيد السند...' : 'إثبات تحصيل النقدية وتحديث كشف الحساب'}
      </Button>
    </div>
  );
};
