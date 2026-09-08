import React from 'react';
import { CustomSelect } from '@/shared/ui/custom-select';
import type { EmployeeEditDraft } from './employee-edit.helpers';

interface EmployeePersonalInfoSectionProps {
  draft: EmployeeEditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EmployeeEditDraft>>;
}

export const EmployeePersonalInfoSection: React.FC<EmployeePersonalInfoSectionProps> = ({
  draft,
  setDraft,
}) => {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>البيانات الأساسية والتعريف (إجباري)</span>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>كود الموظف</label>
          <input
            value={draft.employeeNo}
            onChange={(e) => setDraft((current) => ({ ...current, employeeNo: e.target.value }))}
            placeholder="كود الموظف"
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الاسم الأول <span style={{ color: '#dc2626' }}>*</span></label>
          <input
            value={draft.firstName}
            onChange={(e) => setDraft((current) => ({ ...current, firstName: e.target.value }))}
            required
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>اسم العائلة</label>
          <input
            value={draft.lastName}
            onChange={(e) => setDraft((current) => ({ ...current, lastName: e.target.value }))}
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الموبايل <span style={{ color: '#dc2626' }}>*</span></label>
          <input
            value={draft.mobile}
            onChange={(e) => setDraft((current) => ({ ...current, mobile: e.target.value }))}
            placeholder="01xxxxxxxxx"
            inputMode="tel"
            dir="ltr"
            required
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', textAlign: 'right', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>تاريخ التعيين <span style={{ color: '#dc2626' }}>*</span></label>
          <input
            type="date"
            value={draft.hireDate}
            onChange={(e) => setDraft((current) => ({ ...current, hireDate: e.target.value }))}
            required
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>حالة الموظف</label>
          <CustomSelect
            value={draft.status}
            onChange={(val) => setDraft((current) => ({ ...current, status: val === 'inactive' ? 'inactive' : 'active' }))}
            options={[
              { value: 'active', label: 'نشط' },
              { value: 'inactive', label: 'غير نشط' },
            ]}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الرقم القومي (14 رقم)</label>
          <input
            value={draft.nationalId}
            onChange={(e) => setDraft((current) => ({ ...current, nationalId: e.target.value }))}
            placeholder="اختياري - 14 رقم"
            inputMode="numeric"
            maxLength={14}
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
      </div>
    </div>
  );
};
