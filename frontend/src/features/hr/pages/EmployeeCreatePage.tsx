import { useTranslation } from 'react-i18next';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
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
  const { t } = useTranslation();
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
    if (draft.compensationType === 'monthly' && !(baseSalary > 0)) { setSubmitError('لازم تسجل الراتب الشهري قبل إضافة الموظف علشان كشف المرتبات ما يطلعش صفر.'); return; }
    if (expectedDailyHoursText && !(expectedDailyHours > 0 && expectedDailyHours <= 24)) { setSubmitError('ساعات العمل المتوقعة يجب أن تكون أكبر من صفر وحتى 24 أو تُترك فارغة.'); return; }

    try {
      const result = await mutations.saveEmployee.mutateAsync({ payload: { employeeNo: normalizeArabicDigits(String(draft.employeeNo || '').trim()) || undefined, firstName, lastName: String(draft.lastName || '').trim() || undefined, nationalId: nationalId || undefined, status: draft.status, departmentId: toId(draft.departmentId), jobTitleId: toId(draft.jobTitleId), positionId: toId(draft.positionId), hireDate, notes: String(draft.notes || '').trim() || undefined, compensationType: draft.compensationType, payFrequency: draft.payFrequency, hourlyRate: draft.compensationType === 'hourly' ? hourlyRate : undefined, expectedDailyHours: draft.compensationType === 'hourly' && expectedDailyHoursText ? expectedDailyHours : undefined, scheduledCheckInTime: draft.scheduledCheckInTime || undefined, scheduledCheckOutTime: draft.scheduledCheckOutTime || undefined, graceMinutes, overtimePolicy: draft.overtimePolicy, attendancePolicy: draft.attendancePolicy, commissionType: draft.commissionType, commissionValue: draft.commissionValue ? Number(draft.commissionValue) : undefined, commissionTarget: draft.commissionTarget ? Number(draft.commissionTarget) : undefined, delayPolicy: draft.delayPolicy, hasSocialInsurance: draft.hasSocialInsurance, hasIncomeTax: draft.hasIncomeTax, bankName: String(draft.bankName || '').trim() || undefined, bankAccountNumber: String(draft.bankAccountNumber || '').trim() || undefined, iban: String(draft.iban || '').trim() || undefined, bankSwiftCode: String(draft.bankSwiftCode || '').trim() || undefined, annualLeaveBalance: draft.annualLeaveBalance ? Number(draft.annualLeaveBalance) : 21, insuranceSalary: draft.insuranceSalary ? Number(normalizeNumberText(draft.insuranceSalary)) : undefined } });
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
        title={t('hr.employee_create_page.s0', "إضافة موظف جديد")}
        description={t('hr.employee_create_page.s1', "سجل بيانات الموظف الأساسية، الوظيفية، ونظام الأجور والدوام في صفحة واحدة منظمة.")}
        actions={(
          <div className="compact-actions">
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/employees')} disabled={isBusy}>{t('hr.employee_create_page.s2', "إلغاء")}</Button>
            <Button type="button" onClick={() => { const formEl = document.getElementById('employee-create-form') as HTMLFormElement; formEl?.requestSubmit(); }} disabled={isBusy}>{isBusy ? t('hr.employee_create_page.s3', "جاري الحفظ...") : t('hr.employee_create_page.s4', "حفظ الموظف")}</Button>
          </div>
        )}
      />

      <form id="employee-create-form" onSubmit={(event) => { void handleSubmit(event); }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Top Row: Personal Data (Right) & Compensation (Left) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
            
            {/* Top Right: Personal Data */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>{t('hr.employee_create_page.s5', "البيانات الأساسية والاتصال *")}</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s6', "كود الموظف")}</label>
                  <input
                    value={draft.employeeNo}
                    onChange={(e) => setDraft((current) => ({ ...current, employeeNo: e.target.value }))}
                    placeholder={t('hr.employee_create_page.s7', "تلقائي")}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s8', "الاسم الأول")} <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    value={draft.firstName}
                    onChange={(e) => setDraft((current) => ({ ...current, firstName: e.target.value }))}
                    placeholder={t('hr.employee_create_page.s9', "الاسم الأول")}
                    required
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s10', "اسم العائلة")}</label>
                  <input
                    value={draft.lastName}
                    onChange={(e) => setDraft((current) => ({ ...current, lastName: e.target.value }))}
                    placeholder={t('hr.employee_create_page.s11', "اسم العائلة")}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s12', "الموبايل")} <span style={{ color: '#dc2626' }}>*</span></label>
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
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s13', "الرقم القومي (14 رقم)")}</label>
                  <input
                    value={draft.nationalId}
                    onChange={(e) => setDraft((current) => ({ ...current, nationalId: e.target.value }))}
                    placeholder={t('hr.employee_create_page.s14', "اختياري - 14 رقم")}
                    inputMode="numeric"
                    maxLength={14}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* Top Left: Compensation */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>{t('hr.employee_create_page.s15', "نظام الأجور والراتب")}</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s16', "نوع الأجر")}</label>
                  <CustomSelect
                    value={draft.compensationType}
                    onChange={(val) => setDraft((current) => ({ ...current, compensationType: val === 'hourly' ? 'hourly' : 'monthly' }))}
                    options={[
                      { value: 'monthly', label: t('hr.employee_create_page.s17', "راتب شهري ثابت") },
                      { value: 'hourly', label: t('hr.employee_create_page.s18', "أجر بالساعة") },
                    ]}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s19', "دورة القبض")}</label>
                  <CustomSelect
                    value={draft.payFrequency}
                    onChange={(val) => setDraft((current) => ({ ...current, payFrequency: val as any }))}
                    options={[
                      { value: 'monthly', label: t('hr.employee_create_page.s20', "شهري") },
                      { value: 'weekly', label: t('hr.employee_create_page.s21', "أسبوعي") },
                      { value: 'biweekly', label: t('hr.employee_create_page.s22', "نصف شهري") },
                      { value: 'daily', label: t('hr.employee_create_page.s23', "يومي") },
                    ]}
                  />
                </div>

                {draft.compensationType === 'monthly' ? (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s24', "الراتب الأساسي الشهري (")}{getGlobalCurrencySymbol()})</label>
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
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s25', "الراتب التأميني (")}{getGlobalCurrencySymbol()})</label>
                      <input
                        inputMode="decimal"
                        min="0"
                        value={draft.insuranceSalary}
                        onChange={(e) => setDraft((current) => ({ ...current, insuranceSalary: e.target.value }))}
                        placeholder={t('hr.employee_create_page.s26', "اختياري")}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s27', "أجر الساعة (")}{getGlobalCurrencySymbol()}) <span style={{ color: '#dc2626' }}>*</span></label>
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
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s28', "ساعات العمل اليومية (اختياري)")}</label>
                      <input
                        inputMode="decimal"
                        min="0"
                        value={draft.expectedDailyHours}
                        onChange={(e) => setDraft((current) => ({ ...current, expectedDailyHours: e.target.value }))}
                        placeholder="اختياري للدوام المرن"
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </>
                )}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s29', "التأمينات والضرائب")}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 14px', minHeight: '38px', boxSizing: 'border-box' }}>
                    <label style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', margin: 0, userSelect: 'none' }}>
                      <input type="checkbox" checked={draft.hasSocialInsurance} onChange={(e) => setDraft((current) => ({ ...current, hasSocialInsurance: e.target.checked }))} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }} />
                      <span style={{ whiteSpace: 'nowrap' }}>{t('hr.employee_create_page.s30', "تأمينات اجتماعية")}</span>
                    </label>
                    <label style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', margin: 0, userSelect: 'none' }}>
                      <input type="checkbox" checked={draft.hasIncomeTax} onChange={(e) => setDraft((current) => ({ ...current, hasIncomeTax: e.target.checked }))} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }} />
                      <span style={{ whiteSpace: 'nowrap' }}>{t('hr.employee_create_page.s31', "ضريبة كسب عمل")}</span>
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
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>{t('hr.employee_create_page.s32', "البيانات الوظيفية والتعاقد")}</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s33', "القسم")}</label>
                  <CustomSelect
                    value={draft.departmentId}
                    onChange={(val) => setDraft((current) => ({ ...current, departmentId: val }))}
                    options={[
                      { value: '', label: t('hr.employee_create_page.s34', "اختر القسم...") },
                      ...departments.map((entry) => ({ value: entry.id, label: entry.name })),
                    ]}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s35', "المسمى الوظيفي")}</label>
                  <CustomSelect
                    value={draft.jobTitleId}
                    onChange={(val) => setDraft((current) => ({ ...current, jobTitleId: val }))}
                    options={[
                      { value: '', label: t('hr.employee_create_page.s36', "اختر المسمى...") },
                      ...jobTitles.map((entry) => ({ value: entry.id, label: entry.name })),
                    ]}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s37', "الوظيفة/المنصب")}</label>
                  <CustomSelect
                    value={draft.positionId}
                    onChange={(val) => setDraft((current) => ({ ...current, positionId: val }))}
                    options={[
                      { value: '', label: t('hr.employee_create_page.s38', "اختر المنصب...") },
                      ...positions.map((entry) => ({ value: entry.id, label: entry.name })),
                    ]}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s39', "تاريخ التعيين")} <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    type="date"
                    value={draft.hireDate}
                    onChange={(e) => setDraft((current) => ({ ...current, hireDate: e.target.value }))}
                    required
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s40', "نوع العقد")}</label>
                  <input
                    value={draft.contractType}
                    onChange={(e) => setDraft((current) => ({ ...current, contractType: e.target.value }))}
                    placeholder={t('hr.employee_create_page.s41', "محدد المدة / دائم")}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s42', "حالة الموظف")}</label>
                  <CustomSelect
                    value={draft.status}
                    onChange={(val) => setDraft((current) => ({ ...current, status: val === 'inactive' ? 'inactive' : 'active' }))}
                    options={[
                      { value: 'active', label: t('hr.employee_create_page.s43', "نشط") },
                      { value: 'inactive', label: t('hr.employee_create_page.s44', "غير نشط") },
                    ]}
                  />
                </div>

              </div>
            </div>

            {/* Bottom Left: Attendance & Working Hours */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>{t('hr.employee_create_page.s45', "مواعيد الدوام وسياسات الحضور")}</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s46', "موعد الحضور")}</label>
                  <input
                    type="time"
                    value={draft.scheduledCheckInTime}
                    onChange={(e) => setDraft((current) => ({ ...current, scheduledCheckInTime: e.target.value }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s47', "موعد الانصراف")}</label>
                  <input
                    type="time"
                    value={draft.scheduledCheckOutTime}
                    onChange={(e) => setDraft((current) => ({ ...current, scheduledCheckOutTime: e.target.value }))}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s48', "فترة السماح (دقائق)")}</label>
                  <input
                    inputMode="numeric"
                    value={draft.graceMinutes}
                    onChange={(e) => setDraft((current) => ({ ...current, graceMinutes: e.target.value }))}
                    placeholder="15"
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s49', "رصيد الإجازات السنوي (يوم)")}</label>
                  <input
                    inputMode="numeric"
                    value={draft.annualLeaveBalance}
                    onChange={(e) => setDraft((current) => ({ ...current, annualLeaveBalance: e.target.value }))}
                    placeholder="21"
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s50', "سياسة التأخير")}</label>
                  <CustomSelect
                    value={draft.delayPolicy}
                    onChange={(val) => setDraft((current) => ({ ...current, delayPolicy: val }))}
                    options={[
                      { value: 'inherit', label: t('hr.employee_create_page.s51', "حسب سياسة المؤسسة") },
                      { value: 'standard', label: t('hr.employee_create_page.s52', "قياسي (دقائق)") },
                      { value: 'progressive', label: t('hr.employee_create_page.s53', "تصاعدي") },
                      { value: 'strict', label: t('hr.employee_create_page.s54', "صارم") },
                      { value: 'disabled', label: t('hr.employee_create_page.s55', "معطل") },
                    ]}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s56', "سياسة الإضافي")}</label>
                  <CustomSelect
                    value={draft.overtimePolicy}
                    onChange={(val) => setDraft((current) => ({ ...current, overtimePolicy: val as any }))}
                    options={[
                      { value: 'review_only', label: t('hr.employee_create_page.s57', "مراجعة واعتماد") },
                      { value: 'auto_approved', label: t('hr.employee_create_page.s58', "اعتماد تلقائي") },
                      { value: 'disabled', label: t('hr.employee_create_page.s59', "معطل") },
                    ]}
                  />
                </div>

              </div>
            </div>

          </div>

          {/* Bank & WPS Details Card */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{t('hr.employee_create_page.s60', "البيانات البنكية وحماية الأجور (WPS / SIF)")}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('hr.employee_create_page.s61', "مطلوب للتحويلات البنكية المباشرة ونظام حماية الأجور")}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s62', "اسم البنك")}</label>
                <input
                  value={draft.bankName || ''}
                  onChange={(e) => setDraft((current) => ({ ...current, bankName: e.target.value }))}
                  placeholder={t('hr.employee_create_page.s63', "مثال: مصرف الراجحي / البنك الأهلي")}
                  style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s64', "رقم الحساب البنكي")}</label>
                <input
                  value={draft.bankAccountNumber || ''}
                  onChange={(e) => setDraft((current) => ({ ...current, bankAccountNumber: e.target.value }))}
                  placeholder={t('hr.employee_create_page.s65', "رقم الحساب البنكي")}
                  style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s66', "رقم الآيبان الدولي (IBAN)")}</label>
                <input
                  value={draft.iban || ''}
                  onChange={(e) => setDraft((current) => ({ ...current, iban: e.target.value.toUpperCase() }))}
                  placeholder="SA0000000000000000000000"
                  dir="ltr"
                  style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box', textAlign: 'left', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s67', "رمز السويفت / كود البنك (SWIFT / Routing)")}</label>
                <input
                  value={draft.bankSwiftCode || ''}
                  onChange={(e) => setDraft((current) => ({ ...current, bankSwiftCode: e.target.value.toUpperCase() }))}
                  placeholder={t('hr.employee_create_page.s68', "مثال: RJHI / NCBK")}
                  dir="ltr"
                  style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box', textAlign: 'left', fontFamily: 'monospace' }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Section: Notes & Actions */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s69', "ملاحظات إدارية (اختياري)")}</label>
              <input
                value={draft.notes}
                onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))}
                placeholder={t('hr.employee_create_page.s70', "أدخل أي ملاحظات إدارية على ملف الموظف...")}
                style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            {submitError ? <div className="error-box" style={{ margin: 0 }}>{submitError}</div> : null}

            <div className="actions compact-actions" style={{ justifyContent: 'flex-start', gap: '10px', marginTop: '4px' }}>
              <Button type="submit" disabled={isBusy} style={{ minWidth: '140px' }}>{isBusy ? t('hr.employee_create_page.s71', "جاري الحفظ...") : t('hr.employee_create_page.s72', "حفظ الموظف")}</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/hr/employees')} disabled={isBusy}>{t('hr.employee_create_page.s73', "إلغاء")}</Button>
            </div>
          </div>

        </div>
      </form>
      </main>
    </div>
  );
}
