import React from 'react';
import { AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
import { IconShortage, IconCheck } from '../PharmacyIcons';

interface ShortagesKpiGridProps {
  neededCount: number;
  urgentCount: number;
  customerCount: number;
  receivedCount: number;
}

export const ShortagesKpiGrid: React.FC<ShortagesKpiGridProps> = ({
  neededCount,
  urgentCount,
  customerCount,
  receivedCount,
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>مطلوب إدراجه بالطلبية</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>{neededCount}</div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c' }}>
          <IconShortage size={18} />
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>نواقص عاجلة جداً</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>{urgentCount}</div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c' }}>
          <AlertTriangleIcon size={18} />
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>طلبات خاصة لعملاء</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{customerCount}</div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
          <IconShortage size={18} />
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أصناف تم استلامها</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>{receivedCount}</div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
          <IconCheck size={18} />
        </div>
      </div>
    </div>
  );
};
