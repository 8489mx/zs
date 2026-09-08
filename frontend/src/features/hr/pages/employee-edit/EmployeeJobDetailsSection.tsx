import React from 'react';
import { CustomSelect } from '@/shared/ui/custom-select';
import type { EmployeeEditDraft } from './employee-edit.helpers';

interface EmployeeJobDetailsSectionProps {
  draft: EmployeeEditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EmployeeEditDraft>>;
  departments: Array<{ id: string; name: string }>;
  jobTitles: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
}

export const EmployeeJobDetailsSection: React.FC<EmployeeJobDetailsSectionProps> = ({
  draft,
  setDraft,
  departments,
  jobTitles,
  positions,
}) => {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>البيانات الوظيفية والتعيين</span>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>القسم</label>
          <CustomSelect
            value={draft.departmentId}
            onChange={(val) => setDraft((current) => ({ ...current, departmentId: val }))}
            options={[
              { value: '', label: 'اختيار' },
              ...departments.map((entry) => ({ value: entry.id, label: entry.name })),
            ]}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>المسمى الوظيفي</label>
          <CustomSelect
            value={draft.jobTitleId}
            onChange={(val) => setDraft((current) => ({ ...current, jobTitleId: val }))}
            options={[
              { value: '', label: 'اختيار' },
              ...jobTitles.map((entry) => ({ value: entry.id, label: entry.name })),
            ]}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الوظيفة/المنصب</label>
          <CustomSelect
            value={draft.positionId}
            onChange={(val) => setDraft((current) => ({ ...current, positionId: val }))}
            options={[
              { value: '', label: 'اختيار' },
              ...positions.map((entry) => ({ value: entry.id, label: entry.name })),
            ]}
          />
        </div>
      </div>
    </div>
  );
};
