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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>البيانات الأساسية والوظيفية</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الاسم</span><strong style={{ fontSize: '0.85rem' }}>{employeeName(employee)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>كود الموظف</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.employeeNo)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الحالة</span><strong style={{ fontSize: '0.85rem' }}>{statusLabel(employee?.status)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>القسم</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.departmentName)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>المسمى الوظيفي</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.jobTitleName)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الوظيفة/المنصب</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.positionName)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>تاريخ التعيين</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.hireDate)}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الرقم القومي</span><strong style={{ fontSize: '0.85rem' }}>{nationalIdMasked}</strong></div>
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>بيانات الدوام والأجر</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>نوع الأجر</span><strong style={{ fontSize: '0.85rem' }}>{normalizeText(employee?.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري'}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>أجر الساعة</span><strong style={{ fontSize: '0.85rem' }}>{normalizeText(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0)) : 'غير متاح'}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>ساعات اليوم المتوقعة</span><strong style={{ fontSize: '0.85rem' }}>{employee?.expectedDailyHours != null ? fallbackText(employee.expectedDailyHours) : 'غير محدد'}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>موعد الحضور</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.scheduledCheckInTime || 'غير محدد')}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>موعد الانصراف</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(employee?.scheduledCheckOutTime || 'غير محدد')}</strong></div>
          <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>فترة السماح</span><strong style={{ fontSize: '0.85rem' }}>{employee?.graceMinutes != null ? `${employee.graceMinutes} دقيقة` : 'غير محدد'}</strong></div>
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>بيانات التواصل</strong>
        <ContactsSection contacts={contacts} />
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>العقد والراتب</strong>
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
                تحديث بيانات العقد
              </Button>
            ) : null}
          </div>
        </div>
        {!canViewSalary ? (
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا تملك صلاحية عرض هذه البيانات.</p>
        ) : latestContract ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>نوع التعاقد</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(latestContract.contractType)}</strong></div>
            <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الحالة</span><strong style={{ fontSize: '0.85rem' }}>{statusLabel(latestContract.status)}</strong></div>
            <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>بداية العقد</span><strong style={{ fontSize: '0.85rem' }}>{fallbackText(latestContract.startDate)}</strong></div>
            <div style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الراتب الأساسي</span><strong style={{ fontSize: '0.85rem' }}>{money(latestContract.baseSalary)}</strong></div>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا يوجد عقد أو راتب مسجل.</p>
        )}

        {showContractForm && (
          <form onSubmit={handleSaveContract} style={{ marginTop: 12, padding: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>نوع التعاقد</label><input value={contractDraft.contractType} onChange={e => setContractDraft(c => ({...c, contractType: e.target.value}))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
              <div><label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>الراتب الأساسي</label><input inputMode="decimal" min="0" required value={contractDraft.baseSalary} onChange={e => setContractDraft(c => ({...c, baseSalary: e.target.value}))} style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} /></div>
            </div>
            <div className="compact-actions" style={{ marginTop: 10 }}>
              <Button type="submit" disabled={isSavingContract} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>{isSavingContract ? 'جاري الحفظ...' : 'حفظ العقد والراتب'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowContractForm(false)} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>إلغاء</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
