import { useTranslation } from 'react-i18next';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';
import { getErrorMessage } from '@/lib/errors';
import { useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';
import {
  createdMasterId,
  getCreatedEmployeeId,
  getTodayDateString,
  initialDraft,
  normalizeArabicDigits,
  normalizeDigitsOnly,
  normalizeNumberText,
  normalizePhone,
  parseEgyptianNationalId,
  shiftPresets,
  splitFullName,
  toId,
  CONTRACT_TYPE_OPTIONS,
  POPULAR_BANKS,
  type EmployeeDraft,
} from '@/features/hr/pages/employee-create/employee-create.helpers';

export function EmployeeCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currencyCode } = useSystemCurrency();
  const [draft, setDraft] = useState<EmployeeDraft>(initialDraft);
  const [submitError, setSubmitError] = useState('');
  const [andAddAnother, setAndAddAnother] = useState(false);

  const workspace = useHrWorkspace({ page: 1, pageSize: 200 });
  const mutations = useHrMutations();
  const departments = useMemo(() => workspace.departments.data?.rows || [], [workspace.departments.data?.rows]);
  const jobTitles = useMemo(() => workspace.jobTitles.data?.rows || [], [workspace.jobTitles.data?.rows]);
  const positions = useMemo(() => workspace.positions.data?.rows || [], [workspace.positions.data?.rows]);

  const nationalIdInfo = useMemo(() => {
    // Egyptian ID decoder is informational and only applies to 14-digit IDs.
    return normalizeDigitsOnly(draft.nationalId).length === 14
      ? parseEgyptianNationalId(draft.nationalId)
      : { isValid: false, error: '' };
  }, [draft.nationalId]);

  async function handleQuickCreateMaster(kind: 'departments' | 'job-titles' | 'positions', name: string) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return;
    try {
      const payload: any = { name: trimmed };
      if (kind === 'positions') {
        if (draft.departmentId) payload.departmentId = toId(draft.departmentId);
        if (draft.jobTitleId) payload.jobTitleId = toId(draft.jobTitleId);
      }
      const res: any = await mutations.saveMasterData.mutateAsync({ kind, payload });
      const newId = createdMasterId(res, trimmed) || res?.id || '';
      if (kind === 'departments') {
        setDraft((cur) => ({ ...cur, departmentId: String(newId) }));
        toast.success(`تمت إضافة واختيار قسم "${trimmed}" بنجاح`);
      } else if (kind === 'job-titles') {
        setDraft((cur) => ({ ...cur, jobTitleId: String(newId) }));
        toast.success(`تمت إضافة واختيار مسمى "${trimmed}" بنجاح`);
      } else if (kind === 'positions') {
        setDraft((cur) => ({ ...cur, positionId: String(newId) }));
        toast.success(`تمت إضافة واختيار منصب "${trimmed}" بنجاح`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'تعذر إضافة البيانات.'));
    }
  }

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
    if (nationalId && !/^\d{6,20}$/.test(nationalId)) { setSubmitError('رقم الهوية أو الإقامة يجب أن يكون من 6 إلى 20 رقمًا.'); return; }
    if (Number.isNaN(baseSalary)) { setSubmitError('الراتب الأساسي يجب أن يكون رقمًا صحيحًا.'); return; }
    if (draft.compensationType === 'hourly' && !(hourlyRate > 0)) { setSubmitError('أجر الساعة مطلوب للموظف بالأجر بالساعة.'); return; }
    if (draft.compensationType === 'monthly' && !(baseSalary > 0)) { setSubmitError('لازم تسجل الراتب الشهري قبل إضافة الموظف علشان كشف المرتبات ما يطلعش صفر.'); return; }
    if ((draft.compensationType === 'monthly' || contractType) && !currencyCode) {
      setSubmitError('حدد العملة في إعدادات المنشأة قبل إنشاء العقد.');
      return;
    }
    if (expectedDailyHoursText && !(expectedDailyHours > 0 && expectedDailyHours <= 24)) { setSubmitError('ساعات العمل المتوقعة يجب أن تكون أكبر من صفر وحتى 24 أو تُترك فارغة.'); return; }

    try {
      const result = await mutations.saveEmployee.mutateAsync({ payload: { employeeNo: normalizeArabicDigits(String(draft.employeeNo || '').trim()) || undefined, firstName, lastName: String(draft.lastName || '').trim() || undefined, nationalId: nationalId || undefined, mobile, initialContractBaseSalary: (draft.compensationType === 'monthly' || contractType) ? baseSalary : undefined, initialContractType: contractType || 'standard', initialContractCurrency: currencyCode || undefined, status: draft.status, departmentId: toId(draft.departmentId), jobTitleId: toId(draft.jobTitleId), positionId: toId(draft.positionId), hireDate, notes: String(draft.notes || '').trim() || undefined, compensationType: draft.compensationType, payFrequency: draft.payFrequency, hourlyRate: draft.compensationType === 'hourly' ? hourlyRate : undefined, expectedDailyHours: draft.compensationType === 'hourly' && expectedDailyHoursText ? expectedDailyHours : undefined, scheduledCheckInTime: draft.scheduledCheckInTime || undefined, scheduledCheckOutTime: draft.scheduledCheckOutTime || undefined, graceMinutes, overtimePolicy: draft.overtimePolicy, attendancePolicy: draft.attendancePolicy, commissionType: draft.commissionType, commissionValue: draft.commissionValue ? Number(draft.commissionValue) : undefined, commissionTarget: draft.commissionTarget ? Number(draft.commissionTarget) : undefined, delayPolicy: draft.delayPolicy, hasSocialInsurance: draft.hasSocialInsurance, hasIncomeTax: draft.hasIncomeTax, bankName: String(draft.bankName || '').trim() || undefined, bankAccountNumber: String(draft.bankAccountNumber || '').trim() || undefined, iban: String(draft.iban || '').trim() || undefined, bankSwiftCode: String(draft.bankSwiftCode || '').trim() || undefined, annualLeaveBalance: draft.annualLeaveBalance ? Number(draft.annualLeaveBalance) : 21, insuranceSalary: draft.insuranceSalary ? Number(normalizeNumberText(draft.insuranceSalary)) : undefined } });
      const createdEmployeeId = getCreatedEmployeeId(result, draft, firstName);
      if (!createdEmployeeId) {
        throw new Error('تعذر التأكد من حفظ ملف الموظف والعقد.');
      }
      // Employee, primary mobile and initial contract are now created in one
      // backend transaction; do not retry duplicate standalone writes here.
      if (andAddAnother) {
        toast.success(`تم حفظ الموظف "${firstName}" بنجاح، يمكنك الآن إضافة موظف آخر`);
        setDraft({
          ...initialDraft,
          departmentId: draft.departmentId,
          jobTitleId: draft.jobTitleId,
          scheduledCheckInTime: draft.scheduledCheckInTime,
          scheduledCheckOutTime: draft.scheduledCheckOutTime,
          graceMinutes: draft.graceMinutes,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.success(`تم حفظ الموظف "${firstName}" بنجاح`);
        navigate('/hr/employees');
      }
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'تعذر حفظ الموظف.'));
    }
  }

  const isBusy = mutations.saveEmployee.isPending || mutations.saveMasterData.isPending;

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '20px' }}>
        <PageHeader
        title={t('hr.employee_create_page.s0', "إضافة موظف جديد")}
        description={t('hr.employee_create_page.s1', "سجل بيانات الموظف الأساسية، الوظيفية، ونظام الأجور والدوام في صفحة واحدة منظمة.")}
        actions={(
          <div className="compact-actions">
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/employees')} disabled={isBusy}>{t('hr.employee_create_page.s2', "إلغاء")}</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAndAddAnother(true);
                const formEl = document.getElementById('employee-create-form') as HTMLFormElement;
                formEl?.requestSubmit();
              }}
              disabled={isBusy}
            >
              + حفظ وإضافة آخر
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAndAddAnother(false);
                const formEl = document.getElementById('employee-create-form') as HTMLFormElement;
                formEl?.requestSubmit();
              }}
              disabled={isBusy}
            >
              {isBusy ? t('hr.employee_create_page.s3', "جاري الحفظ...") : t('hr.employee_create_page.s4', "حفظ الموظف")}
            </Button>
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
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!draft.lastName && val.includes(' ')) {
                        const { firstName: f, lastName: l } = splitFullName(val);
                        setDraft((cur) => ({ ...cur, firstName: f, lastName: l }));
                      } else {
                        setDraft((cur) => ({ ...cur, firstName: val }));
                      }
                    }}
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
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{t('hr.employee_create_page.s13', "رقم الهوية الوطنية / الإقامة")}</label>
                  <input
                    value={draft.nationalId}
                    onChange={(e) => setDraft((current) => ({ ...current, nationalId: e.target.value }))}
                    placeholder={t('hr.employee_create_page.s14', "اختياري - من 6 إلى 20 رقمًا")}
                    inputMode="numeric"
                    maxLength={20}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                  {nationalIdInfo.isValid && (
                    <div style={{ marginTop: '5px', fontSize: '0.75rem', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '5px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✓ تاريخ الميلاد: {nationalIdInfo.birthDateFormatted} · الجنس: {nationalIdInfo.gender} · {nationalIdInfo.governorate}</span>
                    </div>
                  )}
                  {nationalIdInfo.error && (
                    <div style={{ marginTop: '5px', fontSize: '0.75rem', color: '#b91c1c' }}>
                      {nationalIdInfo.error}
                    </div>
                  )}
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
                    onCreateOption={(name) => handleQuickCreateMaster('departments', name)}
                    createOptionLabel={(name) => `+ إضافة قسم جديد: "${name}"`}
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
                    onCreateOption={(name) => handleQuickCreateMaster('job-titles', name)}
                    createOptionLabel={(name) => `+ إضافة مسمى وظيفي جديد: "${name}"`}
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
                    onCreateOption={(name) => handleQuickCreateMaster('positions', name)}
                    createOptionLabel={(name) => `+ إضافة منصب جديد: "${name}"`}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569' }}>{t('hr.employee_create_page.s39', "تاريخ التعيين")} <span style={{ color: '#dc2626' }}>*</span></label>
                    <button
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, hireDate: getTodayDateString() }))}
                      style={{ background: 'none', border: 'none', color: '#170e5e', fontSize: '0.725rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      اليوم
                    </button>
                  </div>
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
                  <CustomSelect
                    value={draft.contractType}
                    onChange={(val) => setDraft((current) => ({ ...current, contractType: val }))}
                    options={CONTRACT_TYPE_OPTIONS}
                    onCreateOption={(val) => setDraft((current) => ({ ...current, contractType: val }))}
                    createOptionLabel={(val) => `+ استخدام نوع عقد: "${val}"`}
                    placeholder={t('hr.employee_create_page.s41', "محدد المدة / دائم")}
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
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '6px' }}>{t('hr.employee_create_page.s45', "مواعيد الدوام وسياسات الحضور")}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>
                  {shiftPresets.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setDraft((c) => ({
                        ...c,
                        scheduledCheckInTime: sp.checkIn,
                        scheduledCheckOutTime: sp.checkOut,
                        graceMinutes: sp.grace,
                        expectedDailyHours: c.compensationType === 'hourly' ? sp.hours : c.expectedDailyHours,
                      }))}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.725rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#1e293b',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                      title={sp.description}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>
              
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
                <CustomSelect
                  value={draft.bankName || ''}
                  onChange={(val) => setDraft((current) => ({ ...current, bankName: val }))}
                  options={[
                    { value: '', label: 'اختر أو اكتب اسم البنك...' },
                    ...POPULAR_BANKS,
                  ]}
                  onCreateOption={(val) => setDraft((current) => ({ ...current, bankName: val }))}
                  createOptionLabel={(val) => `+ استخدام: "${val}"`}
                  placeholder={t('hr.employee_create_page.s63', "مثال: البنك الأهلي المصري")}
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
              <Button
                type="submit"
                onClick={() => setAndAddAnother(false)}
                disabled={isBusy}
                style={{ minWidth: '130px' }}
              >
                {isBusy && !andAddAnother ? t('hr.employee_create_page.s71', "جاري الحفظ...") : t('hr.employee_create_page.s72', "حفظ الموظف")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAndAddAnother(true);
                  const formEl = document.getElementById('employee-create-form') as HTMLFormElement;
                  formEl?.requestSubmit();
                }}
                disabled={isBusy}
                style={{ minWidth: '160px' }}
              >
                {isBusy && andAddAnother ? "جاري الحفظ..." : "+ حفظ وإضافة موظف آخر"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/hr/employees')} disabled={isBusy}>{t('hr.employee_create_page.s73', "إلغاء")}</Button>
            </div>
          </div>

        </div>
      </form>
      </main>
    </div>
  );
}
