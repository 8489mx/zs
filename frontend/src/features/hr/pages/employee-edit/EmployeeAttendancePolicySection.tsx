import { useTranslation } from 'react-i18next';
import React from 'react';
import { CustomSelect } from '@/shared/ui/custom-select';
import type { EmployeeEditDraft } from './employee-edit.helpers';

interface EmployeeAttendancePolicySectionProps {
  draft: EmployeeEditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EmployeeEditDraft>>;
}

export const EmployeeAttendancePolicySection: React.FC<EmployeeAttendancePolicySectionProps> = ({
  draft,
  setDraft,
}) => {
  const { t } = useTranslation();
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>{t('hr.employee_edit.employee_attendance_policy_section.s0', "مواعيد الدوام وسياسات الحضور")}</span>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_attendance_policy_section.s1', "موعد الحضور")}</label>
          <input
            type="time"
            value={draft.scheduledCheckInTime}
            onChange={(e) => setDraft((current) => ({ ...current, scheduledCheckInTime: e.target.value }))}
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_attendance_policy_section.s2', "موعد الانصراف")}</label>
          <input
            type="time"
            value={draft.scheduledCheckOutTime}
            onChange={(e) => setDraft((current) => ({ ...current, scheduledCheckOutTime: e.target.value }))}
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_attendance_policy_section.s3', "فترة السماح (دقائق)")}</label>
          <input
            inputMode="numeric"
            value={draft.graceMinutes}
            onChange={(e) => setDraft((current) => ({ ...current, graceMinutes: e.target.value }))}
            placeholder="15"
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_attendance_policy_section.s4', "رصيد الإجازات السنوي")}</label>
          <input
            inputMode="numeric"
            value={draft.annualLeaveBalance}
            onChange={(e) => setDraft((current) => ({ ...current, annualLeaveBalance: e.target.value }))}
            placeholder="21"
            style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_attendance_policy_section.s5', "سياسة التأخير")}</label>
          <CustomSelect
            value={draft.delayPolicy}
            onChange={(val) => setDraft((current) => ({ ...current, delayPolicy: val }))}
            options={[
              { value: 'inherit', label: t('hr.employee_edit.employee_attendance_policy_section.s6', "حسب سياسة المؤسسة") },
              { value: 'standard', label: t('hr.employee_edit.employee_attendance_policy_section.s7', "قياسي (دقائق)") },
              { value: 'progressive', label: t('hr.employee_edit.employee_attendance_policy_section.s8', "تصاعدي") },
              { value: 'strict', label: t('hr.employee_edit.employee_attendance_policy_section.s9', "صارم") },
              { value: 'disabled', label: t('hr.employee_edit.employee_attendance_policy_section.s10', "معطل") },
            ]}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_edit.employee_attendance_policy_section.s11', "سياسة الإضافي")}</label>
          <CustomSelect
            value={draft.overtimePolicy}
            onChange={(val) => setDraft((current) => ({ ...current, overtimePolicy: val as any }))}
            options={[
              { value: 'review_only', label: t('hr.employee_edit.employee_attendance_policy_section.s12', "مراجعة واعتماد") },
              { value: 'auto_approved', label: t('hr.employee_edit.employee_attendance_policy_section.s13', "اعتماد تلقائي") },
              { value: 'disabled', label: t('hr.employee_edit.employee_attendance_policy_section.s14', "معطل") },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
