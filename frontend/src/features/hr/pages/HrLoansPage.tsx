import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee, HrLoan } from '@/types/domain';
import { getErrorMessage } from '@/lib/errors';
import { useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';

interface LoanDraft {
  employeeId: string;
  loanType: string;
  principalAmount: string;
  installmentCount: string;
  installmentAmount: string;
  issueDate: string;
  firstDueDate: string;
  repaymentMode: string;
  notes: string;
}

interface RepaymentDraft {
  amount: string;
  method: string;
  notes: string;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialLoanDraft(): LoanDraft {
  return {
    employeeId: '',
    loanType: 'advance',
    principalAmount: '',
    installmentCount: '1',
    installmentAmount: '',
    issueDate: todayDate(),
    firstDueDate: '',
    repaymentMode: 'deduct_next_salary',
    notes: '',
  };
}

function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0.00 ج.م';
  return `${amount.toFixed(2)} ج.م`;
}

function fallbackText(value: unknown) {
  return String(value || '').trim() || '—';
}

function statusLabel(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'pending') return 'قيد المراجعة';
  if (status === 'draft') return 'مسودة';
  if (status === 'new') return 'جديدة';
  if (status === 'approved') return 'معتمدة';
  if (status === 'disbursed') return 'مصروفة';
  if (status === 'partially_repaid') return 'مسددة جزئيًا';
  if (status === 'repaid' || status === 'paid') return 'مسددة';
  if (status === 'cancelled') return 'ملغاة';
  return 'غير محدد';
}

function loanTypeLabel(value: unknown) {
  const loanType = String(value || '').trim().toLowerCase();
  if (loanType === 'advance') return 'سلفة';
  if (loanType === 'deduction') return 'خصم';
  if (loanType === 'other') return 'أخرى';
  return fallbackText(value);
}

function repaymentModeLabel(value: unknown) {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'deduct_next_salary') return 'خصم من أقرب مرتب';
  if (mode === 'monthly_salary_installment') return 'أقساط شهرية من المرتب';
  if (mode === 'manual_cash') return 'سداد نقدي/يدوي';
  return fallbackText(value);
}

function employeeName(row: HrEmployee) {
  return fallbackText(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim());
}

export function HrLoansPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loanDraft, setLoanDraft] = useState<LoanDraft>(createInitialLoanDraft);
  const [formError, setFormError] = useState('');
  const [selectedLoanForRepayment, setSelectedLoanForRepayment] = useState<string>('');
  const [repaymentDraft, setRepaymentDraft] = useState<RepaymentDraft>({ amount: '', method: '', notes: '' });
  const [repaymentError, setRepaymentError] = useState('');

  const workspace = useHrWorkspace({ search, page, pageSize });
  const employees = useMemo(() => workspace.employees.data?.employees || [], [workspace.employees.data?.employees]);
  const loans = useMemo(() => (workspace.loans.data?.loans || []) as HrLoan[], [workspace.loans.data?.loans]);
  const totalItems = Number(workspace.loans.data?.summary?.totalItems || loans.length || 0);

  const selectedRepaymentLoan = useMemo(
    () => loans.find((row) => String(row.id) === String(selectedLoanForRepayment)),
    [loans, selectedLoanForRepayment],
  );

  async function handleCreateLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    const employeeId = String(loanDraft.employeeId || '').trim();
    const principalAmount = Number(loanDraft.principalAmount);
    const installmentCount = Number(loanDraft.installmentCount || 1);
    const issueDate = String(loanDraft.issueDate || '').trim();

    if (!employeeId) {
      setFormError('اختيار الموظف مطلوب.');
      return;
    }
    if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
      setFormError('قيمة السلفة مطلوبة.');
      return;
    }
    if (!issueDate) {
      setFormError('تاريخ السلفة مطلوب.');
      return;
    }
    if (!Number.isFinite(installmentCount) || installmentCount < 1) {
      setFormError('عدد الأقساط يجب ألا يقل عن 1.');
      return;
    }

    try {
      await mutations.saveLoan.mutateAsync({
        payload: {
          employeeId,
          loanType: String(loanDraft.loanType || 'advance').trim() || 'advance',
          principalAmount,
          installmentCount,
          installmentAmount: loanDraft.installmentAmount ? Number(loanDraft.installmentAmount) : undefined,
          repaymentMode: String(loanDraft.repaymentMode || 'deduct_next_salary').trim() || 'deduct_next_salary',
          issueDate,
          firstDueDate: String(loanDraft.firstDueDate || '').trim() || undefined,
          notes: String(loanDraft.notes || '').trim() || undefined,
        },
      });
      setLoanDraft(createInitialLoanDraft());
    } catch (error) {
      setFormError(getErrorMessage(error, 'تعذر حفظ السلفة.'));
    }
  }

  async function handleRepay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRepaymentError('');

    if (!selectedRepaymentLoan?.id) return;

    const amount = Number(repaymentDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setRepaymentError('قيمة السداد مطلوبة.');
      return;
    }

    try {
      await mutations.repayLoan.mutateAsync({
        id: String(selectedRepaymentLoan.id),
        payload: {
          amount,
          repaymentMethod: String(repaymentDraft.method || '').trim() || undefined,
          notes: String(repaymentDraft.notes || '').trim() || undefined,
        },
      });
      setRepaymentDraft({ amount: '', method: '', notes: '' });
      setSelectedLoanForRepayment('');
    } catch (error) {
      setRepaymentError(getErrorMessage(error, 'تعذر تسجيل السداد.'));
    }
  }

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="السلف والخصومات"
        description="تسجيل سلف الموظفين ومتابعة السداد والخصومات المرتبطة بالمرتب."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>}
      />

      <Card title="سلفة جديدة">
        <form className="form-grid" onSubmit={(event) => { void handleCreateLoan(event); }}>
          <label className="field">
            <span>الموظف *</span>
            <select value={loanDraft.employeeId} onChange={(event) => setLoanDraft((current) => ({ ...current, employeeId: event.target.value }))}>
              <option value="">اختر الموظف</option>
              {employees.map((row) => (
                <option key={String(row.id)} value={String(row.id)}>{employeeName(row)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>نوع السلفة</span>
            <select value={loanDraft.loanType} onChange={(event) => setLoanDraft((current) => ({ ...current, loanType: event.target.value }))}>
              <option value="advance">سلفة</option>
              <option value="deduction">خصم</option>
              <option value="other">أخرى</option>
            </select>
          </label>
          <label className="field">
            <span>قيمة السلفة *</span>
            <input type="number" min="0" step="0.01" value={loanDraft.principalAmount} onChange={(event) => setLoanDraft((current) => ({ ...current, principalAmount: event.target.value }))} />
          </label>
          <label className="field">
            <span>عدد الأقساط</span>
            <input type="number" min="1" step="1" value={loanDraft.installmentCount} onChange={(event) => setLoanDraft((current) => ({ ...current, installmentCount: event.target.value }))} />
          </label>
          <label className="field">
            <span>قيمة القسط</span>
            <input type="number" min="0" step="0.01" value={loanDraft.installmentAmount} onChange={(event) => setLoanDraft((current) => ({ ...current, installmentAmount: event.target.value }))} />
          </label>
          <label className="field">
            <span>تاريخ السلفة *</span>
            <input type="date" value={loanDraft.issueDate} onChange={(event) => setLoanDraft((current) => ({ ...current, issueDate: event.target.value }))} />
          </label>
          <label className="field">
            <span>أول استحقاق</span>
            <input type="date" value={loanDraft.firstDueDate} onChange={(event) => setLoanDraft((current) => ({ ...current, firstDueDate: event.target.value }))} />
          </label>
          <label className="field">
            <span>طريقة السداد</span>
            <select value={loanDraft.repaymentMode} onChange={(event) => setLoanDraft((current) => ({ ...current, repaymentMode: event.target.value }))}>
              <option value="deduct_next_salary">خصم من أقرب مرتب</option>
              <option value="monthly_salary_installment">أقساط شهرية من المرتب</option>
              <option value="manual_cash">سداد نقدي/يدوي</option>
            </select>
          </label>
          <label className="field field-wide">
            <span>ملاحظات</span>
            <input value={loanDraft.notes} onChange={(event) => setLoanDraft((current) => ({ ...current, notes: event.target.value }))} />
          </label>

          {formError ? <div className="field-wide error-box">{formError}</div> : null}

          <div className="actions compact-actions field-wide">
            <Button type="submit" disabled={mutations.saveLoan.isPending}>{mutations.saveLoan.isPending ? 'جاري الحفظ...' : 'حفظ السلفة'}</Button>
          </div>
        </form>
      </Card>

      <Card title="قائمة السلف">
        <SearchToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="بحث باسم الموظف أو رقم السلفة"
          inputAriaLabel="بحث السلف"
        />

        <QueryFeedback
          isLoading={workspace.loans.isLoading}
          isError={workspace.loans.isError}
          error={workspace.loans.error}
          isEmpty={!loans.length}
          loadingText="جاري تحميل السلف..."
          errorTitle="تعذر تحميل السلف"
          emptyTitle="لا توجد سلف مسجلة."
        >
          <DataTable
            rows={loans}
            rowKey={(row) => String(row.id)}
            density="compact"
            pagination={{
              page,
              pageSize,
              totalItems,
              onPageChange: setPage,
              onPageSizeChange: (next) => {
                setPageSize(next);
                setPage(1);
              },
              itemLabel: 'سلفة',
            }}
            columns={[
              { key: 'loanNo', header: 'رقم السلفة', cell: (row) => fallbackText(row.loanNo || row.id) },
              { key: 'employee', header: 'الموظف', cell: (row) => fallbackText(row.employeeName) },
              { key: 'loanType', header: 'النوع', cell: (row) => loanTypeLabel(row.loanType) },
              { key: 'principalAmount', header: 'قيمة السلفة', cell: (row) => money(row.principalAmount) },
              { key: 'paidAmount', header: 'المدفوع', cell: (row) => money(row.paidAmount) },
              { key: 'remainingAmount', header: 'المتبقي', cell: (row) => money(row.remainingAmount) },
              { key: 'repaymentMode', header: 'طريقة السداد', cell: (row) => repaymentModeLabel(row.repaymentMode) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
              { key: 'issueDate', header: 'تاريخ السلفة', cell: (row) => fallbackText(row.issueDate) },
              {
                key: 'actions',
                header: 'إجراءات',
                cell: (row) => {
                  const status = String(row.status || '').trim().toLowerCase();
                  const canApprove = !status || status === 'pending' || status === 'draft' || status === 'new';
                  const canDisburse = status === 'approved';
                  const canRepay = Number(row.remainingAmount || 0) > 0;
                  return (
                    <div className="actions compact-actions">
                      {canApprove ? <Button variant="secondary" onClick={() => { void mutations.approveLoan.mutateAsync(String(row.id)); }}>اعتماد</Button> : null}
                      {canDisburse ? <Button variant="secondary" onClick={() => { void mutations.disburseLoan.mutateAsync(String(row.id)); }}>صرف</Button> : null}
                      {canRepay ? <Button variant="secondary" onClick={() => setSelectedLoanForRepayment(String(row.id))}>تسجيل سداد</Button> : null}
                    </div>
                  );
                },
              },
            ]}
          />

          {selectedRepaymentLoan ? (
            <form className="form-grid" style={{ marginTop: 12 }} onSubmit={(event) => { void handleRepay(event); }}>
              <label className="field">
                <span>السلفة المحددة</span>
                <input value={fallbackText(selectedRepaymentLoan.loanNo || selectedRepaymentLoan.id)} disabled />
              </label>
              <label className="field">
                <span>المتبقي</span>
                <input value={money(selectedRepaymentLoan.remainingAmount)} disabled />
              </label>
              <label className="field">
                <span>قيمة السداد</span>
                <input type="number" min="0" step="0.01" value={repaymentDraft.amount} onChange={(event) => setRepaymentDraft((current) => ({ ...current, amount: event.target.value }))} />
              </label>
              <label className="field">
                <span>الطريقة</span>
                <input value={repaymentDraft.method} onChange={(event) => setRepaymentDraft((current) => ({ ...current, method: event.target.value }))} />
              </label>
              <label className="field field-wide">
                <span>ملاحظات</span>
                <input value={repaymentDraft.notes} onChange={(event) => setRepaymentDraft((current) => ({ ...current, notes: event.target.value }))} />
              </label>

              {repaymentError ? <div className="field-wide error-box">{repaymentError}</div> : null}

              <div className="actions compact-actions field-wide">
                <Button type="submit" disabled={mutations.repayLoan.isPending}>{mutations.repayLoan.isPending ? 'جاري التسجيل...' : 'تسجيل سداد'}</Button>
                <Button type="button" variant="secondary" onClick={() => setSelectedLoanForRepayment('')}>إلغاء</Button>
              </div>
            </form>
          ) : null}
        </QueryFeedback>
      </Card>
    </div>
  );
}
