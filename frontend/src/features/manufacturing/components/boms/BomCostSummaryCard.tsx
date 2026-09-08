import React from 'react';
import { FormSection } from '@/shared/components/form-section';

interface BomCostSummaryCardProps {
  linesCount: number;
  quantity: number;
  batchTotalCost: number;
  singleUnitTotalCost: number;
}

export const BomCostSummaryCard: React.FC<BomCostSummaryCardProps> = ({
  linesCount,
  quantity,
  batchTotalCost,
  singleUnitTotalCost,
}) => {
  return (
    <FormSection title="ملخص التكلفة">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
          <span>عدد المكونات</span>
          <span>{linesCount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
          <span>كمية الإنتاج</span>
          <span>{quantity}</span>
        </div>
        <div style={{ height: '1px', backgroundColor: '#e5e7eb' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
          <span>إجمالي التكلفة للكمية ({quantity})</span>
          <span>{batchTotalCost.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#059669', fontWeight: '500' }}>
          <span>تكلفة الوحدة الواحدة المنتجة</span>
          <span>{singleUnitTotalCost.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م</span>
        </div>
      </div>
    </FormSection>
  );
};
