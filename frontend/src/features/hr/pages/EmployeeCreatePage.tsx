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
  notes: '',
};

function toId(value: string) {
  const numeric = Number(value || 0);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');

    const firstName = String(draft.firstName || '').trim();
    const mobile = String(draft.mobile || '').trim();
    const nationalId = String(draft.nationalId || '').trim();
    const hireDate = String(draft.hireDate || '').trim();
    const contractType = String(draft.contractType || '').trim();
    const baseSalary = Number(draft.baseSalary || 0);

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

    try {
      const employeePayload = {
        employeeNo: String(draft.employeeNo || '').trim() || undefined,
        firstName,
        lastName: String(draft.lastName || '').trim() || undefined,
        nationalId: nationalId || undefined,
        status: draft.status,
        departmentId: toId(draft.departmentId),
        jobTitleId: toId(draft.jobTitleId),
        positionId: toId(draft.positionId),
        hireDate,
        notes: String(draft.notes || '').trim() || undefined,
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
        description="إضافة موظف جديد ببيانات أساسية واضحة، مع إمكانية استكمال باقي الملف لاحقًا."
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
              <input value={draft.mobile} onChange={(e) => setDraft((current) => ({ ...current, mobile: e.target.value }))} required />
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

        <Card title="بيانات الشغل" description="حدد القسم والمسمى الوظيفي وتاريخ التعيين.">
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
              <input type="number" min="0" step="0.01" value={draft.baseSalary} onChange={(e) => setDraft((current) => ({ ...current, baseSalary: e.target.value }))} placeholder="اختياري" />
            </div>
          </div>
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
