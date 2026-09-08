import React from 'react';
import { IconPrescription, IconCheck } from '../PharmacyIcons';

interface PrescriptionsKpiGridProps {
  totalItems: number;
  totalAmountSum: number;
  totalPatientSum: number;
  totalInsuranceSum: number;
}

export const PrescriptionsKpiGrid: React.FC<PrescriptionsKpiGridProps> = ({
  totalItems,
  totalAmountSum,
  totalPatientSum,
  totalInsuranceSum,
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي الروشتات المصروفة</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{totalItems}</div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
          <IconPrescription size={18} />
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي قيمة الروشتات</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {totalAmountSum.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ج.م</span>
          </div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
          <IconPrescription size={18} />
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تحصيل المرضى (Co-pay)</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
            {totalPatientSum.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ج.م</span>
          </div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
          <IconCheck size={18} />
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>مطالبات شركات التأمين</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary, #1e1b4b)', marginTop: '2px' }}>
            {totalInsuranceSum.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ج.م</span>
          </div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary, #1e1b4b)' }}>
          <IconPrescription size={18} />
        </div>
      </div>
    </div>
  );
};
