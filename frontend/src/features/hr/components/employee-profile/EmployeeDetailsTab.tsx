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
  const annualBalance = Number(employee?.annualLeaveBalance || 21);
  const usedLeaves = Number(employee?.usedAnnualLeaves || 0);
  const remainingLeaves = Math.max(0, annualBalance - usedLeaves);

  // Field renderer helper for visual consistency and clean key-value hierarchy
  const renderField = (label: string, value: React.ReactNode, hint?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 500 }}>{label}</span>
      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>
        {value}
      </div>
      {hint ? <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{hint}</span> : null}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. البيانات الأساسية والوظيفية */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>البيانات الأساسية والوظيفية للموظف</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px 20px' }}>
          {renderField('الاسم بالكامل', employeeName(employee))}
          {renderField('كود الموظف', fallbackText(employee?.employeeNo))}
          {renderField('الحالة الوظيفية', (
            <span style={{
              display: 'inline-block',
              padding: '1px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: employee?.status === 'active' ? '#f0fdf4' : '#f8fafc',
              color: employee?.status === 'active' ? '#15803d' : '#64748b',
              border: `1px solid ${employee?.status === 'active' ? '#bbf7d0' : '#e2e8f0'}`,
            }}>
              {statusLabel(employee?.status)}
            </span>
          ))}
          {renderField('القسم الإداري', fallbackText(employee?.departmentName))}
          {renderField('المسمى الوظيفي', fallbackText(employee?.jobTitleName))}
          {renderField('الوظيفة / المنصب', fallbackText(employee?.positionName))}
          {renderField('تاريخ التعيين', fallbackText(employee?.hireDate))}
          {renderField('الرقم القومي', <span style={{ direction: 'ltr', display: 'inline-block' }}>{nationalIdMasked}</span>)}
          {renderField('الفرع التشغيلي', fallbackText(employee?.branchName))}
          {renderField('المستودع / الموقع', fallbackText(employee?.locationName))}
        </div>
      </div>

      {/* 2. بيانات الدوام ومواعيد العمل والأجر */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>بيانات الدوام والأجر والسياسات</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px 20px' }}>
          {renderField('نظام الأجر', normalizeText(employee?.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري')}
          {renderField('أجر الساعة', normalizeText(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0)) : '—')}
          {renderField('ساعات اليوم المتوقعة', employee?.expectedDailyHours != null ? `${employee.expectedDailyHours} ساعات` : '—')}
          {renderField('موعد الحضور المقرر', fallbackText(employee?.scheduledCheckInTime))}
          {renderField('موعد الانصراف المقرر', fallbackText(employee?.scheduledCheckOutTime))}
          {renderField('فترة السماح للتأخير', employee?.graceMinutes != null ? `${employee.graceMinutes} دقيقة` : '—')}
          {renderField('سياسة الحضور', employee?.attendancePolicy === 'flexible' ? 'حضور مرن' : 'دوام صارم')}
          {renderField('سياسة العمل الإضافي', employee?.overtimePolicy === 'auto_approved' ? 'اعتماد تلقائي' : employee?.overtimePolicy === 'disabled' ? 'معطل' : 'يتطلب مراجعة')}
          {renderField('سياسة التأخير والجزاءات', employee?.delayPolicy ? fallbackText(employee.delayPolicy) : 'حسب لائحة العمل')}
        </div>
      </div>

      {/* 3. الحساب البنكي والبيانات المالية */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>البيانات البنكية وطريقة التحويل المالي</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px 20px' }}>
          {renderField('اسم البنك', fallbackText(employee?.bankName))}
          {renderField('رقم الحساب البنكي', <span style={{ direction: 'ltr', display: 'inline-block' }}>{fallbackText(employee?.bankAccountNumber)}</span>)}
          {renderField('الآيبان (IBAN)', <span style={{ direction: 'ltr', display: 'inline-block' }}>{fallbackText(employee?.iban)}</span>)}
          {renderField('كود السويفت (SWIFT)', <span style={{ direction: 'ltr', display: 'inline-block' }}>{fallbackText(employee?.bankSwiftCode)}</span>)}
        </div>
      </div>

      {/* 4. التأمينات الاجتماعية والضرائب ورصيد الإجازات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        {/* التأمينات والضرائب */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>التأمينات الاجتماعية والضرائب</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
            {renderField('التأمين الاجتماعي', (
              <span style={{
                display: 'inline-block',
                padding: '1px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: employee?.hasSocialInsurance ? '#f0fdf4' : '#f8fafc',
                color: employee?.hasSocialInsurance ? '#15803d' : '#64748b',
                border: `1px solid ${employee?.hasSocialInsurance ? '#bbf7d0' : '#e2e8f0'}`,
              }}>
                {employee?.hasSocialInsurance ? 'مؤمن عليه' : 'غير مؤمن'}
              </span>
            ))}
            {renderField('الأجر التأميني', employee?.insuranceSalary != null ? money(employee.insuranceSalary) : '—')}
            <div style={{ gridColumn: 'span 2' }}>
              {renderField('ضريبة كسب العمل', employee?.hasIncomeTax ? 'خاضع لضريبة كسب العمل' : 'معفى / غير خاضع')}
            </div>
          </div>
        </div>

        {/* رصيد الإجازات السنوية */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>رصيد الإجازات السنوية</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', textAlign: 'center' }}>
            <div>
              <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>الرصيد الكلي</span>
              <strong style={{ fontSize: '1.25rem', color: '#0f172a', display: 'block', fontWeight: 800 }}>{annualBalance}</strong>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>يوم سنوي</span>
            </div>
            <div>
              <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block', marginBottom: '3px' }}>المستهلك</span>
              <strong style={{ fontSize: '1.25rem', color: '#0f172a', display: 'block', fontWeight: 800 }}>{usedLeaves}</strong>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>يوم مستهلك</span>
            </div>
            <div>
              <span style={{ fontSize: '0.725rem', color: '#166534', display: 'block', marginBottom: '3px', fontWeight: 600 }}>المتبقي الصافي</span>
              <strong style={{ fontSize: '1.25rem', color: '#15803d', display: 'block', fontWeight: 800 }}>{remainingLeaves}</strong>
              <span style={{ fontSize: '0.68rem', color: '#166534' }}>يوم متاح</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. بيانات التواصل وأرقام الطوارئ */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>بيانات التواصل وأرقام الطوارئ</strong>
        </div>
        <ContactsSection contacts={contacts} />
      </div>

      {/* 6. العقد والراتب التعاقدي */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>العقد والراتب التعاقدي</strong>
          </div>
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
              style={{ padding: '3px 10px', fontSize: '0.78rem' }}
            >
              {showContractForm ? 'إخفاء النموذج' : 'تحديث بيانات العقد والراتب'}
            </Button>
          ) : null}
        </div>

        {!canViewSalary ? (
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا تملك صلاحية عرض هذه البيانات.</p>
        ) : latestContract ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px 20px' }}>
            {renderField('نوع التعاقد', fallbackText(latestContract.contractType))}
            {renderField('حالة العقد', (
              <span style={{
                display: 'inline-block',
                padding: '1px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
              }}>
                {statusLabel(latestContract.status)}
              </span>
            ))}
            {renderField('تاريخ بداية العقد', fallbackText(latestContract.startDate))}
            {renderField('الراتب الأساسي التعاقدي', <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{money(latestContract.baseSalary)}</strong>)}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>لا يوجد عقد أو راتب مسجل.</p>
        )}

        {showContractForm && (
          <form onSubmit={handleSaveContract} style={{ marginTop: 14, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a', marginBottom: '8px' }}>
              إدخال بيانات العقد والراتب الجديد
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  نوع التعاقد
                </label>
                <input
                  value={contractDraft.contractType}
                  onChange={e => setContractDraft(c => ({ ...c, contractType: e.target.value }))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  الراتب الأساسي
                </label>
                <input
                  inputMode="decimal"
                  min="0"
                  required
                  value={contractDraft.baseSalary}
                  onChange={e => setContractDraft(c => ({ ...c, baseSalary: e.target.value }))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>
            <div className="compact-actions" style={{ marginTop: 12, display: 'flex', gap: '8px' }}>
              <Button type="submit" disabled={isSavingContract} style={{ padding: '5px 14px', fontSize: '0.8rem' }}>
                {isSavingContract ? 'جاري الحفظ...' : 'حفظ بيانات العقد'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowContractForm(false)} style={{ padding: '5px 14px', fontSize: '0.8rem' }}>
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
