import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';
import {
  getCreatedEmployeeId,
  initialDraft,
  normalizeArabicDigits,
  normalizeDigitsOnly,
  normalizeNumberText,
  normalizePhone,
  toId,
  type EmployeeDraft,
} from '@/features/hr/pages/employee-create/employee-create.helpers';

export function EmployeeCreatePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<EmployeeDraft>(initialDraft);
  const [submitError, setSubmitError] = useState('');

  const workspace = useHrWorkspace({ page: 1, pageSize: 200 });
  const mutations = useHrMutations();
  const departments = useMemo(() => workspace.departments.data?.rows || [], [workspace.departments.data?.rows]);
  const jobTitles = useMemo(() => workspace.jobTitles.data?.rows || [], [workspace.jobTitles.data?.rows]);
  const positions = useMemo(() => workspace.positions.data?.rows || [], [workspace.positions.data?.rows]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');
    const firstName = String(draft.firstName || '').trim();
    const mobile = normalizePhone(draft.mobile);
    const nationalId = normalizeDigitsOnly(draft.nationalId);
    const hireDate = String(draft.hireDate || '').trim();
    const contractType = String(draft.contractType || '').trim();
    const baseSalaryText = normalizeNumberText(draft.baseSalary);
    const baseSalary = baseSalaryText ? Number(baseSalaryText) : 0;
    const hourlyRateText = normalizeNumberText(draft.hourlyRate);
    const expectedDailyHoursText = normalizeNumberText(draft.expectedDailyHours);
    const graceMinutesText = normalizeDigitsOnly(draft.graceMinutes);
    const hourlyRate = hourlyRateText ? Number(hourlyRateText) : 0;
    const expectedDailyHours = expectedDailyHoursText ? Number(expectedDailyHoursText) : 0;
    const graceMinutes = graceMinutesText ? Number(graceMinutesText) : 0;

    if (!firstName) { setSubmitError('الاسم الأول مطلوب.'); return; }
    if (!mobile) { setSubmitError('الموبايل مطلوب.'); return; }
    if (!hireDate) { setSubmitError('تاريخ التعيين مطلوب.'); return; }
    if (nationalId && !/^\d{14}$/.test(nationalId)) { setSubmitError('الرقم القومي يجب أن يكون 14 رقمًا.'); return; }
    if (Number.isNaN(baseSalary)) { setSubmitError('الراتب الأساسي يجب أن يكون رقمًا صحيحًا.'); return; }
    if (draft.compensationType === 'hourly' && !(hourlyRate > 0)) { setSubmitError('أجر الساعة مطلوب للموظف بالأجر بالساعة.'); return; }
    if (draft.compensationType === 'hourly' && !(expectedDailyHours > 0)) { setSubmitError('عدد ساعات العمل اليومية المتوقعة مطلوب للموظف بالأجر بالساعة.'); return; }

    try {
      const result = await mutations.saveEmployee.mutateAsync({ payload: { employeeNo: normalizeArabicDigits(String(draft.employeeNo || '').trim()) || undefined, firstName, lastName: String(draft.lastName || '').trim() || undefined, nationalId: nationalId || undefined, status: draft.status, departmentId: toId(draft.departmentId), jobTitleId: toId(draft.jobTitleId), positionId: toId(draft.positionId), hireDate, notes: String(draft.notes || '').trim() || undefined, compensationType: draft.compensationType, payFrequency: draft.payFrequency, hourlyRate: draft.compensationType === 'hourly' ? hourlyRate : undefined, expectedDailyHours: draft.compensationType === 'hourly' ? expectedDailyHours : undefined, scheduledCheckInTime: draft.scheduledCheckInTime || undefined, scheduledCheckOutTime: draft.scheduledCheckOutTime || undefined, graceMinutes, overtimePolicy: draft.overtimePolicy, attendancePolicy: draft.attendancePolicy, commissionType: draft.commissionType, commissionValue: draft.commissionValue ? Number(draft.commissionValue) : undefined, commissionTarget: draft.commissionTarget ? Number(draft.commissionTarget) : undefined, delayPolicy: draft.delayPolicy, hasSocialInsurance: draft.hasSocialInsurance, hasIncomeTax: draft.hasIncomeTax, annualLeaveBalance: draft.annualLeaveBalance ? Number(draft.annualLeaveBalance) : 21, insuranceSalary: draft.insuranceSalary ? Number(normalizeNumberText(draft.insuranceSalary)) : undefined } });
      const createdEmployeeId = getCreatedEmployeeId(result, draft, firstName);
      if (createdEmployeeId) {
        await mutations.saveContact.mutateAsync({ employeeId: createdEmployeeId, payload: { contactType: 'phone', value: mobile, label: 'الموبايل', isPrimary: true, notes: '' } });
        if (contractType || baseSalary > 0) await mutations.saveContract.mutateAsync({ employeeId: createdEmployeeId, payload: { contractType: contractType || 'standard', status: 'active', startDate: hireDate, baseSalary: baseSalary > 0 ? baseSalary : 0, currency: 'EGP', notes: 'تم إنشاؤه من صفحة إضافة موظف.' } });
      }
      navigate('/hr/employees');
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'تعذر حفظ الموظف.'));
    }
  }

  const isBusy = mutations.saveEmployee.isPending || mutations.saveContact.isPending || mutations.saveContract.isPending || mutations.saveMasterData.isPending;

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '20px' }}>
        <PageHeader
        title="إضافة موظف جديد"
        description="سجل بيانات الموظف الأساسية، الوظيفية، ونظام الأجور والدوام في صفحة واحدة منظمة."
        actions={(
          <div className="compact-actions">
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/employees')} disabled={isBusy}>إلغاء</Button>
            <Button type="button" onClick={() => { const formEl = document.getElementById('employee-create-form') as HTMLFormElement; formEl?.requestSubmit(); }} disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ الموظف'}</Button>
          </div>
        )}
      />

      <form id="employee-create-form" onSubmit={(event) => { void handleSubmit(event); }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Top Row: Personal Data (Right) & Compensation (Left) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
            
            {/* Top Right: Personal Data */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>البيانات الأساسية والاتصال (إجباري)</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>كود الموظف</label>
                  <input
                    value={draft.employeeNo}
                    onChange={(e) => setDraft((current) => ({ ...current, employeeNo: e.target.value }))}
                    placeholder="تلقائي"
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الاسم الأول <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    value={draft.firstName}
                    onChange={(e) => setDraft((current) => ({ ...current, firstName: e.target.value }))}
                    placeholder="الاسم الأول"
                    required
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>اسم العائلة</label>
                  <input
                    value={draft.lastName}
                    onChange={(e) => setDraft((current) => ({ ...current, lastName: e.target.value }))}
                    placeholder="اسم العائلة"
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الموبايل <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    value={draft.mobile}
                    onChange={(e) => setDraft((current) => ({ ...current, mobile: e.target.value }))}
                    placeholder="01xxxxxxxxx"
                    inputMode="tel"
                    dir="ltr"
                    required
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', textAlign: 'right', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الرقم القومي (14 رقم)</label>
                  <input
                    value={draft.nationalId}
                    onChange={(e) => setDraft((current) => ({ ...current, nationalId: e.target.value }))}
                    placeholder="اختياري - 14 رقم"
                    inputMode="numeric"
                    maxLength={14}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
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
                {draft.compensationType === 'monthly' ? (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الراتب الأساسي الشهري (ج.م)</label>
                      <input
                        inputMode="decimal"
                        min="0"
                        value={draft.baseSalary}
                        onChange={(e) => setDraft((current) => ({ ...current, baseSalary: e.target.value }))}
                        placeholder="0.00"
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الراتب التأميني (ج.م)</label>
                      <input
                        inputMode="decimal"
                        min="0"
                        value={draft.insuranceSalary}
                        onChange={(e) => setDraft((current) => ({ ...current, insuranceSalary: e.target.value }))}
                        placeholder="اختياري"
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>أجر الساعة (ج.م) <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        inputMode="decimal"
                        min="0"
                        value={draft.hourlyRate}
                        onChange={(e) => setDraft((current) => ({ ...current, hourlyRate: e.target.value }))}
                        placeholder="0.00"
                        required
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>ساعات العمل اليومية <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        inputMode="decimal"
                        min="0"
                        value={draft.expectedDailyHours}
                        onChange={(e) => setDraft((current) => ({ ...current, expectedDailyHours: e.target.value }))}
                        placeholder="8"
                        required
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </>
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
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>البيانات الوظيفية والتعاقد</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>القسم</label>
                  <select
                    value={draft.departmentId}
                    onChange={(e) => setDraft((current) => ({ ...current, departmentId: e.target.value }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  >
                    <option value="">اختر القسم...</option>
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
                    <option value="">اختر المسمى...</option>
                    {jobTitles.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>الوظيفة/المنصب</label>
                  <select
                    value={draft.positionId}
                    onChange={(e) => setDraft((current) => ({ ...current, positionId: e.target.value }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  >
                    <option value="">اختر المنصب...</option>
                    {positions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                  </select>
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
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>نوع العقد</label>
                  <input
                    value={draft.contractType}
                    onChange={(e) => setDraft((current) => ({ ...current, contractType: e.target.value }))}
                    placeholder="محدد المدة / دائم"
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
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>رصيد الإجازات السنوي (يوم)</label>
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

          {/* Bottom Section: Notes & Actions */}
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
              <Button type="submit" disabled={isBusy} style={{ minWidth: '140px' }}>{isBusy ? 'جاري الحفظ...' : 'حفظ الموظف'}</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/hr/employees')} disabled={isBusy}>إلغاء</Button>
            </div>
          </div>

        </div>
      </form>
      </main>
    </div>
  );
}
