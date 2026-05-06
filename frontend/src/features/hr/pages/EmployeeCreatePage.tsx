import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';
import { findCreatedEmployee, formValue, normalizeDateInput, normalizeEmployeeNoInput, numericFormValue } from '@/features/hr/pages/hr.shared';

export function EmployeeCreatePage() {
  const navigate = useNavigate();
  const canManageSalary = useHasAnyPermission('hrSalaryManage');
  const workspace = useHrWorkspace({ page: 1, pageSize: 100 });
  const mutations = useHrMutations();
  const [message, setMessage] = useState('');
  const departments = useMemo(() => workspace.departments.data?.rows || [], [workspace.departments.data?.rows]);
  const jobTitles = useMemo(() => workspace.jobTitles.data?.rows || [], [workspace.jobTitles.data?.rows]);
  const positions = useMemo(() => workspace.positions.data?.rows || [], [workspace.positions.data?.rows]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const form = new FormData(event.currentTarget);
    const employeePayload = {
      employeeNo: normalizeEmployeeNoInput(formValue(form, 'employeeNo')),
      firstName: formValue(form, 'firstName'),
      lastName: formValue(form, 'lastName'),
      status: 'active',
      departmentId: numericFormValue(form, 'departmentId'),
      jobTitleId: numericFormValue(form, 'jobTitleId'),
      positionId: numericFormValue(form, 'positionId'),
      hireDate: normalizeDateInput(formValue(form, 'hireDate')) || undefined,
      notes: formValue(form, 'notes'),
    };
    if (!employeePayload.firstName) {
      setMessage('الاسم الأول مطلوب للحفظ.');
      return;
    }

    try {
      const response = await mutations.saveEmployee.mutateAsync({ payload: employeePayload });
      const created = findCreatedEmployee(response, employeePayload);
      const employeeId = String(created?.id || '');
      if (!employeeId) {
        setMessage('تم الحفظ لكن تعذر تحديد رقم الموظف الجديد.');
        return;
      }

      const phone = formValue(form, 'phone');
      if (phone) {
        await mutations.saveContact.mutateAsync({ employeeId, payload: { contactType: 'phone', value: phone, label: 'الهاتف الأساسي', isPrimary: true } });
      }
      const emergencyName = formValue(form, 'emergencyName');
      const emergencyPhone = formValue(form, 'emergencyPhone');
      if (emergencyName || emergencyPhone) {
        await mutations.saveContact.mutateAsync({ employeeId, payload: { contactType: 'emergency', label: emergencyName || 'جهة اتصال طوارئ', value: emergencyPhone || emergencyName } });
      }

      if (canManageSalary) {
        const contractStartDate = normalizeDateInput(formValue(form, 'contractStartDate'));
        const baseSalary = Number(form.get('baseSalary') || 0);
        if (contractStartDate || baseSalary > 0) {
          const contractRes = await mutations.saveContract.mutateAsync({
            employeeId,
            payload: {
              contractType: formValue(form, 'contractType') || 'standard',
              status: formValue(form, 'contractStatus') || 'draft',
              startDate: contractStartDate || employeePayload.hireDate,
              endDate: normalizeDateInput(formValue(form, 'contractEndDate')) || undefined,
              baseSalary: baseSalary > 0 ? baseSalary : 0,
              currency: formValue(form, 'currency') || 'EGP',
              notes: formValue(form, 'salaryNotes'),
            },
          });
          const contractId = String(((contractRes as { rows?: Array<{ id?: string }> }).rows || [])[0]?.id || '');
          const allowanceAmount = Number(form.get('allowanceAmount') || 0);
          const deductionAmount = Number(form.get('deductionAmount') || 0);
          if (allowanceAmount > 0 || deductionAmount > 0) {
            await mutations.saveCompensation.mutateAsync({
              employeeId,
              payload: {
                contractId: contractId ? Number(contractId) : undefined,
                packageName: 'الحزمة الأساسية',
                allowanceAmount,
                deductionAmount,
                effectiveFrom: contractStartDate || employeePayload.hireDate,
                notes: formValue(form, 'salaryNotes'),
              },
            });
          }
        }
      }

      const documentType = formValue(form, 'documentType');
      const documentNumber = formValue(form, 'documentNumber');
      if (documentType || documentNumber) {
        await mutations.saveDocument.mutateAsync({
          employeeId,
          payload: {
            title: [documentType || 'مستند', documentNumber].filter(Boolean).join(' - '),
            documentType: documentType || 'basic',
            expiryDate: normalizeDateInput(formValue(form, 'documentExpiryDate')) || undefined,
            notes: formValue(form, 'documentNotes'),
          },
        });
      }

      const openingLoan = Number(form.get('openingLoanAmount') || 0);
      if (openingLoan > 0) {
        await mutations.saveLoan.mutateAsync({
          payload: {
            employeeId: Number(employeeId),
            loanType: 'advance',
            repaymentMode: 'manual_cash',
            principalAmount: openingLoan,
            issueDate: normalizeDateInput(formValue(form, 'openingLoanIssueDate')) || new Date().toISOString().slice(0, 10),
            notes: formValue(form, 'openingLoanNotes') || 'رصيد افتتاحي',
          },
        });
      }

      navigate(`/hr/employees/${employeeId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الموظف.');
    }
  }

  return (
    <div className="page-stack page-shell">
      <PageHeader title="إضافة موظف" description="نموذج ذكي بمرحلة واحدة مع أقسام قابلة للطي." />
      <Card title="بيانات الموظف الجديدة">
        <form className="form-grid" onSubmit={save}>
          <details open><summary>1. البيانات الأساسية</summary><div className="form-grid">
            <label className="field"><span>رقم الموظف</span><input name="employeeNo" inputMode="numeric" pattern="[0-9]*" /></label>
            <label className="field"><span>الاسم الأول *</span><input name="firstName" required /></label>
            <label className="field"><span>اسم العائلة</span><input name="lastName" /></label>
          </div></details>
          <details><summary>2. الوظيفة والهيكل التنظيمي</summary><div className="form-grid">
            <label className="field"><span>القسم</span><select name="departmentId"><option value="">—</option>{departments.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className="field"><span>المسمى الوظيفي</span><select name="jobTitleId"><option value="">—</option>{jobTitles.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className="field"><span>الوظيفة</span><select name="positionId"><option value="">—</option>{positions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className="field"><span>تاريخ التعيين</span><input name="hireDate" type="date" /></label>
          </div></details>
          {canManageSalary ? <details><summary>3. العقد والراتب</summary><div className="form-grid">
            <label className="field"><span>نوع العقد</span><select name="contractType"><option value="standard">قياسي</option><option value="full_time">دوام كامل</option><option value="part_time">دوام جزئي</option></select></label>
            <label className="field"><span>حالة العقد</span><select name="contractStatus"><option value="draft">مسودة</option><option value="active">نشط</option></select></label>
            <label className="field"><span>بداية العقد</span><input name="contractStartDate" type="date" /></label>
            <label className="field"><span>نهاية العقد</span><input name="contractEndDate" type="date" /></label>
            <label className="field"><span>الراتب الأساسي</span><input name="baseSalary" type="number" min="0" step="0.01" /></label>
            <label className="field"><span>العملة</span><input name="currency" defaultValue="EGP" /></label>
            <label className="field"><span>بدلات ثابتة</span><input name="allowanceAmount" type="number" min="0" step="0.01" /></label>
            <label className="field"><span>خصومات ثابتة</span><input name="deductionAmount" type="number" min="0" step="0.01" /></label>
            <label className="field field-wide"><span>ملاحظات الراتب</span><textarea name="salaryNotes" rows={2} /></label>
          </div></details> : null}
          <details><summary>4. جهات الاتصال والطوارئ</summary><div className="form-grid">
            <label className="field"><span>الهاتف الأساسي</span><input name="phone" /></label>
            <label className="field"><span>اسم جهة طوارئ</span><input name="emergencyName" /></label>
            <label className="field"><span>هاتف جهة طوارئ</span><input name="emergencyPhone" /></label>
          </div></details>
          <details><summary>5. المستندات</summary><div className="form-grid">
            <label className="field"><span>نوع المستند</span><input name="documentType" /></label>
            <label className="field"><span>رقم المستند</span><input name="documentNumber" /></label>
            <label className="field"><span>تاريخ الانتهاء</span><input name="documentExpiryDate" type="date" /></label>
            <label className="field field-wide"><span>ملاحظات المستند</span><textarea name="documentNotes" rows={2} /></label>
          </div></details>
          <details><summary>6. السلف / الرصيد الافتتاحي</summary><div className="form-grid">
            <label className="field"><span>قيمة السلفة الافتتاحية</span><input name="openingLoanAmount" type="number" min="0" step="0.01" /></label>
            <label className="field"><span>تاريخ الإصدار</span><input name="openingLoanIssueDate" type="date" /></label>
            <label className="field field-wide"><span>ملاحظات</span><textarea name="openingLoanNotes" rows={2} /></label>
          </div></details>
          <details><summary>7. ملاحظات</summary><div className="form-grid">
            <label className="field field-wide"><span>ملاحظات الموظف</span><textarea name="notes" rows={3} /></label>
          </div></details>
          <div className="actions compact-actions field-wide">
            <Button type="submit" disabled={mutations.saveEmployee.isPending}>حفظ</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/hr/employees')}>إلغاء</Button>
          </div>
          {message ? <div className="muted field-wide">{message}</div> : null}
        </form>
      </Card>
    </div>
  );
}
