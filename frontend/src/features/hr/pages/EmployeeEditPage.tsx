import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
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
  toId,
  type EmployeeEditDraft,
} from '@/features/hr/pages/employee-edit/employee-edit.helpers';

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
    setDraft({
      employeeNo: String(employee.employeeNo || ''),
      firstName: String(employee.firstName || ''),
      lastName: String(employee.lastName || ''),
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
      annualLeaveBalance: String(employee.annualLeaveBalance ?? 21),
      insuranceSalary: employee.insuranceSalary ? String(employee.insuranceSalary) : '',
      notes: String(employee.notes || ''),
    });
    setDraftInitialized(true);
  }, [draftInitialized, employee]);

  const reviewWarnings = useMemo(() => {
    const warnings: string[] = [];
    const nationalId = normalizeDigitsOnly(draft.nationalId);
    if (!String(draft.firstName || '').trim()) warnings.push('الاسم الأول مطلوب قبل الحفظ.');
    if (!String(draft.hireDate || '').trim()) warnings.push('تاريخ التعيين مطلوب قبل الحفظ.');
    if (nationalId && nationalId.length !== 14) warnings.push('الرقم القومي يجب أن يكون 14 رقمًا إذا تم إدخاله.');
    if (!draft.departmentId) warnings.push('القسم غير محدد.');
    if (!draft.jobTitleId) warnings.push('المسمى الوظيفي غير محدد.');
    if (draft.compensationType === 'hourly' && !normalizeNumberText(draft.hourlyRate)) warnings.push('أجر الساعة مطلوب للموظف بالأجر بالساعة.');
    if (draft.compensationType === 'hourly' && !normalizeNumberText(draft.expectedDailyHours)) warnings.push('ساعات العمل اليومية مطلوبة للموظف بالأجر بالساعة.');
    return warnings;
  }, [draft]);

  const isBusy = mutations.saveEmployee.isPending;

  function goToProfile() {
    navigate(id ? `/hr/employees/${id}` : '/hr/employees');
  }



  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');
    if (!id) { setSubmitError('تعذر تحديد الموظف.'); return; }

    const firstName = String(draft.firstName || '').trim();
    const hireDate = String(draft.hireDate || '').trim();
    const employeeNo = normalizeArabicDigits(String(draft.employeeNo || '').trim());
    const nationalId = normalizeDigitsOnly(draft.nationalId);
    const hourlyRate = Number(normalizeNumberText(draft.hourlyRate) || 0);
    const expectedDailyHours = Number(normalizeNumberText(draft.expectedDailyHours) || 0);
    const graceMinutes = Number(normalizeDigitsOnly(draft.graceMinutes) || 0);

    if (!firstName) { setSubmitError('الاسم الأول مطلوب.'); return; }
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
          nationalId: nationalId || undefined,
          departmentId: toId(draft.departmentId),
          jobTitleId: toId(draft.jobTitleId),
          positionId: toId(draft.positionId),
          hireDate,
          status: draft.status,
          notes: String(draft.notes || '').trim() || undefined,
          compensationType: draft.compensationType,
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
          hasIncomeTax: draft.hasIncomeTax, annualLeaveBalance: draft.annualLeaveBalance ? Number(draft.annualLeaveBalance) : 21,
          insuranceSalary: draft.insuranceSalary ? Number(normalizeNumberText(draft.insuranceSalary)) : undefined,
        },
      });
      goToProfile();
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'تعذر تحديث بيانات الموظف.'));
    }
  }

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
      <PageHeader
        title="تعديل بيانات الموظف"
        description="تعديل بيانات الموظف الأساسية، الوظيفية، والدوام من نفس المسار المستخدم في الإضافة."
        actions={<div className="compact-actions"><Button variant="secondary" onClick={goToProfile}>رجوع لملف الموظف</Button><Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button></div>}
      />

      <QueryFeedback isLoading={profile.isLoading} isError={profile.isError} error={profile.error} isEmpty={!employee} loadingText="جاري تحميل بيانات الموظف..." errorTitle="تعذر تحميل بيانات الموظف" emptyTitle="لم يتم العثور على الموظف.">
        <form onSubmit={(event) => { void handleSubmit(event); }}>
          <FormSection title="البيانات الأساسية" description="تعديل بيانات التعريف الأساسية للموظف.">
            <div className="form-grid">
              <label className="field"><span>كود الموظف</span><input value={draft.employeeNo} onChange={(e) => setDraft((current) => ({ ...current, employeeNo: e.target.value }))} placeholder="يُنشأ تلقائياً إذا تُرك فارغاً" /></label>
              <label className="field"><span>الاسم الأول *</span><input value={draft.firstName} onChange={(e) => setDraft((current) => ({ ...current, firstName: e.target.value }))} required /></label>
              <label className="field"><span>اسم العائلة</span><input value={draft.lastName} onChange={(e) => setDraft((current) => ({ ...current, lastName: e.target.value }))} /></label>
              <label className="field"><span>الرقم القومي</span><input value={draft.nationalId} onChange={(e) => setDraft((current) => ({ ...current, nationalId: e.target.value }))} inputMode="numeric" maxLength={14} /></label>
              <label className="field"><span>تاريخ التعيين *</span><input type="date" value={draft.hireDate} onChange={(e) => setDraft((current) => ({ ...current, hireDate: e.target.value }))} required /></label>
              <label className="field"><span>الحالة</span><select value={draft.status} onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value === 'inactive' ? 'inactive' : 'active' }))}><option value="active">نشط</option><option value="inactive">غير نشط</option></select></label>
            </div>
          </FormSection>

          <FormSection title="البيانات الوظيفية" description="تعديل القسم والمسمى الوظيفي والوظيفة/المنصب.">
            <div className="form-grid">
              <label className="field"><span>القسم</span><select value={draft.departmentId} onChange={(e) => setDraft((current) => ({ ...current, departmentId: e.target.value }))}><option value="">اختيار</option>{departments.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
              <label className="field"><span>المسمى الوظيفي</span><select value={draft.jobTitleId} onChange={(e) => setDraft((current) => ({ ...current, jobTitleId: e.target.value }))}><option value="">اختيار</option>{jobTitles.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
              <label className="field"><span>الوظيفة/المنصب</span><select value={draft.positionId} onChange={(e) => setDraft((current) => ({ ...current, positionId: e.target.value }))}><option value="">اختيار</option>{positions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            </div>
            <div className="compact-actions" style={{ marginTop: 12 }}><Button type="button" variant="secondary" onClick={() => navigate('/hr/settings')}>إدارة الأقسام والمسميات</Button></div>
          </FormSection>

          <FormSection title="الدوام والأجر" description="اختر نظام أجر الموظف وقيمته.">
            <div className="form-grid">
              <label className="field"><span>نوع الأجر</span><select value={draft.compensationType} onChange={(e) => setDraft((current) => ({ ...current, compensationType: e.target.value === 'hourly' ? 'hourly' : 'monthly' }))}><option value="monthly">راتب شهري</option><option value="hourly">أجر بالساعة</option></select></label>
              {draft.compensationType === 'hourly' ? <><label className="field"><span>أجر الساعة</span><input inputMode="decimal" min="0" value={draft.hourlyRate} onChange={(e) => setDraft((current) => ({ ...current, hourlyRate: e.target.value }))} /></label><label className="field"><span>عدد ساعات العمل اليومية المتوقعة</span><input inputMode="decimal" min="0" value={draft.expectedDailyHours} onChange={(e) => setDraft((current) => ({ ...current, expectedDailyHours: e.target.value }))} /></label></> : null}
              {draft.compensationType === 'hourly' ? <p className="muted field-wide">الأجر اليومي المتوقع: {(Number(normalizeNumberText(draft.hourlyRate) || 0) * Number(normalizeNumberText(draft.expectedDailyHours) || 0)).toFixed(2)} ج.م</p> : null}
            </div>
          </FormSection>

          <FormSection title="مراجعة قبل الحفظ" description="تنبيهات بسيطة لتقليل الملفات الناقصة. التنبيهات التنظيمية لا تمنع الحفظ.">{reviewWarnings.length ? <ul className="muted" style={{ margin: 0, paddingInlineStart: 20 }}>{reviewWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className="muted">البيانات الأساسية جاهزة للحفظ.</p>}</FormSection>

          <FormSection title="ملاحظات">
            <div className="field field-wide"><span>ملاحظات</span><textarea rows={4} value={draft.notes} onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))} /></div>
            {submitError ? <div className="error-box" style={{ marginTop: 12 }}>{submitError}</div> : null}
            <div className="actions compact-actions" style={{ marginTop: 16 }}><Button type="button" variant="secondary" onClick={goToProfile} disabled={isBusy}>إلغاء</Button><Button type="submit" disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ التعديلات'}</Button></div>
          </FormSection>
        </form>
      </QueryFeedback>
      </main>
    </div>
  );
}
