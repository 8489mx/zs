import React from 'react';

interface BinKpiCardsProps {
  totalBinsCount: number;
  totalProductsStored: number;
  totalQuantityStored: number;
}

export const BinKpiCards: React.FC<BinKpiCardsProps> = ({
  totalBinsCount,
  totalProductsStored,
  totalQuantityStored,
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي أماكن التخزين (الأرفف)</div>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#170e5e', marginTop: '6px' }}>{totalBinsCount}</div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>أعين وأرفف مسجلة في النظام</div>
      </div>
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>الأصناف المربوطة بالأرفف</div>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '6px' }}>{totalProductsStored}</div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>صنف مخزن بمكان محدد</div>
      </div>
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي القطع المخزنة بالأرفف</div>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '6px' }}>{totalQuantityStored}</div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>إجمالي الكمية الفعلية داخل الأماكن</div>
      </div>
    </div>
  );
};
