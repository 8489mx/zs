import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { StatsGrid } from '@/shared/components/stats-grid';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import type { HrEmployee, HrLoan, HrMasterDataRecord, HrWithdrawalRow } from '@/types/domain';
import { useHrMutations, useHrProfile, useHrWorkspace } from '@/features/hr/hooks/useHr';

type HrTab = 'employees' | 'withdrawals' | 'contracts' | 'documents' | 'settings';
type MasterKind = 'departments' | 'job-titles' | 'positions';

const tabs: Array<{ key: HrTab; label: string }> = [
  { key: 'employees', label: 'الموظفين' },
  { key: 'withdrawals', label: 'مسحوبات الموظفين' },
  { key: 'contracts', label: 'العقود والرواتب' },
  { key: 'documents', label: 'المستندات' },
  { key: 'settings', label: 'الإعدادات الأساسية' },
];

function formValue(form: FormData, key: string) {
  return String(form.get(key) || '').trim();
}

function normalizeDateInput(value?: string | null) {
  const text = String(value || '').trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const usMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = Number(usMatch[1]);
    const day = Number(usMatch[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${usMatch[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return '';
}

function formatDateOnly(value?: string | null) {
  const normalized = normalizeDateInput(value);
  return normalized || '—';
}

function formatDateTimeStable(value?: string | null) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/);
  if (match) return `${match[1]} ${match[2]}:${match[3]}`;
  const dateOnly = normalizeDateInput(text);
  return dateOnly ? `${dateOnly} 00:00` : '—';
}


function pickRowText(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = String(row[key] || '').trim();
    if (value) return value;
  }
  return '';
}

function movementDateValue(row: HrWithdrawalRow | Record<string, unknown>) {
  return pickRowText(row as Record<string, unknown>, [
    'movementAt',
    'movement_at',
    'movement_at_text',
    'date',
    'paidAt',
    'paid_at',
    'paid_at_text',
    'disbursedAt',
    'disbursed_at',
    'disbursed_at_text',
    'createdAt',
    'created_at',
    'created_at_text',
    'issueDate',
    'issue_date',
    'issue_date_text',
  ]);
}

function loanDateValue(loan: HrLoan | Record<string, unknown> | undefined, keys: string[]) {
  return loan ? pickRowText(loan as Record<string, unknown>, keys) : '';
}

function addMonthsDateOnly(value: string, months: number) {
  const normalized = normalizeDateInput(value);
  if (!normalized) return '';
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  return date.toISOString().slice(0, 10);
}

function formatHrMoney(value: unknown) {
  const amount = Number(value || 0);
  return `${amount.toFixed(2)} ج.م`;
}

function numericFormValue(form: FormData, key: string) {
  const value = Number(form.get(key) || 0);
  return value > 0 ? value : undefined;
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error) {
    const maybeError = error as { message?: unknown; code?: unknown };
    const message = typeof maybeError.message === 'string' ? maybeError.message : '';
    const code = typeof maybeError.code === 'string' ? maybeError.code : '';
    return [message, code].filter(Boolean).join(' - ') || 'خطأ غير معروف';
  }
  return 'خطأ غير معروف';
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
    recorded: 'مسجل',
  };
  return labels[String(status || '')] || status || '—';
}

function repaymentModeLabel(mode?: string) {
  const labels: Record<string, string> = {
    deduct_next_salary: 'تخصم مرة واحدة من الراتب القادم',
    monthly_salary_installment: 'تقسيط شهري من الراتب',
    manual_cash: 'سداد كاش لاحقًا',
    salary_deduction: 'خصم من الراتب',
  };
  return labels[String(mode || '')] || 'سداد كاش لاحقًا';
}

function repaymentMethodLabel(method?: string) {
  return method === 'salary_deduction' ? 'خصم من الراتب بدون خزينة' : 'سداد كاش';
}

function movementNote(row: HrWithdrawalRow) {
  const rawNote = String(row.note || '').trim();
  const repaymentMethod = String((row as HrWithdrawalRow & { repaymentMethod?: string }).repaymentMethod || row.repaymentMode || '');
  if (row.type === 'repayment') {
    return repaymentMethod === 'salary_deduction'
      ? 'خصم سلفة من راتب الموظف'
      : 'سداد سلفة موظف كاش';
  }
  return rawNote || '—';
}

function movementLoanId(row: HrWithdrawalRow) {
  const rawId = String((row as HrWithdrawalRow & { loanId?: string | number; referenceId?: string | number }).loanId || (row as HrWithdrawalRow & { referenceId?: string | number }).referenceId || '');
  return rawId && !rawId.startsWith('loan-') && !rawId.startsWith('ledger-') ? rawId : '';
}

function withdrawalTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    advance: 'سلفة',
    loan: 'قرض',
    repayment: 'سداد',
  };
  return labels[String(type || '')] || type || '—';
}

function SelectField({
  name,
  label,
  options,
  defaultValue,
  disabled,
  required,
}: {
  name: string;
  label: string;
  options: Array<{ id: string; label: string }>;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue || ''} disabled={disabled} required={required}>
        <option value="">—</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function EmployeeRequired({ selected }: { selected: boolean }) {
  if (selected) return null;
  return <div className="muted" style={{ marginBottom: 12 }}>اختر موظف أولًا</div>;
}

function MasterDataForm({
  title,
  kind,
  departments,
  jobTitles,
}: {
  title: string;
  kind: MasterKind;
  departments: HrMasterDataRecord[];
  jobTitles: HrMasterDataRecord[];
}) {
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
          <SelectField name="departmentId" label="القسم" options={departments.map((row) => ({ id: row.id, label: row.name }))} />
          <SelectField name="jobTitleId" label="المسمى" options={jobTitles.map((row) => ({ id: row.id, label: row.name }))} />
        </>
      ) : null}
      <label className="field field-wide"><span>ملاحظات</span><textarea name="description" rows={2} /></label>
      <div className="actions compact-actions"><Button type="submit" disabled={mutations.saveMasterData.isPending}>حفظ</Button></div>
    </form>
  );
}

export function HrPage() {
  const [tab, setTab] = useState<HrTab>('employees');
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [loanFormMessage, setLoanFormMessage] = useState('');
  const [employeeFormMessage, setEmployeeFormMessage] = useState('');
  const [employeeHireDate, setEmployeeHireDate] = useState('');
  const [loanSettlementMode, setLoanSettlementMode] = useState('deduct_next_salary');
  const [period, setPeriod] = useState('current_month');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const workspace = useHrWorkspace({ search, page: 1, pageSize: 50, employeeId: selectedEmployeeId, period, month, from, to });
  const profile = useHrProfile(selectedEmployeeId);
  const mutations = useHrMutations();
  const canManageSalary = useHasAnyPermission('hrSalaryManage');
  const canViewSalary = useHasAnyPermission(['hrSalaryView', 'hrSalaryManage']);

  const employees = useMemo(() => workspace.employees.data?.employees || [], [workspace.employees.data?.employees]);
  const visibleEmployees = useMemo(() => {
    if (employeeStatusFilter === 'all') return employees;
    if (employeeStatusFilter === 'active') return employees.filter((employee) => employee.status === 'active');
    return employees.filter((employee) => employee.status !== 'active');
  }, [employeeStatusFilter, employees]);
  const departments = useMemo(() => workspace.departments.data?.rows || [], [workspace.departments.data?.rows]);
  const jobTitles = useMemo(() => workspace.jobTitles.data?.rows || [], [workspace.jobTitles.data?.rows]);
  const positions = useMemo(() => workspace.positions.data?.rows || [], [workspace.positions.data?.rows]);
  const loans = useMemo(() => workspace.loans.data?.loans || [], [workspace.loans.data?.loans]);
  const selectedEmployee = profile.data?.employee;
  const summary = workspace.summary.data || { employeeCount: 0, activeCount: 0, openLoans: 0, outstandingAmount: 0 };
  const employeeOptions = employees.map((employee) => ({ id: employee.id, label: `${employee.displayName}${employee.employeeNo ? ` - ${employee.employeeNo}` : ''}` }));
  const selectedEmployeeLoans = selectedEmployeeId ? loans.filter((loan) => String(loan.employeeId) === String(selectedEmployeeId)) : loans;
  const selectedLoan = selectedEmployeeLoans.find((loan) => loan.id === selectedLoanId);
  const canRepaySelectedLoan = selectedLoan ? ['paid', 'disbursed', 'partially_repaid'].includes(String(selectedLoan.status || '')) : false;
  const withdrawals = workspace.withdrawals.data;
  const withdrawalSummary = (withdrawals?.summary || {}) as Record<string, unknown>;
  const actualOpenLoans = selectedEmployeeLoans.filter((loan) => ['paid', 'disbursed', 'partially_repaid'].includes(String(loan.status || '')));
  const manualCashRepaymentsTotal = (withdrawals?.rows || [])
    .filter((row) => row.type === 'repayment' && String((row as HrWithdrawalRow & { repaymentMethod?: string }).repaymentMethod || row.repaymentMode || 'manual_cash') === 'manual_cash')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const openLoanCountValue = toFiniteNumber(withdrawalSummary.openLoanCount ?? withdrawalSummary.openLoans, actualOpenLoans.length);
  const selectedLoanRepayments = useMemo(() => {
    if (!selectedLoanId) return [];
    return (withdrawals?.rows || []).filter((row) => {
      const loanId = movementLoanId(row);
      return row.type === 'repayment' && loanId === String(selectedLoanId);
    });
  }, [selectedLoanId, withdrawals?.rows]);
  const selectedLoanInstallments = useMemo(() => {
    if (!selectedLoan) return [];
    const loan = selectedLoan as HrLoan & { installments?: Array<Record<string, unknown>> };
    if (Array.isArray(loan.installments) && loan.installments.length) return loan.installments;
    const principal = Number(selectedLoan.principalAmount || 0);
    const paid = Number(selectedLoan.paidAmount || 0);
    const count = Math.max(1, Number(selectedLoan.installmentCount || 1));
    const monthlyAmount = Number(selectedLoan.monthlyInstallmentAmount || 0);
    if (count <= 1 && selectedLoan.repaymentMode !== 'monthly_salary_installment') return [];
    const firstDueDate = normalizeDateInput(selectedLoan.firstDueDate) || addMonthsDateOnly(normalizeDateInput(selectedLoan.issueDate), 1);
    let paidRemaining = paid;
    return Array.from({ length: count }, (_, index) => {
      const baseAmount = monthlyAmount > 0 ? monthlyAmount : Number((principal / count).toFixed(2));
      const amount = index === count - 1 ? Math.max(0, Number((principal - baseAmount * (count - 1)).toFixed(2))) : Math.min(baseAmount, principal);
      const installmentPaid = Math.min(amount, Math.max(0, paidRemaining));
      paidRemaining = Number((paidRemaining - installmentPaid).toFixed(2));
      const remaining = Math.max(0, Number((amount - installmentPaid).toFixed(2)));
      return {
        id: String(index + 1),
        installmentNo: index + 1,
        dueDate: addMonthsDateOnly(firstDueDate, index),
        amount,
        paidAmount: installmentPaid,
        remainingAmount: remaining,
        status: remaining <= 0 ? 'repaid' : installmentPaid > 0 ? 'partially_repaid' : 'pending',
      };
    });
  }, [selectedLoan]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setEmployeeHireDate('');
      return;
    }
    setEmployeeHireDate(normalizeDateInput(selectedEmployee?.hireDate));
  }, [selectedEmployee?.hireDate, selectedEmployeeId]);

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setEmployeeFormMessage('');
    const form = new FormData(formElement);
    try {
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
          hireDate: employeeHireDate || undefined,
          notes: formValue(form, 'notes'),
        },
      });
      if (!selectedEmployeeId) {
        formElement.reset();
        setEmployeeHireDate('');
      }
    } catch (error) {
      console.error('[HR] save employee failed', error);
      setEmployeeFormMessage(`فشل الحفظ: ${errorMessage(error)}`);
    }
  }

  async function deactivateEmployee(employee: HrEmployee) {
    if (!employee.id || employee.status !== 'active') return;
    const confirmed = window.confirm('هل تريد تعطيل الموظف؟ سيتم تعطيله فقط بدون حذف بياناته.');
    if (!confirmed) return;
    setEmployeeFormMessage('');
    try {
      await mutations.deactivateEmployee.mutateAsync(employee.id);
      setSelectedEmployeeId('');
      setSelectedLoanId('');
    } catch {
      setEmployeeFormMessage('تعذر تعطيل الموظف. حاول مرة أخرى.');
    }
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

  async function saveCompensation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployeeId) return;
    const form = new FormData(event.currentTarget);
    await mutations.saveCompensation.mutateAsync({
      employeeId: selectedEmployeeId,
      payload: {
        contractId: numericFormValue(form, 'contractId'),
        packageName: formValue(form, 'packageName'),
        allowanceAmount: Number(form.get('allowanceAmount') || 0),
        deductionAmount: Number(form.get('deductionAmount') || 0),
        effectiveFrom: formValue(form, 'effectiveFrom') || undefined,
        effectiveTo: formValue(form, 'effectiveTo') || undefined,
        notes: formValue(form, 'notes'),
      },
    });
    event.currentTarget.reset();
  }

  async function saveLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoanFormMessage('');
    const form = new FormData(formElement);
    const employeeId = formValue(form, 'employeeId') || selectedEmployeeId;
    if (!employeeId) {
      setLoanFormMessage('اختر موظف أولًا.');
      return;
    }
    const repaymentMode = formValue(form, 'repaymentMode') || 'manual_cash';
    const principalAmount = Number(form.get('principalAmount') || 0);
    const issueDate = normalizeDateInput(formValue(form, 'issueDate'));
    const installmentCount = Number(form.get('installmentCount') || 0);
    const monthlyInstallmentAmount = Number(form.get('monthlyInstallmentAmount') || 0);
    if (!(principalAmount > 0)) {
      setLoanFormMessage('أدخل مبلغ السلفة بشكل صحيح.');
      return;
    }
    if (!issueDate) {
      setLoanFormMessage('أدخل تاريخ الإصدار بصيغة صحيحة.');
      return;
    }
    if (!repaymentMode) {
      setLoanFormMessage('اختر طريقة السداد.');
      return;
    }
    if (repaymentMode === 'monthly_salary_installment' && !(monthlyInstallmentAmount > 0) && !(installmentCount > 0)) {
      setLoanFormMessage('للتقسيط الشهري، أدخل مبلغ القسط الشهري أو عدد الأقساط.');
      return;
    }
    try {
      await mutations.saveLoan.mutateAsync({
        payload: {
          employeeId: Number(employeeId),
          loanNo: formValue(form, 'loanNo'),
          loanType: formValue(form, 'loanType') || 'advance',
          repaymentMode,
          principalAmount,
          installmentCount: repaymentMode === 'deduct_next_salary' ? 1 : Math.max(1, installmentCount || 1),
          monthlyInstallmentAmount: monthlyInstallmentAmount > 0 ? monthlyInstallmentAmount : undefined,
          issueDate,
          firstDueDate: normalizeDateInput(formValue(form, 'firstDueDate')) || undefined,
          salaryDueDate: normalizeDateInput(formValue(form, 'salaryDueDate')) || undefined,
          notes: formValue(form, 'notes'),
        },
      });
      setLoanFormMessage('تم حفظ السلفة بنجاح.');
      formElement.reset();
      setLoanSettlementMode('deduct_next_salary');
    } catch (error) {
      console.error('[HR] create loan failed', error);
      setLoanFormMessage(`فشل الحفظ: ${errorMessage(error)}`);
    }
  }

  async function repayLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLoanId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await mutations.repayLoan.mutateAsync({
      id: selectedLoanId,
      payload: { amount: Number(form.get('amount') || 0), note: formValue(form, 'note'), repaymentMethod: formValue(form, 'repaymentMethod') || 'manual_cash' },
    });
    formElement.reset();
  }

  const dashboardStats = [
    { key: 'employees', label: 'إجمالي الموظفين', value: summary.employeeCount },
    { key: 'active', label: 'نشط', value: summary.activeCount },
    { key: 'loans', label: 'سلف مفتوحة', value: summary.openLoans },
    { key: 'outstanding', label: 'رصيد السلف', value: formatHrMoney(summary.outstandingAmount) },
  ];

  return (
    <div className="page-stack page-shell hr-page">
      <PageHeader title="الموارد البشرية" description="الملف الأساسي للموظفين والعقود والمسحوبات بدون حضور أو تشغيل رواتب." badge={<span className="nav-pill">HR Phase 1</span>} />
      <StatsGrid items={dashboardStats} />

      <Card title="اختيار الموظف">
        <div className="form-grid">
          <div className="field">
            <span>الموظف المحدد</span>
            <select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
              <option value="">اختر موظف أولًا</option>
              {employeeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div className="filter-chip-row">
        {tabs.map((item) => (
          <Button key={item.key} type="button" variant={tab === item.key ? 'primary' : 'secondary'} onClick={() => setTab(item.key)}>
            {item.label}
          </Button>
        ))}
      </div>

      {tab === 'employees' ? (
        <>
          <Card title="الموظفين">
            <SearchToolbar search={search} onSearchChange={setSearch} searchPlaceholder="بحث بالاسم أو رقم الموظف أو القسم" />
            <div className="filter-chip-row">
              <Button type="button" variant={employeeStatusFilter === 'active' ? 'primary' : 'secondary'} onClick={() => setEmployeeStatusFilter('active')}>نشط</Button>
              <Button type="button" variant={employeeStatusFilter === 'inactive' ? 'primary' : 'secondary'} onClick={() => setEmployeeStatusFilter('inactive')}>غير نشط</Button>
              <Button type="button" variant={employeeStatusFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setEmployeeStatusFilter('all')}>الكل</Button>
            </div>
            <QueryFeedback isLoading={workspace.employees.isLoading} isError={workspace.employees.isError} error={workspace.employees.error} isEmpty={!visibleEmployees.length} loadingText="جاري تحميل الموظفين..." errorTitle="تعذر تحميل الموظفين" emptyTitle="لا توجد بيانات موظفين بعد">
              <DataTable<HrEmployee>
                rows={visibleEmployees}
                rowKey={(row) => row.id}
                onRowClick={(row) => setSelectedEmployeeId(row.id)}
                rowClassName={(row) => row.id === selectedEmployeeId ? 'table-row-selected' : undefined}
                columns={[
                  { key: 'employeeNo', header: 'رقم', cell: (row) => row.employeeNo || '—' },
                  { key: 'name', header: 'الموظف', cell: (row) => row.displayName },
                  { key: 'department', header: 'القسم', cell: (row) => row.departmentName || '—' },
                  { key: 'job', header: 'المسمى', cell: (row) => row.jobTitleName || '—' },
                  { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
                  { key: 'hireDate', header: 'تاريخ التعيين', cell: (row) => formatDateOnly(row.hireDate) },
                  {
                    key: 'actions',
                    header: 'إجراءات',
                    cell: (row) => row.status === 'active'
                      ? <Button type="button" variant="danger" onClick={(event) => { event.stopPropagation(); void deactivateEmployee(row); }}>تعطيل الموظف</Button>
                      : '—'
                  },
                ]}
              />
            </QueryFeedback>
          </Card>

          <Card title={selectedEmployee ? `ملف: ${selectedEmployee.displayName}` : 'إضافة موظف'}>
            <form key={selectedEmployeeId || 'new'} className="form-grid" onSubmit={saveEmployee}>
              <label className="field"><span>رقم الموظف</span><input name="employeeNo" defaultValue={selectedEmployee?.employeeNo || ''} placeholder="تلقائي عند تركه فارغًا" /></label>
              <label className="field"><span>الاسم الأول</span><input name="firstName" required defaultValue={selectedEmployee?.firstName || ''} /></label>
              <label className="field"><span>اسم العائلة</span><input name="lastName" defaultValue={selectedEmployee?.lastName || ''} /></label>
              <label className="field"><span>الحالة</span><select name="status" defaultValue={selectedEmployee?.status || 'active'}><option value="active">نشط</option><option value="inactive">غير نشط</option><option value="deactivated">موقوف</option><option value="terminated">منتهي</option></select></label>
              <SelectField name="departmentId" label="القسم" options={departments.map((row) => ({ id: row.id, label: row.name }))} defaultValue={selectedEmployee?.departmentId || ''} />
              <SelectField name="jobTitleId" label="المسمى الوظيفي" options={jobTitles.map((row) => ({ id: row.id, label: row.name }))} defaultValue={selectedEmployee?.jobTitleId || ''} />
              <details className="field field-wide">
                <summary className="muted">خيارات متقدمة</summary>
                <SelectField name="positionId" label="الوظيفة" options={positions.map((row) => ({ id: row.id, label: row.name }))} defaultValue={selectedEmployee?.positionId || ''} />
              </details>
              <label className="field"><span>تاريخ التعيين</span><input name="hireDate" type="date" value={employeeHireDate} onChange={(event) => setEmployeeHireDate(normalizeDateInput(event.target.value))} /></label>
              <label className="field field-wide"><span>ملاحظات</span><textarea name="notes" rows={2} defaultValue={selectedEmployee?.notes || ''} /></label>
              {employeeFormMessage ? <div className="muted field-wide">{employeeFormMessage}</div> : null}
              <div className="actions compact-actions">
                <Button type="submit" disabled={mutations.saveEmployee.isPending}>حفظ الموظف</Button>
                {selectedEmployeeId ? <Button type="button" variant="secondary" onClick={() => setSelectedEmployeeId('')}>جديد</Button> : null}
                {selectedEmployeeId && selectedEmployee?.status === 'active' ? <Button type="button" variant="danger" onClick={() => void deactivateEmployee(selectedEmployee)} disabled={mutations.deactivateEmployee.isPending}>تعطيل الموظف</Button> : null}
              </div>
            </form>
          </Card>
        </>
      ) : null}

      {tab === 'withdrawals' ? (
        <Card title="حركات المسحوبات والسداد">
          <EmployeeRequired selected={Boolean(selectedEmployeeId)} />
          <div className="form-grid">
            <div className="field">
              <span>الموظف</span>
              <select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
                <option value="">اختر موظف أولًا</option>
                {employeeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>
            <label className="field"><span>الفترة</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="current_month">الشهر الحالي</option><option value="month">شهر محدد</option><option value="since_hire">من بداية التعيين</option><option value="custom">فترة مخصصة</option></select></label>
            {period === 'month' ? <label className="field"><span>الشهر</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label> : null}
            {period === 'custom' ? <><label className="field"><span>من</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="field"><span>إلى</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></> : null}
          </div>
          <StatsGrid items={[
            { key: 'withdrawals', label: 'إجمالي المسحوبات', value: formatHrMoney(withdrawalSummary.totalWithdrawals || 0) },
            { key: 'cash', label: 'إجمالي السداد الكاش', value: formatHrMoney(withdrawalSummary.totalManualCashRepayments ?? withdrawalSummary.totalCashRepayment ?? manualCashRepaymentsTotal) },
            { key: 'salary', label: 'إجمالي المستحق خصمه من الراتب', value: formatHrMoney(withdrawalSummary.totalSalaryDeductionDue || 0) },
            { key: 'remaining', label: 'إجمالي المتبقي', value: formatHrMoney(withdrawalSummary.totalRemaining || 0) },
            { key: 'open', label: 'عدد السلف المفتوحة', value: openLoanCountValue },
          ]} />
          <DataTable<HrWithdrawalRow>
            rows={withdrawals?.rows || []}
            rowKey={(row) => row.id}
            onRowClick={(row) => {
              const loanId = movementLoanId(row);
              if (loanId) setSelectedLoanId(loanId);
            }}
            columns={[
              { key: 'date', header: 'التاريخ والوقت', cell: (row) => formatDateTimeStable(movementDateValue(row)) },
              { key: 'type', header: 'النوع', cell: (row) => withdrawalTypeLabel(row.type) },
              { key: 'amount', header: 'المبلغ', cell: (row) => formatHrMoney(row.amount) },
              { key: 'method', header: 'طريقة التسوية / السداد', cell: (row) => row.type === 'repayment' ? repaymentMethodLabel((row as HrWithdrawalRow & { repaymentMethod?: string }).repaymentMethod || row.repaymentMode) : repaymentModeLabel(row.repaymentMode) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
              { key: 'remaining', header: 'المتبقي', cell: (row) => formatHrMoney(row.remainingAmount) },
              { key: 'note', header: 'ملاحظة', cell: (row) => movementNote(row) },
              { key: 'actions', header: 'إجراءات', cell: (row) => {
                const loanId = movementLoanId(row);
                return loanId ? <Button type="button" variant="secondary" onClick={() => setSelectedLoanId(loanId)}>عرض</Button> : '—';
              } },
            ]}
          />

          <Card title="إضافة سلفة أو قرض">
            <form className="form-grid" onSubmit={saveLoan}>
              <SelectField name="employeeId" label="الموظف" options={employeeOptions} defaultValue={selectedEmployeeId} disabled={!selectedEmployeeId} required />
              <label className="field"><span>رقم السلفة</span><input name="loanNo" placeholder="تلقائي عند تركه فارغًا" disabled={!selectedEmployeeId} /></label>
              <label className="field"><span>النوع</span><select name="loanType" disabled={!selectedEmployeeId}><option value="advance">سلفة</option><option value="loan">قرض</option></select></label>
              <label className="field"><span>طريقة التسوية / الخصم</span><select name="repaymentMode" value={loanSettlementMode} onChange={(event) => setLoanSettlementMode(event.target.value)} disabled={!selectedEmployeeId}><option value="deduct_next_salary">تخصم مرة واحدة من الراتب القادم</option><option value="monthly_salary_installment">تقسيط شهري من الراتب</option><option value="manual_cash">سداد كاش لاحقًا</option></select></label>
              <label className="field"><span>المبلغ</span><input name="principalAmount" type="number" min="0.01" step="0.01" required disabled={!selectedEmployeeId} /></label>
              {loanSettlementMode === 'monthly_salary_installment' ? <label className="field"><span>عدد الأقساط</span><input name="installmentCount" type="number" min="1" defaultValue="1" disabled={!selectedEmployeeId} /></label> : <input type="hidden" name="installmentCount" value="1" />}
              {loanSettlementMode === 'monthly_salary_installment' ? <label className="field"><span>قسط شهري</span><input name="monthlyInstallmentAmount" type="number" min="0.01" step="0.01" disabled={!selectedEmployeeId} /></label> : null}
              <label className="field"><span>تاريخ الإصدار</span><input name="issueDate" type="date" required disabled={!selectedEmployeeId} /></label>
              <label className="field"><span>تاريخ راتب قادم</span><input name="salaryDueDate" type="date" disabled={!selectedEmployeeId} /></label>
              {loanSettlementMode !== 'manual_cash' ? <label className="field"><span>أول استحقاق</span><input name="firstDueDate" type="date" disabled={!selectedEmployeeId} /></label> : <label className="field"><span>أول استحقاق</span><input name="firstDueDate" type="date" disabled={!selectedEmployeeId} /></label>}
              <label className="field field-wide"><span>ملاحظات</span><textarea name="notes" rows={2} disabled={!selectedEmployeeId} /></label>
              {loanFormMessage ? <div className="muted field-wide">{loanFormMessage}</div> : null}
              <div className="actions compact-actions"><Button type="submit" disabled={mutations.saveLoan.isPending}>حفظ المسحوب</Button></div>
            </form>
          </Card>

          <DataTable<HrLoan>
            rows={selectedEmployeeLoans}
            rowKey={(row) => row.id}
            onRowClick={(row) => setSelectedLoanId(row.id)}
            rowClassName={(row) => row.id === selectedLoanId ? 'table-row-selected' : undefined}
            columns={[
              { key: 'loanNo', header: 'رقم', cell: (row) => row.loanNo || '—' },
              { key: 'amount', header: 'المبلغ', cell: (row) => formatHrMoney(row.principalAmount) },
              { key: 'method', header: 'طريقة السداد', cell: (row) => repaymentModeLabel(row.repaymentMode) },
              { key: 'remaining', header: 'المتبقي', cell: (row) => formatHrMoney(row.remainingAmount) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
              {
                key: 'actions',
                header: 'إجراءات',
                cell: (row) => (
                  <div className="actions compact-actions">
                    {row.status === 'draft' ? <Button variant="secondary" onClick={() => mutations.approveLoan.mutate(row.id)}>اعتماد</Button> : null}
                    {row.status === 'approved' ? <Button variant="secondary" onClick={() => mutations.disburseLoan.mutate(row.id)}>صرف</Button> : null}
                    {['paid', 'disbursed', 'partially_repaid'].includes(String(row.status || '')) ? <Button type="button" variant="secondary" onClick={() => setSelectedLoanId(row.id)}>سداد</Button> : null}
                  </div>
                )
              },
            ]}
          />
          {selectedLoan ? (
            <Card title="تفاصيل السلفة / القرض">
              <div className="stats-grid">
                <div><span className="muted">رقم السلفة / القرض</span><strong>{selectedLoan.loanNo || '—'}</strong></div>
                <div><span className="muted">الموظف</span><strong>{selectedLoan.employeeName || selectedEmployee?.displayName || '—'}</strong></div>
                <div><span className="muted">النوع</span><strong>{withdrawalTypeLabel(selectedLoan.loanType)}</strong></div>
                <div><span className="muted">المبلغ الأصلي</span><strong>{formatHrMoney(selectedLoan.principalAmount)}</strong></div>
                <div><span className="muted">إجمالي المدفوع</span><strong>{formatHrMoney(selectedLoan.paidAmount)}</strong></div>
                <div><span className="muted">المتبقي</span><strong>{formatHrMoney(selectedLoan.remainingAmount)}</strong></div>
                <div><span className="muted">طريقة التسوية / الخصم</span><strong>{repaymentModeLabel(selectedLoan.repaymentMode)}</strong></div>
                <div><span className="muted">الحالة</span><strong>{statusLabel(selectedLoan.status)}</strong></div>
                <div><span className="muted">تاريخ الإصدار</span><strong>{formatDateOnly(loanDateValue(selectedLoan, ['issueDate', 'issue_date', 'issue_date_text']))}</strong></div>
                <div><span className="muted">تاريخ الاعتماد</span><strong>{formatDateTimeStable((selectedLoan as HrLoan & { approvedAt?: string }).approvedAt)}</strong></div>
                <div><span className="muted">تاريخ الصرف</span><strong>{formatDateTimeStable((selectedLoan as HrLoan & { disbursedAt?: string; paidAt?: string }).disbursedAt || (selectedLoan as HrLoan & { paidAt?: string }).paidAt)}</strong></div>
              </div>
              {selectedLoanInstallments.length ? (
                <>
                  <h3>جدول الأقساط</h3>
                  <DataTable
                    rows={selectedLoanInstallments}
                    rowKey={(row) => String(row.id || row.installmentNo)}
                    columns={[
                      { key: 'no', header: 'رقم القسط', cell: (row) => String(row.installmentNo || row.installment_no || '—') },
                      { key: 'due', header: 'تاريخ الاستحقاق', cell: (row) => formatDateOnly(String(row.dueDate || row.due_date || '')) },
                      { key: 'amount', header: 'مبلغ القسط', cell: (row) => formatHrMoney(row.amount) },
                      { key: 'paid', header: 'المدفوع', cell: (row) => formatHrMoney(row.paidAmount || row.paid_amount) },
                      { key: 'remaining', header: 'المتبقي', cell: (row) => formatHrMoney(row.remainingAmount || row.remaining_amount) },
                      { key: 'status', header: 'الحالة', cell: (row) => statusLabel(String(row.status || '')) },
                    ]}
                  />
                </>
              ) : null}
              <h3>حركات السداد</h3>
              <DataTable
                rows={selectedLoanRepayments}
                rowKey={(row) => row.id}
                columns={[
                  { key: 'date', header: 'التاريخ والوقت', cell: (row) => formatDateTimeStable(movementDateValue(row)) },
                  { key: 'method', header: 'طريقة السداد', cell: (row) => repaymentMethodLabel((row as HrWithdrawalRow & { repaymentMethod?: string }).repaymentMethod || row.repaymentMode) },
                  { key: 'amount', header: 'المبلغ', cell: (row) => formatHrMoney(row.amount) },
                  { key: 'note', header: 'ملاحظة', cell: (row) => movementNote(row) },
                ]}
              />
            </Card>
          ) : null}
          <h3>تسجيل سداد</h3>
          {!selectedLoan ? <div className="muted">اختر سلفة أو قرض من الجدول لعرض التفاصيل أو تسجيل السداد.</div> : null}
          {selectedLoan && !canRepaySelectedLoan ? <div className="muted">اختر سلفة مصروفة أو مسددة جزئيًا لتسجيل السداد.</div> : null}
          {canRepaySelectedLoan ? (
            <form className="form-grid" onSubmit={repayLoan}>
              <label className="field"><span>المبلغ</span><input name="amount" type="number" min="0.01" step="0.01" /></label>
              <label className="field"><span>طريقة السداد الفعلي</span><select name="repaymentMethod"><option value="manual_cash">سداد كاش</option><option value="salary_deduction">خصم من الراتب بدون خزينة</option></select></label>
              <label className="field"><span>ملاحظة</span><input name="note" /></label>
              <div className="muted field-wide">السداد الكاش يدخل الخزينة، خصم الراتب يسجل في HR فقط بدون حركة خزينة.</div>
              <div className="actions compact-actions"><Button type="submit" disabled={mutations.repayLoan.isPending}>تسجيل سداد</Button></div>
            </form>
          ) : null}
        </Card>
      ) : null}

      {tab === 'contracts' ? (
        <Card title="بيانات العقد والراتب">
          <EmployeeRequired selected={Boolean(selectedEmployeeId)} />
          <div className="muted">سجل العقد والراتب الأساسي للموظف عند الحاجة. اترك تاريخ النهاية فارغًا للعقود المفتوحة.</div>
          <form className="form-grid" onSubmit={saveContract}>
            <label className="field"><span>رقم العقد</span><input name="contractNo" placeholder="تلقائي عند تركه فارغًا" disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <label className="field"><span>الحالة</span><select name="status" disabled={!selectedEmployeeId || !canManageSalary}><option value="draft">مسودة</option><option value="active">نشط</option><option value="ended">منتهي</option><option value="cancelled">ملغي</option></select></label>
            <label className="field"><span>من تاريخ</span><input name="startDate" type="date" required disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <label className="field"><span>إلى تاريخ</span><input name="endDate" type="date" disabled={!selectedEmployeeId || !canManageSalary} /><small className="muted">اتركه فارغًا لو العقد مفتوح وغير محدد المدة</small></label>
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
              { key: 'salary', header: 'الراتب', cell: (row) => canViewSalary && typeof row.baseSalary === 'number' ? formatHrMoney(row.baseSalary) : 'محجوب' },
            ]}
          />
          <h3>بدلات وخصومات ثابتة شهرية - اختياري</h3>
          <div className="muted">الجزاءات والتأخير والغياب ليست هنا، سيتم تسجيلها لاحقًا في الخصومات والجزاءات.</div>
          <form className="form-grid" onSubmit={saveCompensation}>
            <SelectField name="contractId" label="العقد" disabled={!selectedEmployeeId || !canManageSalary} options={(profile.data?.contracts || []).map((row) => ({ id: row.id, label: row.contractNo || row.startDate }))} />
            <label className="field"><span>تفاصيل الراتب</span><input name="packageName" disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <label className="field"><span>بدلات</span><input name="allowanceAmount" type="number" min="0" step="0.01" disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <label className="field"><span>خصومات</span><input name="deductionAmount" type="number" min="0" step="0.01" disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <label className="field"><span>من</span><input name="effectiveFrom" type="date" disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <label className="field"><span>إلى</span><input name="effectiveTo" type="date" disabled={!selectedEmployeeId || !canManageSalary} /></label>
            <div className="actions compact-actions"><Button type="submit" disabled={!selectedEmployeeId || !canManageSalary || mutations.saveCompensation.isPending}>حفظ التعويض</Button></div>
          </form>
        </Card>
      ) : null}

      {tab === 'documents' ? (
        <Card title={selectedEmployee ? `مستندات الموظف: ${selectedEmployee.displayName} - ${selectedEmployee.employeeNo || '—'}` : 'المستندات'} description="يتم حفظ بيانات المستند فقط، وليس الملف نفسه.">
          <EmployeeRequired selected={Boolean(selectedEmployeeId)} />
          <form className="form-grid" onSubmit={saveDocument}>
            <label className="field"><span>اسم المستند</span><input name="title" required disabled={!selectedEmployeeId} /></label>
            <label className="field"><span>النوع</span><select name="documentType" disabled={!selectedEmployeeId}><option value="بطاقة شخصية">بطاقة شخصية</option><option value="عقد عمل">عقد عمل</option><option value="شهادة تخرج">شهادة تخرج</option><option value="فيش وتشبيه">فيش وتشبيه</option><option value="شهادة صحية">شهادة صحية</option><option value="رخصة قيادة">رخصة قيادة</option><option value="أخرى">أخرى</option></select></label>
            <label className="field field-wide"><span>الرابط أو المسار</span><input name="fileUrl" disabled={!selectedEmployeeId} /><small className="muted">ضع رابط الملف أو مكان حفظه إن وجد</small></label>
            <label className="field"><span>تاريخ الانتهاء</span><input name="expiryDate" type="date" disabled={!selectedEmployeeId} /><small className="muted">اتركه فارغًا لو المستند ليس له تاريخ انتهاء</small></label>
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
      ) : null}

      {tab === 'settings' ? (
        <Card title="الإعدادات الأساسية">
          <div className="three-column-grid">
            <MasterDataForm title="قسم جديد" kind="departments" departments={departments} jobTitles={jobTitles} />
            <MasterDataForm title="مسمى وظيفي جديد" kind="job-titles" departments={departments} jobTitles={jobTitles} />
            <details>
              <summary className="muted">الوظائف الاختيارية</summary>
              <MasterDataForm title="وظيفة جديدة" kind="positions" departments={departments} jobTitles={jobTitles} />
            </details>
          </div>
          <div className="two-column-grid">
            <DataTable<HrMasterDataRecord> rows={departments} rowKey={(row) => row.id} columns={[{ key: 'name', header: 'الأقسام', cell: (row) => row.name }, { key: 'code', header: 'الكود', cell: (row) => row.code || '—' }]} />
            <DataTable<HrMasterDataRecord> rows={jobTitles} rowKey={(row) => row.id} columns={[{ key: 'name', header: 'المسميات', cell: (row) => row.name }, { key: 'code', header: 'الكود', cell: (row) => row.code || '—' }]} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
