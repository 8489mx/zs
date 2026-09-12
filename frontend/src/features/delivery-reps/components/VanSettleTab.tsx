import React from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { Button } from '@/shared/ui/button';
import { CheckIcon, AlertTriangleIcon, ReceiptIcon } from '@/shared/components/icons/AppIcons';
import { VanActiveTripResponse } from '../api/van-sales.api';

interface VanSettleTabProps {
  tripData: VanActiveTripResponse['trip'];
  countedCash: string;
  onCountedCashChange: (val: string) => void;
  unloadRemaining: boolean;
  onUnloadRemainingChange: (val: boolean) => void;
  onSubmitSettle: () => void;
  isSubmitting: boolean;
}

export const VanSettleTab: React.FC<VanSettleTabProps> = ({
  tripData,
  countedCash,
  onCountedCashChange,
  unloadRemaining,
  onUnloadRemainingChange,
  onSubmitSettle,
  isSubmitting,
}) => {
  const cashCollected = tripData?.cashCollected || 0;
  const countedNum = Number(countedCash);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
        <div style={{ width: '38px', height: '38px', backgroundColor: '#f1f5f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ReceiptIcon size={20} color="#170e5e" strokeWidth={1.8} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>تصفية اليومية وإغلاق رحلة الفان</h3>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>جرد النقدية ومطابقة مبيعات السيارة وتوريد الكاش للمشرف</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '12px', border: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontWeight: 600 }}>
          <span>إجمالي المبيعات المحققة اليوم:</span>
          <span style={{ fontWeight: 800, color: '#0f172a' }}>{tripData?.salesAmount.toFixed(2)} <CurrencySymbol /></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontWeight: 600 }}>
          <span>المبيعات الآجلة على المحلات:</span>
          <span style={{ fontWeight: 800, color: '#d97706' }}>{tripData?.creditSales.toFixed(2)} <CurrencySymbol /></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#065f46', fontWeight: 900, fontSize: '13px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
          <span>النقدية المتوقع تسليمها (كاش):</span>
          <span>{cashCollected.toFixed(2)} <CurrencySymbol /></span>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
          الكاش الفعلي الموجود معك للتوريد (${getGlobalCurrencySymbol()}):
        </label>
        <input
          type="number"
          step="0.01"
          value={countedCash}
          onChange={(e) => onCountedCashChange(e.target.value)}
          placeholder="أدخل المبلغ الفعلي بعد العدّ..."
          style={{ width: '100%', height: '42px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', fontSize: '14px', fontWeight: 800, boxSizing: 'border-box' }}
        />
        {countedCash && (
          <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 700 }}>
            {countedNum === cashCollected ? (
              <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckIcon size={14} color="#059669" strokeWidth={2.5} />
                <span>الكاش مطابق تماماً للعهدة النقدية (لا يوجد عجز).</span>
              </span>
            ) : countedNum < cashCollected ? (
              <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangleIcon size={14} color="#dc2626" strokeWidth={2} />
                <span>يوجد عجز بمبلغ {(cashCollected - countedNum).toFixed(2)} <CurrencySymbol /></span>
              </span>
            ) : (
              <span style={{ color: '#2563eb' }}>
                يوجد زيادة بمبلغ {(countedNum - cashCollected).toFixed(2)} <CurrencySymbol />
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
        <input
          type="checkbox"
          id="unloadCheck"
          checked={unloadRemaining}
          onChange={(e) => onUnloadRemainingChange(e.target.checked)}
          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
        />
        <label htmlFor="unloadCheck" style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a', cursor: 'pointer' }}>
          تفريغ البضاعة المتبقية في السيارة وإعادتها للمستودع الرئيسي تلقائياً
        </label>
      </div>

      <Button
        variant="primary"
        onClick={onSubmitSettle}
        disabled={isSubmitting}
        style={{ backgroundColor: '#170e5e', color: '#ffffff', height: '46px', fontSize: '13.5px', fontWeight: 800 }}
      >
        {isSubmitting ? 'جاري التصفية...' : 'تأكيد التصفية وإغلاق اليومية وتوريد الكاش'}
      </Button>
    </div>
  );
};
