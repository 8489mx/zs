import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';

interface EmployeeDraft {
  employeeNo: string;
  firstName: string;
  lastName: string;
  mobile: string;
  nationalId: string;
  departmentId: string;
  jobTitleId: string;
  positionId: string;
  hireDate: string;
  status: 'active' | 'inactive';
  contractType: string;
  baseSalary: string;
  compensationType: 'monthly' | 'hourly';
  hourlyRate: string;
  expectedDailyHours: string;
  scheduledCheckInTime: string;
  scheduledCheckOutTime: string;
  graceMinutes: string;
  overtimePolicy: 'review_only' | 'disabled' | 'auto_approved';
  notes: string;
}

const initialDraft: EmployeeDraft = {
  employeeNo: '',
  firstName: '',
  lastName: '',
  mobile: '',
  nationalId: '',
  departmentId: '',
  jobTitleId: '',
  positionId: '',
  hireDate: '',
  status: 'active',
  contractType: '',
  baseSalary: '',
  compensationType: 'monthly',
  hourlyRate: '',
  expectedDailyHours: '',
  scheduledCheckInTime: '',
  scheduledCheckOutTime: '',
  graceMinutes: '',
  overtimePolicy: 'review_only',
  notes: '',
};

function normalizeArabicDigits(value: string) {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function normalizeNumberText(value: string) {
  return normalizeArabicDigits(value).replace(/[،,]/g, '.').trim();
}

function normalizeDigitsOnly(value: string) {
  return normalizeArabicDigits(value).replace(/\D/g, '');
}

function normalizePhone(value: string) {
  return normalizeArabicDigits(value).replace(/\s+/g, '').trim();
}

function toId(value: string) {
  const numeric = Number(normalizeDigitsOnly(value || ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function getCreatedEmployeeId(
  result: unknown,
  draft: EmployeeDraft,
  firstName: string,
) {
  const responseRows = ((result as { employees?: Array<{ id?: string | number; firstName?: string; lastName?: string; employeeNo?: string }> })?.employees || []);
  const lastName = String(draft.lastName || '').trim();
  const employeeNo = String(draft.employeeNo || '').trim();
  const matched = responseRows.find((row) => {
    const sameFirst = String(row.firstName || '').trim() === firstName;
    const sameLast = String(row.lastName || '').trim() === lastName;
    const sameNo = employeeNo && String(row.employeeNo || '').trim() === employeeNo;
    return sameNo || (sameFirst && sameLast);
  });
  return matched?.id != null ? String(matched.id) : '';
}

export function EmployeeCreatePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<EmployeeDraft>(initialDraft);
  const [submitError, setSubmitError] = useState('');

  const workspace = useHrWorkspace({ page: 1, pageSize: 200 });
  const mutations = useHrMutations();

  const departments = useMemo(() => workspace.departments.data?.rows || [], [workspace.departments.data?.rows]);
  const jobTitles = useMemo(() => workspace.jobTitles.data?.rows || [], [workspace.jobTitles.data?.rows]);
  const positions = useMemo(() => workspace.positions.data?.rows || [], [workspace.positions.data?.rows]);

  const reviewWarnings = useMemo(() => {
    const warnings: string[] = [];
    const salaryText = normalizeNumberText(draft.baseSalary);
    const nationalId = normalizeDigitsOnly(draft.nationalId);
    if (!String(draft.firstName || '').trim()) warnings.push('الاسم الأول مطلوب قبل الحفظ.');
    if (!normalizePhone(draft.mobile)) warnings.push('الموبايل مطلوب قبل الحفظ.');
    if (!String(draft.hireDate || '').trim()) warnings.push('تاريخ التعيين مطلوب قبل الحفظ.');
    if (nationalId && nationalId.length !== 14) warnings.push('الرقم القومي يجب أن يكون 14 رقمًا إذا تم إدخاله.');
    if (!draft.departmentId) warnings.push('القسم غير محدد ويمكن استكماله لاحقًا.');
    if (!draft.jobTitleId) warnings.push('المسمى الوظيفي غير محدد ويمكن استكماله لاحقًا.');
    if (salaryText && Number.isNaN(Number(salaryText))) warnings.push('المرتب الأساسي يجب أن يكون رقمًا صحيحًا.');
    return warnings;
  }, [draft]);

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

    if (!firstName) {
      setSubmitError('الاسم الأول مطلوب.');
      return;
    }
    if (!mobile) {
      setSubmitError('الموبايل مطلوب.');
      return;
    }
    if (!hireDate) {
      setSubmitError('تاريخ التعيين مطلوب.');
      return;
    }
    if (nationalId && !/^\d{14}$/.test(nationalId)) {
      setSubmitError('الرقم القومي يجب أن يكون 14 رقمًا.');
      return;
    }
    if (Number.isNaN(baseSalary)) {
      setSubmitError('المرتب الأساسي يجب أن يكون رقمًا صحيحًا.');
      return;
    }
    if (draft.compensationType === 'hourly') {
      if (!(hourlyRate > 0)) {
        setSubmitError('أجر الساعة مطلوب للموظف بالأجر بالساعة.');
        return;
      }
      if (!(expectedDailyHours > 0)) {
        setSubmitError('عدد ساعات العمل اليومية المتوقعة مطلوب للموظف بالأجر بالساعة.');
        return;
      }
    }

    try {
      const employeePayload = {
        employeeNo: normalizeArabicDigits(String(draft.employeeNo || '').trim()) || undefined,
        firstName,
        lastName: String(draft.lastName || '').trim() || undefined,
        nationalId: nationalId || undefined,
        status: draft.status,
        departmentId: toId(draft.departmentId),
        jobTitleId: toId(draft.jobTitleId),
        positionId: toId(draft.positionId),
        hireDate,
        notes: String(draft.notes || '').trim() || undefined,
        compensationType: draft.compensationType,
        hourlyRate: draft.compensationType === 'hourly' ? hourlyRate : undefined,
        expectedDailyHours: draft.compensationType === 'hourly' ? expectedDailyHours : undefined,
        scheduledCheckInTime: draft.scheduledCheckInTime || undefined,
        scheduledCheckOutTime: draft.scheduledCheckOutTime || undefined,
        graceMinutes,
        overtimePolicy: draft.overtimePolicy,
      };

      const result = await mutations.saveEmployee.mutateAsync({ payload: employeePayload });
      const createdEmployeeId = getCreatedEmployeeId(result, draft, firstName);

      if (createdEmployeeId) {
        await mutations.saveContact.mutateAsync({
          employeeId: createdEmployeeId,
          payload: {
            contactType: 'phone',
            value: mobile,
            label: 'الموبايل',
            isPrimary: true,
            notes: '',
          },
        });

        if (contractType || baseSalary > 0) {
          await mutations.saveContract.mutateAsync({
            employeeId: createdEmployeeId,
            payload: {
              contractType: contractType || 'standard',
              status: 'active',
              startDate: hireDate,
              baseSalary: baseSalary > 0 ? baseSalary : 0,
              currency: 'EGP',
              notes: 'تم إنشاؤه من صفحة إضافة موظف.',
            },
          });
        }
      }

      navigate('/hr/employees');
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'تعذر حفظ الموظف.'));
    }
  }

  const isBusy = mutations.saveEmployee.isPending || mutations.saveContact.isPending || mutations.saveContract.isPending;

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="إضافة موظف"
        description="إضافة موظف جديد ببيانات واضحة، مع مراجعة سريعة للحقول الناقصة قبل الحفظ."
      />

      <form onSubmit={(event) => { void handleSubmit(event); }}>
        <Card title="البيانات الأساسية" description="أدخل بيانات التعريف الأساسية للموظف.">
          <div className="form-grid">
            <div className="field">
              <span>كود الموظف</span>
              <input value={draft.employeeNo} onChange={(e) => setDraft((current) => ({ ...current, employeeNo: e.target.value }))} />
            </div>
            <div className="field">
              <span>الاسم الأول *</span>
              <input value={draft.firstName} onChange={(e) => setDraft((current) => ({ ...current, firstName: e.target.value }))} required />
            </div>
            <div className="field">
              <span>اسم العائلة</span>
              <input value={draft.lastName} onChange={(e) => setDraft((current) => ({ ...current, lastName: e.target.value }))} />
            </div>
            <div className="field">
              <span>الموبايل *</span>
              <input value={draft.mobile} onChange={(e) => setDraft((current) => ({ ...current, mobile: e.target.value }))} inputMode="tel" required />
            </div>
            <div className="field">
              <span>الرقم القومي</span>
              <input
                value={draft.nationalId}
                onChange={(e) => setDraft((current) => ({ ...current, nationalId: e.target.value }))}
                inputMode="numeric"
                maxLength={14}
                placeholder="اختياري"
              />
            </div>
          </div>
        </Card>

        <Card title="البيانات الوظيفية" description="حدد القسم والمسمى الوظيفي وتاريخ التعيين.">
          <div className="form-grid">
            <div className="field">
              <span>القسم</span>
              <select value={draft.departmentId} onChange={(e) => setDraft((current) => ({ ...current, departmentId: e.target.value }))}>
                <option value="">اختيار</option>
                {departments.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span>المسمى الوظيفي</span>
              <select value={draft.jobTitleId} onChange={(e) => setDraft((current) => ({ ...current, jobTitleId: e.target.value }))}>
                <option value="">اختيار</option>
                {jobTitles.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span>الوظيفة/المنصب</span>
              <select value={draft.positionId} onChange={(e) => setDraft((current) => ({ ...current, positionId: e.target.value }))}>
                <option value="">اختيار</option>
                {positions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span>تاريخ التعيين *</span>
              <input type="date" value={draft.hireDate} onChange={(e) => setDraft((current) => ({ ...current, hireDate: e.target.value }))} required />
            </div>
            <div className="field">
              <span>الحالة</span>
              <select value={draft.status} onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value === 'inactive' ? 'inactive' : 'active' }))}>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="العقد والمرتب" description="اختياري. لو أدخلت نوع التعاقد أو المرتب الأساسي سيتم إنشاء عقد مبدئي للموظف، ويمكن استكمال التفاصيل داخل ملف الموظف لاحقًا.">
          <div className="form-grid">
            <div className="field">
              <span>نوع التعاقد</span>
              <input value={draft.contractType} onChange={(e) => setDraft((current) => ({ ...current, contractType: e.target.value }))} placeholder="اختياري" />
            </div>
            <div className="field">
              <span>المرتب الأساسي</span>
              <input inputMode="decimal" min="0" value={draft.baseSalary} onChange={(e) => setDraft((current) => ({ ...current, baseSalary: e.target.value }))} placeholder="اختياري" />
            </div>
          </div>
        </Card>

        <Card title="بيانات الدوام والأجر" description="تحديد نوع الأجر وجدول الدوام المتوقع للموظف.">
          <div className="form-grid">
            <label className="field">
              <span>نوع الأجر</span>
              <select value={draft.compensationType} onChange={(e) => setDraft((current) => ({ ...current, compensationType: e.target.value === 'hourly' ? 'hourly' : 'monthly' }))}>
                <option value="monthly">راتب شهري</option>
                <option value="hourly">أجر بالساعة</option>
              </select>
            </label>
            {draft.compensationType === 'monthly' ? (
              <label className="field">
                <span>الراتب الشهري الأساسي</span>
                <input inputMode="decimal" min="0" value={draft.baseSalary} onChange={(e) => setDraft((current) => ({ ...current, baseSalary: e.target.value }))} placeholder="اختياري" />
              </label>
            ) : (
              <>
                <label className="field">
                  <span>أجر الساعة</span>
                  <input inputMode="decimal" min="0" value={draft.hourlyRate} onChange={(e) => setDraft((current) => ({ ...current, hourlyRate: e.target.value }))} />
                </label>
                <label className="field">
                  <span>عدد ساعات العمل اليومية المتوقعة</span>
                  <input inputMode="decimal" min="0" value={draft.expectedDailyHours} onChange={(e) => setDraft((current) => ({ ...current, expectedDailyHours: e.target.value }))} />
                </label>
              </>
            )}
            <label className="field">
              <span>موعد الحضور</span>
              <input type="time" value={draft.scheduledCheckInTime} onChange={(e) => setDraft((current) => ({ ...current, scheduledCheckInTime: e.target.value }))} />
            </label>
            <label className="field">
              <span>موعد الانصراف</span>
              <input type="time" value={draft.scheduledCheckOutTime} onChange={(e) => setDraft((current) => ({ ...current, scheduledCheckOutTime: e.target.value }))} />
            </label>
            <label className="field">
              <span>فترة السماح بالدقائق</span>
              <input inputMode="numeric" min="0" value={draft.graceMinutes} onChange={(e) => setDraft((current) => ({ ...current, graceMinutes: e.target.value }))} />
            </label>
            <label className="field">
              <span>سياسة الوقت الإضافي</span>
              <select value={draft.overtimePolicy} onChange={(e) => setDraft((current) => ({ ...current, overtimePolicy: (e.target.value as 'review_only' | 'disabled' | 'auto_approved') || 'review_only' }))}>
                <option value="review_only">مراجعة واعتماد قبل الاحتساب</option>
                <option value="disabled">غير محتسب</option>
                <option value="auto_approved">محتسب تلقائيًا</option>
              </select>
            </label>
          </div>
        </Card>

        <Card title="مراجعة قبل الحفظ" description="تنبيهات بسيطة لتقليل الملفات الناقصة. التنبيهات التنظيمية لا تمنع الحفظ.">
          {reviewWarnings.length ? (
            <ul className="muted" style={{ margin: 0, paddingInlineStart: 20 }}>
              {reviewWarnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          ) : <p className="muted">البيانات الأساسية جاهزة للحفظ.</p>}
        </Card>

        <Card title="ملاحظات" description="أي ملاحظات إضافية على ملف الموظف.">
          <div className="field field-wide">
            <span>ملاحظات</span>
            <textarea rows={4} value={draft.notes} onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))} />
          </div>

          {submitError ? <div className="error-box" style={{ marginTop: 12 }}>{submitError}</div> : null}

          <div className="actions compact-actions" style={{ marginTop: 16 }}>
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/employees')} disabled={isBusy}>إلغاء</Button>
            <Button type="submit" disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ الموظف'}</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
