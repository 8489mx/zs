import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee, HrLoan, HrLoanInstallment } from '@/types/domain';
import { getErrorMessage } from '@/lib/errors';
import { useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';
import { HrLoanCreateForm } from '@/features/hr/pages/loans/HrLoanCreateForm';
import { HrLoanRepaymentForm } from '@/features/hr/pages/loans/HrLoanRepaymentForm';
import {
  addMonths,
  createInitialLoanDraft,
  fallbackText,
  installmentStatusLabel,
  loanTypeLabel,
  monthLabel,
  monthNames,
  money,
  normalizeArabicDigits,
  parsePositiveNumber,
  repaymentModeLabel,
  statusLabel,
  type LoanDraft,
} from '@/features/hr/pages/loans/hr-loans.helpers';

interface RepaymentDraft {
  amount: string;
  method: string;
  notes: string;
}

export function HrLoansPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const canViewLoans = useHasAnyPermission('hrLoans');
  const canManageLoans = useHasAnyPermission('hrLoans');
  const canViewSalaryAmounts = useHasAnyPermission(['hrLoans', 'hrSalaryView', 'hrSalaryManage', 'hrPayrollManage', 'hrPayrollApprove']);

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

  const planPreview = useMemo(() => {
    const principalAmount = parsePositiveNumber(loanDraft.principalAmount);
    const isInstallments = loanDraft.repaymentMethod === 'installments';
    const installmentCount = isInstallments
      ? Math.max(1, Math.min(60, Math.floor(parsePositiveNumber(loanDraft.installmentCount) || 1)))
      : 1;

    if (!(principalAmount > 0)) {
      return {
        principalAmount: 0,
        installmentCount,
        installmentAmount: 0,
        totalInstallments: 0,
        startMonthLabel: '—',
        endMonthLabel: '—',
        firstDueDate: '',
      };
    }

    const baseInstallment = Number((principalAmount / installmentCount).toFixed(2));
    const totalBeforeLast = Number((baseInstallment * Math.max(0, installmentCount - 1)).toFixed(2));
    const lastInstallment = Number((principalAmount - totalBeforeLast).toFixed(2));
    const totalInstallments = Number((totalBeforeLast + lastInstallment).toFixed(2));

    const deductionMonth = Math.max(1, Math.min(12, Number(normalizeArabicDigits(loanDraft.firstDeductionMonth || '0')) || 1));
    const deductionYear = Math.max(2000, Number(normalizeArabicDigits(loanDraft.firstDeductionYear || '0')) || new Date().getFullYear());
    const firstDueDate = `${deductionYear}-${String(deductionMonth).padStart(2, '0')}-01`;
    const endMonth = addMonths(deductionYear, deductionMonth, installmentCount - 1);

    return {
      principalAmount,
      installmentCount,
      installmentAmount: baseInstallment,
      totalInstallments,
      startMonthLabel: monthLabel(firstDueDate),
      endMonthLabel: `${monthNames[endMonth.month - 1] || String(endMonth.month).padStart(2, '0')} ${endMonth.year}`,
      firstDueDate,
    };
  }, [loanDraft]);

  async function handleCreateLoan() {
    setFormError('');

    const employeeId = String(loanDraft.employeeId || '').trim();
    const principalAmount = parsePositiveNumber(loanDraft.principalAmount);
    const issueDate = String(loanDraft.issueDate || '').trim();
    const isInstallments = loanDraft.repaymentMethod === 'installments';
    const rawInstallmentCount = Math.floor(parsePositiveNumber(loanDraft.installmentCount) || 0);
    const installmentCount = isInstallments ? planPreview.installmentCount : 1;

    if (!employeeId) {
      setFormError('اختيار الموظف مطلوب.');
      return;
    }
    if (!(principalAmount > 0)) {
      setFormError('قيمة السلفة مطلوبة ويجب أن تكون أكبر من صفر.');
      return;
    }
    if (!issueDate) {
      setFormError('تاريخ السلفة مطلوب.');
      return;
    }
    if (isInstallments && rawInstallmentCount <= 0) {
      setFormError('عدد الدفعات مطلوب ويجب أن يكون أكبر من صفر.');
      return;
    }
    if (isInstallments && installmentCount > 60) {
      setFormError('عدد الدفعات يجب ألا يتجاوز 60 دفعة.');
      return;
    }

    try {
      await mutations.saveLoan.mutateAsync({
        payload: {
          employeeId,
          loanType: String(loanDraft.loanType || 'advance').trim() || 'advance',
          principalAmount,
          installmentCount,
          repaymentMode: isInstallments ? 'monthly_salary_installment' : 'deduct_next_salary',
          issueDate,
          firstDueDate: planPreview.firstDueDate || undefined,
          notes: String(loanDraft.notes || '').trim() || undefined,
        },
      });
      setLoanDraft(createInitialLoanDraft());
    } catch (error) {
      setFormError(getErrorMessage(error, 'تعذر حفظ السلفة.'));
    }
  }

  async function handleRepay() {
    setRepaymentError('');

    if (!selectedRepaymentLoan?.id) return;

    const amount = parsePositiveNumber(repaymentDraft.amount);
    if (!(amount > 0)) {
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
        description="إدارة السلف وخطط السداد ومراجعة الأقساط المستحقة للموظفين."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>}
      />

      {!canViewLoans ? (
        <Card title="الوصول للسلف والخصومات">
          <p className="muted" style={{ margin: 0 }}>ليس لديك صلاحية للوصول إلى هذه الصفحة.</p>
          <p className="muted" style={{ marginBottom: 0 }}>تواصل مع مسؤول النظام لتحديث الصلاحيات.</p>
        </Card>
      ) : (
        <>
            <Card title="سلفة جديدة">
        <HrLoanCreateForm
          loanDraft={loanDraft}
          employees={employees as HrEmployee[]}
          canManageLoans={canManageLoans}
          formError={formError}
          planPreview={planPreview}
          isPending={mutations.saveLoan.isPending}
          onChange={(patch) => setLoanDraft((current) => ({ ...current, ...patch }))}
          onSubmit={() => {
            void handleCreateLoan();
          }}
        />
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
          errorTitle="تعذر تحميل بيانات السلف"
          emptyTitle="لا توجد سلف مسجلة حتى الآن."
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
              { key: 'principalAmount', header: 'قيمة السلفة', cell: (row) => canViewSalaryAmounts ? money(row.principalAmount) : 'لا تملك صلاحية عرض هذه البيانات.' },
              { key: 'remainingAmount', header: 'المتبقي', cell: (row) => canViewSalaryAmounts ? money(row.remainingAmount) : 'لا تملك صلاحية عرض هذه البيانات.' },
              { key: 'repaymentMode', header: 'طريقة السداد', cell: (row) => repaymentModeLabel(row.repaymentMode) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
              { key: 'issueDate', header: 'تاريخ السلفة', cell: (row) => fallbackText(row.issueDate) },
              {
                key: 'plan',
                header: 'خطة السداد',
                cell: (row) => {
                  const installments = Array.isArray(row.installments) ? row.installments as HrLoanInstallment[] : [];
                  if (!installments.length) return fallbackText(repaymentModeLabel(row.repaymentMode));
                  return (
                    <details>
                      <summary>{`عدد الأقساط: ${installments.length}`}</summary>
                      <div className="table-wrap" style={{ marginTop: 8 }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>رقم القسط</th>
                              <th>شهر الاستحقاق</th>
                              <th>قيمة القسط</th>
                              <th>الحالة</th>
                              <th>تاريخ الخصم</th>
                            </tr>
                          </thead>
                          <tbody>
                            {installments.map((item) => (
                              <tr key={String(item.id)}>
                                <td>{item.installmentNumber || '—'}</td>
                                <td>{monthLabel(item.dueDate)}</td>
                                <td>{canViewSalaryAmounts ? money(item.amount) : 'لا تملك صلاحية عرض هذه البيانات.'}</td>
                                <td>{installmentStatusLabel(item.status)}</td>
                                <td>{fallbackText(item.paidAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  );
                },
              },
              {
                key: 'actions',
                header: 'إجراءات',
                cell: (row) => {
                  const status = String(row.status || '').trim().toLowerCase();
                  const canApprove = canManageLoans && (!status || status === 'pending' || status === 'draft' || status === 'new');
                  const canDisburse = canManageLoans && status === 'approved';
                  const canRepay = canManageLoans && Number(row.remainingAmount || 0) > 0;
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
            <HrLoanRepaymentForm
              selectedLoanLabel={fallbackText(selectedRepaymentLoan.loanNo || selectedRepaymentLoan.id)}
              remainingAmountText={canViewSalaryAmounts ? money(selectedRepaymentLoan.remainingAmount) : 'لا تملك صلاحية عرض هذه البيانات.'}
              repaymentDraft={repaymentDraft}
              repaymentError={repaymentError}
              isPending={mutations.repayLoan.isPending}
              onChange={(patch) => setRepaymentDraft((current) => ({ ...current, ...patch }))}
              onSubmit={() => {
                void handleRepay();
              }}
              onCancel={() => setSelectedLoanForRepayment('')}
            />
          ) : null}
        </QueryFeedback>
      </Card>
      </>
      )}
    </div>
  );
}


