import { useTranslation } from 'react-i18next';
import React from 'react';
import { Button } from '@/shared/ui/button';
import { employeeName, fallbackText, statusLabel, normalizeText, money } from '@/features/hr/utils/employee-profile.helpers';
import { ContactsSection } from './EmployeeProfileSections';
import type { HrEmployee, HrContact, HrContract } from '@/types/domain';

interface EmployeeDetailsTabProps {
  employee?: HrEmployee;
  nationalIdMasked: string;
  contacts: HrContact[];
  latestContract?: HrContract;
  canViewSalary: boolean;
  canManageEmployees: boolean;
  showContractForm: boolean;
  setShowContractForm: (v: boolean) => void;
  contractDraft: { baseSalary: string; contractType: string };
  setContractDraft: React.Dispatch<React.SetStateAction<{ baseSalary: string; contractType: string }>>;
  handleSaveContract: (e: React.FormEvent) => void;
  isSavingContract: boolean;
}

export function EmployeeDetailsTab({
  employee,
  nationalIdMasked,
  contacts,
  latestContract,
  canViewSalary,
  canManageEmployees,
  showContractForm,
  setShowContractForm,
  contractDraft,
  setContractDraft,
  handleSaveContract,
  isSavingContract,
}: EmployeeDetailsTabProps) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>{t('hr.employee_profile.employee_details_tab.s0', "البيانات الأساسية والوظيفية")}</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s1', "الاسم")}</span><strong style={{ fontSize: '0.85rem' }}>{employeeName(employee)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s2', "كود الموظف")}</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.employeeNo)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s3', "الحالة")}</span><strong style={{ fontSize: '0.85rem' }}>{statusLabel(employee?.status)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s4', "القسم")}</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.departmentName)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s5', "المسمى الوظيفي")}</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.jobTitleName)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s6', "الوظيفة/المنصب")}</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.positionName)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s7', "تاريخ التعيين")}</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.hireDate)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s8', "الرقم القومي")}</span><strong style={{ fontSize: '0.85rem' }}>{nationalIdMasked}</strong></div>
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>{t('hr.employee_profile.employee_details_tab.s9', "بيانات الدوام والأجر")}</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s10', "نوع الأجر")}</span><strong style={{ fontSize: '0.85rem' }}>{normalizeText(employee?.compensationType) === 'hourly' ? t('hr.employee_profile.employee_details_tab.s11', "أجر بالساعة") : t('hr.employee_profile.employee_details_tab.s12', "راتب شهري")}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s13', "أجر الساعة")}</span><strong style={{ fontSize: '0.85rem' }}>{normalizeText(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0)) : t('hr.employee_profile.employee_details_tab.s14', "غير متاح")}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s15', "ساعات اليوم المتوقعة")}</span><strong style={{ fontSize: '0.85rem' }}>{employee?.expectedDailyHours != null ? fallbackText(employee.expectedDailyHours) : t('hr.employee_profile.employee_details_tab.s16', "غير محدد")}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s17', "موعد الحضور")}</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.scheduledCheckInTime || t('hr.employee_profile.employee_details_tab.s18', "غير محدد"))}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s19', "موعد الانصراف")}</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.scheduledCheckOutTime || t('hr.employee_profile.employee_details_tab.s20', "غير محدد"))}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s21', "فترة السماح")}</span><strong style={{ fontSize: '0.85rem' }}>{employee?.graceMinutes != null ? `${employee.graceMinutes} دقيقة` : t('hr.employee_profile.employee_details_tab.s22', "غير محدد")}</strong></div>
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>{t('hr.employee_profile.employee_details_tab.s23', "بيانات التواصل")}</strong>
        <ContactsSection contacts={contacts} />
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{t('hr.employee_profile.employee_details_tab.s24', "العقد والراتب")}</strong>
          <div className="compact-actions">
            {canManageEmployees ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setContractDraft({
                    baseSalary: latestContract ? String(latestContract.baseSalary) : '',
                    contractType: latestContract?.contractType || 'monthly',
                  });
                  setShowContractForm(!showContractForm);
                }}
                style={{ padding: '2px 8px', fontSize: '0.75rem' }}
              >
                {t('hr.employee_profile.employee_details_tab.s25', "تحديث بيانات العقد")}
              </Button>
            ) : null}
          </div>
        </div>
        {!canViewSalary ? (
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{t('hr.employee_profile.employee_details_tab.s26', "لا تملك صلاحية عرض هذه البيانات.")}</p>
        ) : latestContract ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s27', "نوع التعاقد")}</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(latestContract.contractType)}</strong></div>
            <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s28', "الحالة")}</span><strong style={{ fontSize: '0.85rem' }}>{statusLabel(latestContract.status)}</strong></div>
            <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s29', "بداية العقد")}</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(latestContract.startDate)}</strong></div>
            <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.employee_profile.employee_details_tab.s30', "الراتب الأساسي")}</span><strong style={{ fontSize: '0.85rem' }}>{money(latestContract.baseSalary)}</strong></div>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{t('hr.employee_profile.employee_details_tab.s31', "لا يوجد عقد أو راتب مسجل.")}</p>
        )}

        {showContractForm && (
          <form onSubmit={handleSaveContract} style={{ marginTop: 12, padding: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.employee_profile.employee_details_tab.s32', "نوع التعاقد")}</label><input value={contractDraft.contractType} onChange={e => setContractDraft(c => ({...c, contractType: e.target.value}))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
              <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{t('hr.employee_profile.employee_details_tab.s33', "الراتب الأساسي")}</label><input inputMode="decimal" min="0" required value={contractDraft.baseSalary} onChange={e => setContractDraft(c => ({...c, baseSalary: e.target.value}))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
            </div>
            <div className="compact-actions" style={{ marginTop: 10 }}>
              <Button type="submit" disabled={isSavingContract} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>{isSavingContract ? t('hr.employee_profile.employee_details_tab.s34', "جاري الحفظ...") : t('hr.employee_profile.employee_details_tab.s35', "حفظ العقد والراتب")}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowContractForm(false)} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>{t('hr.employee_profile.employee_details_tab.s36', "إلغاء")}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
