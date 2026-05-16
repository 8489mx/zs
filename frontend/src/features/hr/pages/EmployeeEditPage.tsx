import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { getErrorMessage } from '@/lib/errors';
import type { HrEmployee } from '@/types/domain';
import { useHrMutations, useHrProfile } from '@/features/hr/hooks/useHr';

interface EmployeeEditDraft {
  employeeNo: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  hireDate: string;
  status: 'active' | 'inactive';
  notes: string;
  compensationType: 'monthly' | 'hourly';
  hourlyRate: string;
  expectedDailyHours: string;
  scheduledCheckInTime: string;
  scheduledCheckOutTime: string;
  graceMinutes: string;
  overtimePolicy: 'review_only' | 'disabled' | 'auto_approved';
}

const initialDraft: EmployeeEditDraft = {
  employeeNo: '',
  firstName: '',
  lastName: '',
  nationalId: '',
  hireDate: '',
  status: 'active',
  notes: '',
  compensationType: 'monthly',
  hourlyRate: '',
  expectedDailyHours: '',
  scheduledCheckInTime: '',
  scheduledCheckOutTime: '',
  graceMinutes: '',
  overtimePolicy: 'review_only',
};

function normalizeArabicDigits(value: string) {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function normalizeDigitsOnly(value: string) {
  return normalizeArabicDigits(value).replace(/\D/g, '');
}

function normalizeNumberText(value: string) {
  return normalizeArabicDigits(value).replace(/[،,]/g, '.').trim();
}

export function EmployeeEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const profile = useHrProfile(id);
  const mutations = useHrMutations();
  const [draft, setDraft] = useState<EmployeeEditDraft>(initialDraft);
  const [submitError, setSubmitError] = useState('');
  const [draftInitialized, setDraftInitialized] = useState(false);

  const employee = useMemo(
    () => (profile.data?.employee || undefined) as HrEmployee | undefined,
    [profile.data?.employee],
  );

  useEffect(() => {
    if (!employee || draftInitialized) return;
    setDraft({
      employeeNo: String(employee.employeeNo || ''),
      firstName: String(employee.firstName || ''),
      lastName: String(employee.lastName || ''),
      nationalId: String(employee.nationalId || ''),
      hireDate: String(employee.hireDate || ''),
      status: String(employee.status || 'active') === 'inactive' ? 'inactive' : 'active',
      notes: String(employee.notes || ''),
      compensationType: String(employee.compensationType || 'monthly') === 'hourly' ? 'hourly' : 'monthly',
      hourlyRate: employee.hourlyRate == null ? '' : String(employee.hourlyRate),
      expectedDailyHours: employee.expectedDailyHours == null ? '' : String(employee.expectedDailyHours),
      scheduledCheckInTime: String(employee.scheduledCheckInTime || ''),
      scheduledCheckOutTime: String(employee.scheduledCheckOutTime || ''),
      graceMinutes: employee.graceMinutes == null ? '' : String(employee.graceMinutes),
      overtimePolicy: String(employee.overtimePolicy || 'review_only') as 'review_only' | 'disabled' | 'auto_approved',
    });
    setDraftInitialized(true);
  }, [draftInitialized, employee]);

  const isBusy = mutations.saveEmployee.isPending;

  function goToProfile() {
    if (!id) {
      navigate('/hr/employees');
      return;
    }
    navigate(`/hr/employees/${id}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');

    if (!id) {
      setSubmitError('تعذر تحديد الموظف.');
      return;
    }

    const firstName = String(draft.firstName || '').trim();
    const hireDate = String(draft.hireDate || '').trim();
    const employeeNo = normalizeArabicDigits(String(draft.employeeNo || '').trim());
    const nationalId = normalizeDigitsOnly(draft.nationalId);
    const hourlyRate = Number(normalizeNumberText(draft.hourlyRate) || 0);
    const expectedDailyHours = Number(normalizeNumberText(draft.expectedDailyHours) || 0);
    const graceMinutes = Number(normalizeDigitsOnly(draft.graceMinutes) || 0);

    if (!firstName) {
      setSubmitError('الاسم الأول مطلوب.');
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
      await mutations.saveEmployee.mutateAsync({
        id,
        payload: {
          employeeNo: employeeNo || undefined,
          firstName,
          lastName: String(draft.lastName || '').trim() || undefined,
          nationalId: nationalId || undefined,
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
        },
      });
      goToProfile();
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'تعذر تحديث بيانات الموظف.'));
    }
  }

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="تعديل بيانات الموظف"
        description="تعديل البيانات الأساسية وبيانات الدوام والأجر للموظف."
      />

      <QueryFeedback
        isLoading={profile.isLoading}
        isError={profile.isError}
        error={profile.error}
        isEmpty={!employee}
        loadingText="جاري تحميل بيانات الموظف..."
        errorTitle="تعذر تحميل بيانات الموظف"
        emptyTitle="لم يتم العثور على الموظف."
      >
        <form onSubmit={(event) => { void handleSubmit(event); }}>
          <Card title="البيانات الأساسية">
            <div className="form-grid">
              <label className="field">
                <span>كود الموظف</span>
                <input value={draft.employeeNo} onChange={(e) => setDraft((current) => ({ ...current, employeeNo: e.target.value }))} />
              </label>
              <label className="field">
                <span>الاسم الأول *</span>
                <input value={draft.firstName} onChange={(e) => setDraft((current) => ({ ...current, firstName: e.target.value }))} required />
              </label>
              <label className="field">
                <span>اسم العائلة</span>
                <input value={draft.lastName} onChange={(e) => setDraft((current) => ({ ...current, lastName: e.target.value }))} />
              </label>
              <label className="field">
                <span>الرقم القومي</span>
                <input value={draft.nationalId} onChange={(e) => setDraft((current) => ({ ...current, nationalId: e.target.value }))} inputMode="numeric" maxLength={14} />
              </label>
              <label className="field">
                <span>تاريخ التعيين *</span>
                <input type="date" value={draft.hireDate} onChange={(e) => setDraft((current) => ({ ...current, hireDate: e.target.value }))} required />
              </label>
              <label className="field">
                <span>الحالة</span>
                <select value={draft.status} onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value === 'inactive' ? 'inactive' : 'active' }))}>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </label>
            </div>
          </Card>

          <Card title="بيانات الدوام والأجر">
            <div className="form-grid">
              <label className="field">
                <span>نوع الأجر</span>
                <select value={draft.compensationType} onChange={(e) => setDraft((current) => ({ ...current, compensationType: e.target.value === 'hourly' ? 'hourly' : 'monthly' }))}>
                  <option value="monthly">راتب شهري</option>
                  <option value="hourly">أجر بالساعة</option>
                </select>
              </label>
              {draft.compensationType === 'hourly' ? (
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
              ) : null}
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
              {draft.compensationType === 'hourly' ? (
                <p className="muted field-wide">
                  الأجر اليومي المتوقع: {(Number(normalizeNumberText(draft.hourlyRate) || 0) * Number(normalizeNumberText(draft.expectedDailyHours) || 0)).toFixed(2)}
                </p>
              ) : null}
            </div>
          </Card>

          <Card title="ملاحظات">
            <div className="field field-wide">
              <span>ملاحظات</span>
              <textarea rows={4} value={draft.notes} onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))} />
            </div>
            {submitError ? <div className="error-box" style={{ marginTop: 12 }}>{submitError}</div> : null}
            <div className="actions compact-actions" style={{ marginTop: 16 }}>
              <Button type="button" variant="secondary" onClick={goToProfile} disabled={isBusy}>إلغاء</Button>
              <Button type="submit" disabled={isBusy}>{isBusy ? 'جاري الحفظ...' : 'حفظ التعديلات'}</Button>
            </div>
          </Card>
        </form>
      </QueryFeedback>
    </div>
  );
}

