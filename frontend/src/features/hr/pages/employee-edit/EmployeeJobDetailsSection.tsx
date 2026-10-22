import { useTranslation } from 'react-i18next';
import React from 'react';
import { CustomSelect } from '@/shared/ui/custom-select';
import type { EmployeeEditDraft } from './employee-edit.helpers';

interface EmployeeJobDetailsSectionProps {
  draft: EmployeeEditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EmployeeEditDraft>>;
  departments: Array<{ id: string; name: string }>;
  jobTitles: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
  onQuickCreateMaster?: (kind: 'departments' | 'job-titles' | 'positions', name: string) => void | Promise<void>;
}

export const EmployeeJobDetailsSection: React.FC<EmployeeJobDetailsSectionProps> = ({
  draft,
  setDraft,
  departments,
  jobTitles,
  positions,
  onQuickCreateMaster,
}) => {
  const { t } = useTranslation();
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>{t('hr.employee_edit.employee_job_details_section.s0', "البيانات الوظيفية والتعيين")}</span>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_job_details_section.s1', "القسم")}</label>
          <CustomSelect
            value={draft.departmentId}
            onChange={(val) => setDraft((current) => ({ ...current, departmentId: val }))}
            options={[
              { value: '', label: t('hr.employee_edit.employee_job_details_section.s2', "اختيار") },
              ...departments.map((entry) => ({ value: entry.id, label: entry.name })),
            ]}
            onCreateOption={onQuickCreateMaster ? (name) => onQuickCreateMaster('departments', name) : undefined}
            createOptionLabel={(name) => `+ إضافة قسم جديد: "${name}"`}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_job_details_section.s3', "المسمى الوظيفي")}</label>
          <CustomSelect
            value={draft.jobTitleId}
            onChange={(val) => setDraft((current) => ({ ...current, jobTitleId: val }))}
            options={[
              { value: '', label: t('hr.employee_edit.employee_job_details_section.s4', "اختيار") },
              ...jobTitles.map((entry) => ({ value: entry.id, label: entry.name })),
            ]}
            onCreateOption={onQuickCreateMaster ? (name) => onQuickCreateMaster('job-titles', name) : undefined}
            createOptionLabel={(name) => `+ إضافة مسمى وظيفي جديد: "${name}"`}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_job_details_section.s5', "الوظيفة/المنصب")}</label>
          <CustomSelect
            value={draft.positionId}
            onChange={(val) => setDraft((current) => ({ ...current, positionId: val }))}
            options={[
              { value: '', label: t('hr.employee_edit.employee_job_details_section.s6', "اختيار") },
              ...positions.map((entry) => ({ value: entry.id, label: entry.name })),
            ]}
            onCreateOption={onQuickCreateMaster ? (name) => onQuickCreateMaster('positions', name) : undefined}
            createOptionLabel={(name) => `+ إضافة منصب جديد: "${name}"`}
          />
        </div>
      </div>
    </div>
  );
};
