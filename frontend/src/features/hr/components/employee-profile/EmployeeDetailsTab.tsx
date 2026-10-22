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

  const annualBalance = Number(employee?.annualLeaveBalance || 21);
  const usedLeaves = Number(employee?.usedAnnualLeaves || 0);
  const remainingLeaves = Math.max(0, annualBalance - usedLeaves);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. البيانات الأساسية والوظيفية */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
          <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>البيانات الأساسية والوظيفية للموظف</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الاسم بالكامل</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{employeeName(employee)}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>كود الموظف</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{fallbackText(employee?.employeeNo)}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الحالة الوظيفية</span>
            <strong style={{ fontSize: '0.85rem', color: employee?.status === 'active' ? '#15803d' : '#b91c1c' }}>
              {statusLabel(employee?.status)}
            </strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>القسم الإداري</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{fallbackText(employee?.departmentName)}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>المسمى الوظيفي</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{fallbackText(employee?.jobTitleName)}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الوظيفة / المنصب</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{fallbackText(employee?.positionName)}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>تاريخ التعيين</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{fallbackText(employee?.hireDate)}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الرقم القومي</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a', direction: 'ltr', display: 'inline-block' }}>
              {nationalIdMasked}
            </strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الفرع التشغيلي</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{fallbackText(employee?.branchName)}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>المستودع / الموقع</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{fallbackText(employee?.locationName)}</strong>
          </div>
        </div>
      </div>

      {/* 2. بيانات الدوام ومواعيد العمل والأجر */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
          <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>بيانات الدوام والأجر والسياسات</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>نظام الأجر</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
              {normalizeText(employee?.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري'}
            </strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>أجر الساعة</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
              {normalizeText(employee?.compensationType) === 'hourly' ? money(Number(employee?.hourlyRate || 0)) : 'غير متاح'}
            </strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>ساعات اليوم المتوقعة</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
              {employee?.expectedDailyHours != null ? `${employee.expectedDailyHours} ساعات` : 'غير محدد'}
            </strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>موعد الحضور المقرر</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
              {fallbackText(employee?.scheduledCheckInTime)}
            </strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>موعد الانصراف المقرر</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
              {fallbackText(employee?.scheduledCheckOutTime)}
            </strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>فترة السماح للتأخير</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
              {employee?.graceMinutes != null ? `${employee.graceMinutes} دقيقة` : 'غير محدد'}
            </strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>سياسة الحضور</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
              {employee?.attendancePolicy === 'flexible' ? 'حضور مرن' : 'دوام صارم'}
            </strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>سياسة العمل الإضافي</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
              {employee?.overtimePolicy === 'auto_approved' ? 'اعتماد تلقائي' : employee?.overtimePolicy === 'disabled' ? 'معطل' : 'يتطلب مراجعة'}
            </strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>سياسة التأخير والجزاءات</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
              {employee?.delayPolicy ? fallbackText(employee.delayPolicy) : 'حسب لائحة العمل'}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. الحساب البنكي والبيانات المالية */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
          <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>البيانات البنكية وطريقة التحويل المالي</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>اسم البنك</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{fallbackText(employee?.bankName)}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>رقم الحساب البنكي</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a', direction: 'ltr', display: 'inline-block' }}>
              {fallbackText(employee?.bankAccountNumber)}
            </strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الآيبان (IBAN)</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a', direction: 'ltr', display: 'inline-block' }}>
              {fallbackText(employee?.iban)}
            </strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>كود السويفت (SWIFT)</span>
            <strong style={{ fontSize: '0.85rem', color: '#0f172a', direction: 'ltr', display: 'inline-block' }}>
              {fallbackText(employee?.bankSwiftCode)}
            </strong>
          </div>
        </div>
      </div>

      {/* 4. التأمينات الاجتماعية والضرائب ورصيد الإجازات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        {/* التأمينات والضرائب */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
            <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>التأمينات الاجتماعية والضرائب</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>التأمين الاجتماعي</span>
              <strong style={{ fontSize: '0.85rem', color: employee?.hasSocialInsurance ? '#15803d' : '#64748b' }}>
                {employee?.hasSocialInsurance ? 'مؤمن عليه' : 'غير مؤمن'}
              </strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الأجر التأميني</span>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                {employee?.insuranceSalary != null ? money(employee.insuranceSalary) : 'غير محدد'}
              </strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>ضريبة كسب العمل</span>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                {employee?.hasIncomeTax ? 'خاضع لضريبة كسب العمل' : 'معفى / غير خاضع'}
              </strong>
            </div>
          </div>
        </div>

        {/* رصيد الإجازات السنوية */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
            <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>رصيد الإجازات السنوية</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الرصيد الكلي</span>
              <strong style={{ fontSize: '1.1rem', color: '#0f172a', marginTop: '2px', display: 'block' }}>{annualBalance}</strong>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>يوم سنوي</span>
            </div>
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>المستهلك</span>
              <strong style={{ fontSize: '1.1rem', color: '#c2410c', marginTop: '2px', display: 'block' }}>{usedLeaves}</strong>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>يوم مستهلك</span>
            </div>
            <div style={{ background: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#166534', display: 'block' }}>المتبقي الصافي</span>
              <strong style={{ fontSize: '1.1rem', color: '#15803d', marginTop: '2px', display: 'block' }}>{remainingLeaves}</strong>
              <span style={{ fontSize: '0.68rem', color: '#166534' }}>يوم متاح</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. بيانات التواصل وأرقام الطوارئ */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
          <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>بيانات التواصل وأرقام الطوارئ</strong>
        </div>
        <ContactsSection contacts={contacts} />
      </div>

      {/* 6. العقد والراتب التعاقدي */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>نوع التعاقد</span>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{fallbackText(latestContract.contractType)}</strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>حالة العقد</span>
              <strong style={{ fontSize: '0.85rem', color: '#15803d' }}>{statusLabel(latestContract.status)}</strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>تاريخ بداية العقد</span>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{fallbackText(latestContract.startDate)}</strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>الراتب الأساسي التعاقدي</span>
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{money(latestContract.baseSalary)}</strong>
            </div>
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
