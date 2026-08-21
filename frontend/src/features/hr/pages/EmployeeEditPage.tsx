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
            
            {/* Top Right: Personal Data */}
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
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الرقم القومي (14 رقم)</label>
                  <input
                    value={draft.nationalId}
                    onChange={(e) => setDraft((current) => ({ ...current, nationalId: e.target.value }))}
                    inputMode="numeric"
                    maxLength={14}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
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
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value === 'inactive' ? 'inactive' : 'active' }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Top Left: Compensation */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>نظام الأجور والراتب</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>نوع الأجر</label>
                  <select
                    value={draft.compensationType}
                    onChange={(e) => setDraft((current) => ({ ...current, compensationType: e.target.value === 'hourly' ? 'hourly' : 'monthly' }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  >
                    <option value="monthly">راتب شهري ثابت</option>
                    <option value="hourly">أجر بالساعة</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>دورة القبض</label>
                  <select
                    value={draft.payFrequency}
                    onChange={(e) => setDraft((current) => ({ ...current, payFrequency: e.target.value as any }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  >
                    <option value="monthly">شهري</option>
                    <option value="weekly">أسبوعي</option>
                    <option value="biweekly">نصف شهري</option>
                    <option value="daily">يومي</option>
                  </select>
                </div>
                {draft.compensationType === 'hourly' ? (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>أجر الساعة (ج.م)</label>
                      <input
                        inputMode="decimal"
                        min="0"
                        value={draft.hourlyRate}
                        onChange={(e) => setDraft((current) => ({ ...current, hourlyRate: e.target.value }))}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>ساعات العمل اليومية</label>
                      <input
                        inputMode="decimal"
                        min="0"
                        value={draft.expectedDailyHours}
                        onChange={(e) => setDraft((current) => ({ ...current, expectedDailyHours: e.target.value }))}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الراتب التأميني</label>
                    <input
                      inputMode="decimal"
                      min="0"
                      value={draft.insuranceSalary}
                      onChange={(e) => setDraft((current) => ({ ...current, insuranceSalary: e.target.value }))}
                      placeholder="اختياري"
                      style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>التأمينات والضرائب</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 14px', minHeight: '38px', boxSizing: 'border-box' }}>
                    <label style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', margin: 0, userSelect: 'none' }}>
                      <input type="checkbox" checked={draft.hasSocialInsurance} onChange={(e) => setDraft((current) => ({ ...current, hasSocialInsurance: e.target.checked }))} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }} />
                      <span style={{ whiteSpace: 'nowrap' }}>تأمينات اجتماعية</span>
                    </label>
                    <label style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', margin: 0, userSelect: 'none' }}>
                      <input type="checkbox" checked={draft.hasIncomeTax} onChange={(e) => setDraft((current) => ({ ...current, hasIncomeTax: e.target.checked }))} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }} />
                      <span style={{ whiteSpace: 'nowrap' }}>ضريبة كسب عمل</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Row: Organizational Data (Right) & Working Hours (Left) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
            
            {/* Bottom Right: Organizational */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>البيانات الوظيفية والتعيين</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>القسم</label>
                  <select
                    value={draft.departmentId}
                    onChange={(e) => setDraft((current) => ({ ...current, departmentId: e.target.value }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  >
                    <option value="">اختيار</option>
                    {departments.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>المسمى الوظيفي</label>
                  <select
                    value={draft.jobTitleId}
                    onChange={(e) => setDraft((current) => ({ ...current, jobTitleId: e.target.value }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  >
                    <option value="">اختيار</option>
                    {jobTitles.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الوظيفة/المنصب</label>
                  <select
                    value={draft.positionId}
                    onChange={(e) => setDraft((current) => ({ ...current, positionId: e.target.value }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  >
                    <option value="">اختيار</option>
                    {positions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Bottom Left: Attendance & Working Hours */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>مواعيد الدوام وسياسات الحضور</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>موعد الحضور</label>
                  <input
                    type="time"
                    value={draft.scheduledCheckInTime}
                    onChange={(e) => setDraft((current) => ({ ...current, scheduledCheckInTime: e.target.value }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>موعد الانصراف</label>
                  <input
                    type="time"
                    value={draft.scheduledCheckOutTime}
                    onChange={(e) => setDraft((current) => ({ ...current, scheduledCheckOutTime: e.target.value }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>فترة السماح (دقائق)</label>
                  <input
                    inputMode="numeric"
                    value={draft.graceMinutes}
                    onChange={(e) => setDraft((current) => ({ ...current, graceMinutes: e.target.value }))}
                    placeholder="15"
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>رصيد الإجازات السنوي</label>
                  <input
                    inputMode="numeric"
                    value={draft.annualLeaveBalance}
                    onChange={(e) => setDraft((current) => ({ ...current, annualLeaveBalance: e.target.value }))}
                    placeholder="21"
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>سياسة التأخير</label>
                  <select
                    value={draft.delayPolicy}
                    onChange={(e) => setDraft((current) => ({ ...current, delayPolicy: e.target.value }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  >
                    <option value="inherit">حسب سياسة المؤسسة</option>
                    <option value="standard">قياسي (دقائق)</option>
                    <option value="progressive">تصاعدي</option>
                    <option value="strict">صارم</option>
                    <option value="disabled">معطل</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>سياسة الإضافي</label>
                  <select
                    value={draft.overtimePolicy}
                    onChange={(e) => setDraft((current) => ({ ...current, overtimePolicy: e.target.value as any }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  >
                    <option value="review_only">مراجعة واعتماد</option>
                    <option value="auto_approved">اعتماد تلقائي</option>
                    <option value="disabled">معطل</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Section: Notes & Submit */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>ملاحظات إدارية (اختياري)</label>
              <input
                value={draft.notes}
                onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))}
                placeholder="أدخل أي ملاحظات إدارية على ملف الموظف..."
                style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            {submitError ? <div className="error-box" style={{ margin: 0 }}>{submitError}</div> : null}

            <div className="actions compact-actions" style={{ justifyContent: 'flex-start', gap: '10px', marginTop: '4px' }}>
              <Button type="submit" disabled={isBusy} style={{ minWidth: '140px' }}>{isBusy ? 'جاري الحفظ...' : 'حفظ التعديلات'}</Button>
              <Button type="button" variant="secondary" onClick={goToProfile} disabled={isBusy}>إلغاء</Button>
            </div>
          </div>

          </div>
        </form>
      </QueryFeedback>
      </main>
    </div>
  );
}
