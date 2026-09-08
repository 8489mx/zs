import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { getErrorMessage } from '@/lib/errors';
import type { HrEmployee } from '@/types/domain';
import { useHrMutations, useHrProfile, useHrWorkspace } from '@/features/hr/hooks/useHr';
import {
  getEmployeeRef,
  initialDraft,
  normalizeArabicDigits,
  normalizeDigitsOnly,
  normalizeNumberText,
  normalizePhone,
  toId,
  type EmployeeEditDraft,
} from './employee-edit/employee-edit.helpers';
import { EmployeePersonalInfoSection } from './employee-edit/EmployeePersonalInfoSection';
import { EmployeeCompensationSection } from './employee-edit/EmployeeCompensationSection';
import { EmployeeJobDetailsSection } from './employee-edit/EmployeeJobDetailsSection';
import { EmployeeAttendancePolicySection } from './employee-edit/EmployeeAttendancePolicySection';
import { EmployeeBankDetailsSection } from './employee-edit/EmployeeBankDetailsSection';

export function EmployeeEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const profile = useHrProfile(id);
  const workspace = useHrWorkspace({ page: 1, pageSize: 200 });
  const mutations = useHrMutations();
  const [draft, setDraft] = useState<EmployeeEditDraft>(initialDraft);
  const [submitError, setSubmitError] = useState('');
  const [draftInitialized, setDraftInitialized] = useState(false);

  const employee = useMemo(() => (profile.data?.employee || undefined) as HrEmployee | undefined, [profile.data?.employee]);
  const departments = useMemo(() => workspace.departments.data?.rows || [], [workspace.departments.data?.rows]);
  const jobTitles = useMemo(() => workspace.jobTitles.data?.rows || [], [workspace.jobTitles.data?.rows]);
  const positions = useMemo(() => workspace.positions.data?.rows || [], [workspace.positions.data?.rows]);

  useEffect(() => {
    if (!employee || draftInitialized) return;
    const primaryPhone = String(
      employee.mobile ||
      employee.phone ||
      (profile.data?.contacts as any[])?.find((c: any) => c.isPrimary)?.value ||
      (profile.data?.contacts as any[])?.[0]?.value ||
      ''
    );
    setDraft({
      employeeNo: String(employee.employeeNo || ''),
      firstName: String(employee.firstName || ''),
      lastName: String(employee.lastName || ''),
      mobile: primaryPhone,
      nationalId: String(employee.nationalId || ''),
      departmentId: getEmployeeRef(employee, 'departmentId'),
      jobTitleId: getEmployeeRef(employee, 'jobTitleId'),
      positionId: getEmployeeRef(employee, 'positionId'),
      hireDate: String(employee.hireDate || ''),
      status: String(employee.status || 'active') === 'inactive' ? 'inactive' : 'active',
      compensationType: String(employee.compensationType || 'monthly') === 'hourly' ? 'hourly' : 'monthly',
      hourlyRate: employee.hourlyRate == null ? '' : String(employee.hourlyRate),
      expectedDailyHours: employee.expectedDailyHours == null ? '' : String(employee.expectedDailyHours),
      scheduledCheckInTime: String(employee.scheduledCheckInTime || ''),
      scheduledCheckOutTime: String(employee.scheduledCheckOutTime || ''),
      graceMinutes: employee.graceMinutes ? String(employee.graceMinutes) : '',
      overtimePolicy: String(employee.overtimePolicy || 'review_only') as 'review_only' | 'disabled' | 'auto_approved',
      attendancePolicy: String(employee.attendancePolicy || 'strict') as 'strict' | 'flexible',
      commissionType: String(employee.commissionType || 'inherit'),
      commissionValue: employee.commissionValue ? String(employee.commissionValue) : '',
      commissionTarget: employee.commissionTarget ? String(employee.commissionTarget) : '',
      delayPolicy: String(employee.delayPolicy || 'inherit'),
      hasSocialInsurance: employee.hasSocialInsurance === true,
      hasIncomeTax: employee.hasIncomeTax === true,
      bankName: String(employee.bankName || ''),
      bankAccountNumber: String(employee.bankAccountNumber || ''),
      iban: String(employee.iban || ''),
      bankSwiftCode: String(employee.bankSwiftCode || ''),
      annualLeaveBalance: String(employee.annualLeaveBalance ?? 21),
      insuranceSalary: employee.insuranceSalary ? String(employee.insuranceSalary) : '',
      baseSalary: '',
      payFrequency: String(employee.payFrequency || 'monthly') as 'monthly' | 'weekly' | 'biweekly' | 'daily',
      notes: String(employee.notes || ''),
    });
    setDraftInitialized(true);
  }, [draftInitialized, employee]);

  const isBusy = mutations.saveEmployee.isPending;

  function goToProfile() {
    navigate(id ? `/hr/employees/${id}` : '/hr/employees');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');
    if (!id) { setSubmitError('تعذر تحديد الموظف.'); return; }

    const firstName = String(draft.firstName || '').trim();
    const mobile = normalizePhone(draft.mobile);
    const hireDate = String(draft.hireDate || '').trim();
    const employeeNo = normalizeArabicDigits(String(draft.employeeNo || '').trim());
    const nationalId = normalizeDigitsOnly(draft.nationalId);
    const hourlyRate = Number(normalizeNumberText(draft.hourlyRate) || 0);
    const expectedDailyHours = Number(normalizeNumberText(draft.expectedDailyHours) || 0);
    const graceMinutes = Number(normalizeDigitsOnly(draft.graceMinutes) || 0);

    if (!firstName) { setSubmitError('الاسم الأول مطلوب.'); return; }
    if (!mobile) { setSubmitError('الموبايل مطلوب.'); return; }
    if (!hireDate) { setSubmitError('تاريخ التعيين مطلوب.'); return; }
    if (nationalId && !/^\d{14}$/.test(nationalId)) { setSubmitError('الرقم القومي يجب أن يكون 14 رقمًا.'); return; }
    if (draft.compensationType === 'hourly' && !(hourlyRate > 0)) { setSubmitError('أجر الساعة مطلوب للموظف بالأجر بالساعة.'); return; }
    if (draft.compensationType === 'hourly' && !(expectedDailyHours > 0)) { setSubmitError('عدد ساعات العمل اليومية المتوقعة مطلوب للموظف بالأجر بالساعة.'); return; }

    try {
      await mutations.saveEmployee.mutateAsync({
        id,
        payload: {
          employeeNo: employeeNo || undefined,
          firstName,
          lastName: String(draft.lastName || '').trim() || undefined,
          mobile,
          phone: mobile,
          nationalId: nationalId || undefined,
          departmentId: toId(draft.departmentId),
          jobTitleId: toId(draft.jobTitleId),
          positionId: toId(draft.positionId),
          hireDate,
          status: draft.status,
          notes: String(draft.notes || '').trim() || undefined,
          compensationType: draft.compensationType,
          payFrequency: draft.payFrequency,
          hourlyRate: draft.compensationType === 'hourly' ? hourlyRate : undefined,
          expectedDailyHours: draft.compensationType === 'hourly' ? expectedDailyHours : undefined,
          scheduledCheckInTime: draft.scheduledCheckInTime || undefined,
          scheduledCheckOutTime: draft.scheduledCheckOutTime || undefined,
          graceMinutes,
          overtimePolicy: draft.overtimePolicy,
          attendancePolicy: draft.attendancePolicy,
          commissionType: draft.commissionType,
          commissionValue: draft.commissionValue ? Number(draft.commissionValue) : undefined,
          commissionTarget: draft.commissionTarget ? Number(draft.commissionTarget) : undefined,
          delayPolicy: draft.delayPolicy,
          hasSocialInsurance: draft.hasSocialInsurance,
          hasIncomeTax: draft.hasIncomeTax,
          bankName: String(draft.bankName || '').trim() || undefined,
          bankAccountNumber: String(draft.bankAccountNumber || '').trim() || undefined,
          iban: String(draft.iban || '').trim() || undefined,
          bankSwiftCode: String(draft.bankSwiftCode || '').trim() || undefined,
          annualLeaveBalance: draft.annualLeaveBalance ? Number(draft.annualLeaveBalance) : 21,
          insuranceSalary: draft.insuranceSalary ? Number(normalizeNumberText(draft.insuranceSalary)) : undefined,
        },
      });
      if (id && mobile) {
        await mutations.saveContact.mutateAsync({
          employeeId: id,
          payload: { contactType: 'mobile', value: mobile, label: 'الموبايل', isPrimary: true, notes: '' },
        });
      }
      goToProfile();
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'تعذر تحديث بيانات الموظف.'));
    }
  }

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '20px' }}>
        <PageHeader
          title="تعديل بيانات الموظف"
          description="تعديل بيانات الموظف الأساسية، الوظيفية، والدوام في صفحة واحدة مدمجة ومنظمة."
          actions={(
            <div className="compact-actions">
              <Button type="button" variant="secondary" onClick={goToProfile} disabled={isBusy}>إلغاء</Button>
              <Button type="button" onClick={() => { const formEl = document.getElementById('employee-edit-form') as HTMLFormElement; formEl?.requestSubmit(); }} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ التعديلات'}</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
            </div>
          )}
        />

        <QueryFeedback isLoading={profile.isLoading} isError={profile.isError} error={profile.error} isEmpty={!employee} loadingText="جاري تحميل بيانات الموظف..." errorTitle="تعذر تحميل بيانات الموظف" emptyTitle="لم يتم العثور على الموظف.">
          <form id="employee-edit-form" onSubmit={(event) => { void handleSubmit(event); }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Top Row: Personal Data (Right) & Compensation (Left) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
                <EmployeePersonalInfoSection draft={draft} setDraft={setDraft} />
                <EmployeeCompensationSection draft={draft} setDraft={setDraft} />
              </div>

              {/* Bottom Row: Organizational Data (Right) & Working Hours (Left) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
                <EmployeeJobDetailsSection
                  draft={draft}
                  setDraft={setDraft}
                  departments={departments}
                  jobTitles={jobTitles}
                  positions={positions}
                />
                <EmployeeAttendancePolicySection draft={draft} setDraft={setDraft} />
              </div>

              {/* Bank & WPS Details Card & Submit Section */}
              <EmployeeBankDetailsSection
                draft={draft}
                setDraft={setDraft}
                submitError={submitError}
                isBusy={isBusy}
                onCancel={goToProfile}
              />
            </div>
          </form>
        </QueryFeedback>
      </main>
    </div>
  );
}
