import { FormEvent, useMemo, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { StatsGrid } from '@/shared/components/stats-grid';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { formatCurrency, formatDate } from '@/lib/format';
import type { HrEmployee, HrLoan, HrMasterDataRecord } from '@/types/domain';
import { useHrMutations, useHrProfile, useHrWorkspace } from '@/features/hr/hooks/useHr';

function formValue(form: FormData, key: string) {
  return String(form.get(key) || '').trim();
}

function numericFormValue(form: FormData, key: string) {
  const value = Number(form.get(key) || 0);
  return value > 0 ? value : undefined;
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    active: 'نشط',
    inactive: 'غير نشط',
    deactivated: 'موقوف',
    terminated: 'منتهي',
    draft: 'مسودة',
    approved: 'معتمد',
    paid: 'مصروف',
    partially_repaid: 'سداد جزئي',
    repaid: 'مسدد',
    cancelled: 'ملغي',
  };
  return labels[String(status || '')] || status || '—';
}

function MasterDataForm({ title, kind }: { title: string; kind: 'departments' | 'job-titles' | 'positions' }) {
  const mutations = useHrMutations();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutations.saveMasterData.mutateAsync({
      kind,
      payload: {
        name: formValue(form, 'name'),
        code: formValue(form, 'code'),
        description: formValue(form, 'description'),
        departmentId: numericFormValue(form, 'departmentId'),
        jobTitleId: numericFormValue(form, 'jobTitleId'),
      },
    });
    event.currentTarget.reset();
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <label className="field"><span>{title}</span><input name="name" required /></label>
      <label className="field"><span>الكود</span><input name="code" /></label>
      {kind === 'positions' ? (
        <>
          <label className="field"><span>القسم</span><input name="departmentId" type="number" min="1" /></label>
          <label className="field"><span>المسمى</span><input name="jobTitleId" type="number" min="1" /></label>
        </>
      ) : null}
      <label className="field field-wide"><span>ملاحظات</span><textarea name="description" rows={2} /></label>
      <div className="actions compact-actions"><Button type="submit" disabled={mutations.saveMasterData.isPending}>حفظ</Button></div>
    </form>
  );
}

export function HrPage() {
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const workspace = useHrWorkspace({ search, page: 1, pageSize: 25 });
  const profile = useHrProfile(selectedEmployeeId);
  const mutations = useHrMutations();
  const canManageSalary = useHasAnyPermission('hrSalaryManage');
  const canViewSalary = useHasAnyPermission(['hrSalaryView', 'hrSalaryManage']);

  const employees = useMemo(() => workspace.employees.data?.employees || [], [workspace.employees.data?.employees]);
  const loans = useMemo(() => workspace.loans.data?.loans || [], [workspace.loans.data?.loans]);
  const summary = workspace.summary.data || { employeeCount: 0, activeCount: 0, openLoans: 0, outstandingAmount: 0 };
  const selectedEmployee = profile.data?.employee;

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutations.saveEmployee.mutateAsync({
      id: selectedEmployeeId || undefined,
      payload: {
        employeeNo: formValue(form, 'employeeNo'),
        firstName: formValue(form, 'firstName'),
        lastName: formValue(form, 'lastName'),
        status: formValue(form, 'status') || 'active',
        departmentId: numericFormValue(form, 'departmentId'),
        jobTitleId: numericFormValue(form, 'jobTitleId'),
        positionId: numericFormValue(form, 'positionId'),
        hireDate: formValue(form, 'hireDate') || undefined,
        notes: formValue(form, 'notes'),
      },
    });
    event.currentTarget.reset();
  }

  async function saveDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployeeId) return;
    const form = new FormData(event.currentTarget);
    await mutations.saveDocument.mutateAsync({
      employeeId: selectedEmployeeId,
      payload: {
        title: formValue(form, 'title'),
        documentType: formValue(form, 'documentType'),
        fileUrl: formValue(form, 'fileUrl'),
        expiryDate: formValue(form, 'expiryDate') || undefined,
        notes: formValue(form, 'notes'),
      },
    });
    event.currentTarget.reset();
  }

  async function saveContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployeeId) return;
    const form = new FormData(event.currentTarget);
    await mutations.saveContract.mutateAsync({
      employeeId: selectedEmployeeId,
      payload: {
        contractNo: formValue(form, 'contractNo'),
        status: formValue(form, 'status') || 'draft',
        startDate: formValue(form, 'startDate'),
        endDate: formValue(form, 'endDate') || undefined,
        baseSalary: Number(form.get('baseSalary') || 0),
        currency: formValue(form, 'currency') || 'EGP',
        notes: formValue(form, 'notes'),
      },
    });
    event.currentTarget.reset();
  }

  async function saveLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const employeeId = formValue(form, 'employeeId') || selectedEmployeeId;
    if (!employeeId) return;
    await mutations.saveLoan.mutateAsync({
      payload: {
        employeeId: Number(employeeId),
        loanNo: formValue(form, 'loanNo'),
        loanType: formValue(form, 'loanType') || 'advance',
        principalAmount: Number(form.get('principalAmount') || 0),
        installmentCount: Number(form.get('installmentCount') || 1),
        issueDate: formValue(form, 'issueDate'),
        firstDueDate: formValue(form, 'firstDueDate') || undefined,
        notes: formValue(form, 'notes'),
      },
    });
    event.currentTarget.reset();
  }

  async function repayLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLoanId) return;
    const form = new FormData(event.currentTarget);
    await mutations.repayLoan.mutateAsync({ id: selectedLoanId, payload: { amount: Number(form.get('amount') || 0), note: formValue(form, 'note') } });
    event.currentTarget.reset();
  }

  const stats = [
    { key: 'employees', label: 'إجمالي الموظفين', value: summary.employeeCount },
    { key: 'active', label: 'نشط', value: summary.activeCount },
    { key: 'loans', label: 'سلف مفتوحة', value: summary.openLoans },
    { key: 'outstanding', label: 'رصيد السلف', value: formatCurrency(summary.outstandingAmount) },
  ];

  return (
    <div className="page-stack page-shell hr-page">
      <PageHeader title="الموارد البشرية" description="الملف الأساسي للموظفين والعقود والسلف بدون حضور أو رواتب في هذه المرحلة." badge={<span className="nav-pill">HR Phase 1</span>} />
      <StatsGrid items={stats} />

      <Card title="الموظفون">
        <SearchToolbar search={search} onSearchChange={setSearch} searchPlaceholder="بحث بالاسم أو رقم الموظف أو القسم" />
        <QueryFeedback isLoading={workspace.employees.isLoading} isError={workspace.employees.isError} error={workspace.employees.error} isEmpty={!employees.length} loadingText="جاري تحميل الموظفين..." errorTitle="تعذر تحميل الموظفين" emptyTitle="لا توجد بيانات موظفين بعد">
          <DataTable<HrEmployee>
            rows={employees}
            rowKey={(row) => row.id}
            onRowClick={(row) => setSelectedEmployeeId(row.id)}
            rowClassName={(row) => row.id === selectedEmployeeId ? 'table-row-selected' : undefined}
            columns={[
              { key: 'employeeNo', header: 'رقم', cell: (row) => row.employeeNo || '—' },
              { key: 'name', header: 'الموظف', cell: (row) => row.displayName },
              { key: 'department', header: 'القسم', cell: (row) => row.departmentName || '—' },
              { key: 'job', header: 'المسمى', cell: (row) => row.jobTitleName || '—' },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
              { key: 'hireDate', header: 'تاريخ التعيين', cell: (row) => row.hireDate ? formatDate(row.hireDate) : '—' },
            ]}
          />
        </QueryFeedback>
      </Card>

      <div className="two-column-grid">
        <Card title={selectedEmployee ? `ملف: ${selectedEmployee.displayName}` : 'إضافة موظف'}>
          <form className="form-grid" onSubmit={saveEmployee}>
            <label className="field"><span>رقم الموظف</span><input name="employeeNo" defaultValue={selectedEmployee?.employeeNo || ''} /></label>
            <label className="field"><span>الاسم الأول</span><input name="firstName" required defaultValue={selectedEmployee?.firstName || ''} /></label>
            <label className="field"><span>اسم العائلة</span><input name="lastName" defaultValue={selectedEmployee?.lastName || ''} /></label>
            <label className="field"><span>الحالة</span><select name="status" defaultValue={selectedEmployee?.status || 'active'}><option value="active">نشط</option><option value="inactive">غير نشط</option><option value="deactivated">موقوف</option><option value="terminated">منتهي</option></select></label>
            <label className="field"><span>القسم ID</span><input name="departmentId" type="number" min="1" defaultValue={selectedEmployee?.departmentId || ''} /></label>
            <label className="field"><span>المسمى ID</span><input name="jobTitleId" type="number" min="1" defaultValue={selectedEmployee?.jobTitleId || ''} /></label>
            <label className="field"><span>الوظيفة ID</span><input name="positionId" type="number" min="1" defaultValue={selectedEmployee?.positionId || ''} /></label>
            <label className="field"><span>تاريخ التعيين</span><input name="hireDate" type="date" defaultValue={selectedEmployee?.hireDate || ''} /></label>
            <label className="field field-wide"><span>ملاحظات</span><textarea name="notes" rows={2} defaultValue={selectedEmployee?.notes || ''} /></label>
            <div className="actions compact-actions">
              <Button type="submit" disabled={mutations.saveEmployee.isPending}>حفظ الموظف</Button>
              {selectedEmployeeId ? <Button type="button" variant="secondary" onClick={() => setSelectedEmployeeId('')}>جديد</Button> : null}
            </div>
          </form>
        </Card>

        <Card title="مستندات الموظف" description="يتم حفظ بيانات المستند فقط، وليس الملف نفسه.">
          <form className="form-grid" onSubmit={saveDocument}>
            <label className="field"><span>العنوان</span><input name="title" required disabled={!selectedEmployeeId} /></label>
            <label className="field"><span>النوع</span><input name="documentType" disabled={!selectedEmployeeId} /></label>
            <label className="field field-wide"><span>الرابط أو المسار</span><input name="fileUrl" disabled={!selectedEmployeeId} /></label>
            <label className="field"><span>تاريخ الانتهاء</span><input name="expiryDate" type="date" disabled={!selectedEmployeeId} /></label>
            <label className="field field-wide"><span>ملاحظات</span><textarea name="notes" rows={2} disabled={!selectedEmployeeId} /></label>
            <div className="actions compact-actions"><Button type="submit" disabled={!selectedEmployeeId || mutations.saveDocument.isPending}>حفظ المستند</Button></div>
          </form>
          <DataTable
            rows={profile.data?.documents || []}
            rowKey={(row) => row.id}
            columns={[
              { key: 'title', header: 'المستند', cell: (row) => row.title },
              { key: 'type', header: 'النوع', cell: (row) => row.documentType || '—' },
              { key: 'expiry', header: 'انتهاء', cell: (row) => row.expiryDate || '—' },
            ]}
          />
        </Card>
      </div>

      <div className="two-column-grid">
        <Card title="العقود والتعويضات">
          <form className="form-grid" onSubmit={saveContract}>
            <label className="field"><span>رقم العقد</span><input name="contractNo" disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <label className="field"><span>الحالة</span><select name="status" disabled={!selectedEmployeeId || !canManageSalary}><option value="draft">مسودة</option><option value="active">نشط</option><option value="ended">منتهي</option><option value="cancelled">ملغي</option></select></label>
            <label className="field"><span>من تاريخ</span><input name="startDate" type="date" required disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <label className="field"><span>إلى تاريخ</span><input name="endDate" type="date" disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <label className="field"><span>الراتب الأساسي</span><input name="baseSalary" type="number" min="0" step="0.01" disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <label className="field"><span>العملة</span><input name="currency" defaultValue="EGP" disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <label className="field field-wide"><span>ملاحظات</span><textarea name="notes" rows={2} disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <div className="actions compact-actions"><Button type="submit" disabled={!selectedEmployeeId || !canManageSalary || mutations.saveContract.isPending}>حفظ العقد</Button></div>
          </form>
          <DataTable
            rows={profile.data?.contracts || []}
            rowKey={(row) => row.id}
            columns={[
              { key: 'contract', header: 'العقد', cell: (row) => row.contractNo || '—' },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
              { key: 'salary', header: 'الراتب', cell: (row) => canViewSalary && typeof row.baseSalary === 'number' ? formatCurrency(row.baseSalary) : 'محجوب' },
            ]}
          />
        </Card>

        <Card title="السلف والقروض">
          <form className="form-grid" onSubmit={saveLoan}>
            <label className="field"><span>الموظف ID</span><input name="employeeId" type="number" min="1" defaultValue={selectedEmployeeId} required /></label>
            <label className="field"><span>رقم السلفة</span><input name="loanNo" /></label>
            <label className="field"><span>النوع</span><select name="loanType"><option value="advance">سلفة</option><option value="loan">قرض</option></select></label>
            <label className="field"><span>المبلغ</span><input name="principalAmount" type="number" min="0.01" step="0.01" required /></label>
            <label className="field"><span>عدد الأقساط</span><input name="installmentCount" type="number" min="1" defaultValue="1" /></label>
            <label className="field"><span>تاريخ الإصدار</span><input name="issueDate" type="date" required /></label>
            <label className="field"><span>أول استحقاق</span><input name="firstDueDate" type="date" /></label>
            <label className="field field-wide"><span>ملاحظات</span><textarea name="notes" rows={2} /></label>
            <div className="actions compact-actions"><Button type="submit" disabled={mutations.saveLoan.isPending}>حفظ السلفة</Button></div>
          </form>
          <DataTable<HrLoan>
            rows={loans}
            rowKey={(row) => row.id}
            onRowClick={(row) => setSelectedLoanId(row.id)}
            rowClassName={(row) => row.id === selectedLoanId ? 'table-row-selected' : undefined}
            columns={[
              { key: 'employee', header: 'الموظف', cell: (row) => row.employeeName || row.employeeId },
              { key: 'amount', header: 'المبلغ', cell: (row) => formatCurrency(row.principalAmount) },
              { key: 'remaining', header: 'المتبقي', cell: (row) => formatCurrency(row.remainingAmount) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
              { key: 'actions', header: 'إجراءات', cell: (row) => <div className="actions compact-actions"><Button variant="secondary" onClick={() => mutations.approveLoan.mutate(row.id)}>اعتماد</Button><Button variant="secondary" onClick={() => mutations.disburseLoan.mutate(row.id)}>صرف</Button></div> },
            ]}
          />
          <form className="form-grid" onSubmit={repayLoan}>
            <label className="field"><span>مبلغ السداد</span><input name="amount" type="number" min="0.01" step="0.01" disabled={!selectedLoanId} /></label>
            <label className="field"><span>ملاحظة</span><input name="note" disabled={!selectedLoanId} /></label>
            <div className="actions compact-actions"><Button type="submit" disabled={!selectedLoanId || mutations.repayLoan.isPending}>تسجيل سداد</Button></div>
          </form>
        </Card>
      </div>

      <Card title="الإعدادات الأساسية">
        <div className="three-column-grid">
          <MasterDataForm title="قسم جديد" kind="departments" />
          <MasterDataForm title="مسمى وظيفي جديد" kind="job-titles" />
          <MasterDataForm title="وظيفة جديدة" kind="positions" />
        </div>
        <div className="two-column-grid">
          <DataTable<HrMasterDataRecord> rows={workspace.departments.data?.rows || []} rowKey={(row) => row.id} columns={[{ key: 'name', header: 'الأقسام', cell: (row) => row.name }, { key: 'code', header: 'الكود', cell: (row) => row.code || '—' }]} />
          <DataTable<HrMasterDataRecord> rows={workspace.jobTitles.data?.rows || []} rowKey={(row) => row.id} columns={[{ key: 'name', header: 'المسميات', cell: (row) => row.name }, { key: 'code', header: 'الكود', cell: (row) => row.code || '—' }]} />
        </div>
      </Card>
    </div>
  );
}
