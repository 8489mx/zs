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
        startMonthLabel: 'â€”',
        endMonthLabel: 'â€”',
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
      setFormError('ط§ط®طھظٹط§ط± ط§ظ„ظ…ظˆط¸ظپ ظ…ط·ظ„ظˆط¨.');
      return;
    }
    if (!(principalAmount > 0)) {
      setFormError('ظ‚ظٹظ…ط© ط§ظ„ط³ظ„ظپط© ظ…ط·ظ„ظˆط¨ط© ظˆظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ط£ظƒط¨ط± ظ…ظ† طµظپط±.');
      return;
    }
    if (!issueDate) {
      setFormError('طھط§ط±ظٹط® ط§ظ„ط³ظ„ظپط© ظ…ط·ظ„ظˆط¨.');
      return;
    }
    if (isInstallments && rawInstallmentCount <= 0) {
      setFormError('ط¹ط¯ط¯ ط§ظ„ط¯ظپط¹ط§طھ ظ…ط·ظ„ظˆط¨ ظˆظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط£ظƒط¨ط± ظ…ظ† طµظپط±.');
      return;
    }
    if (isInstallments && installmentCount > 60) {
      setFormError('ط¹ط¯ط¯ ط§ظ„ط¯ظپط¹ط§طھ ظٹط¬ط¨ ط£ظ„ط§ ظٹطھط¬ط§ظˆط² 60 ط¯ظپط¹ط©.');
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
      setFormError(getErrorMessage(error, 'طھط¹ط°ط± ط­ظپط¸ ط§ظ„ط³ظ„ظپط©.'));
    }
  }

  async function handleRepay() {
    setRepaymentError('');

    if (!selectedRepaymentLoan?.id) return;

    const amount = parsePositiveNumber(repaymentDraft.amount);
    if (!(amount > 0)) {
      setRepaymentError('ظ‚ظٹظ…ط© ط§ظ„ط³ط¯ط§ط¯ ظ…ط·ظ„ظˆط¨ط©.');
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
      setRepaymentError(getErrorMessage(error, 'طھط¹ط°ط± طھط³ط¬ظٹظ„ ط§ظ„ط³ط¯ط§ط¯.'));
    }
  }

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="ط§ظ„ط³ظ„ظپ ظˆط§ظ„ط®طµظˆظ…ط§طھ"
        description="ط¥ط¯ط§ط±ط© ط§ظ„ط³ظ„ظپ ظˆط®ط·ط· ط§ظ„ط³ط¯ط§ط¯ ظˆظ…ط±ط§ط¬ط¹ط© ط§ظ„ط£ظ‚ط³ط§ط· ط§ظ„ظ…ط³طھط­ظ‚ط© ظ„ظ„ظ…ظˆط¸ظپظٹظ†."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>ط±ط¬ظˆط¹ ظ„ظ„ظ…ظˆط¸ظپظٹظ†</Button>}
      />

      {!canViewLoans ? (
        <Card title="ط§ظ„ظˆطµظˆظ„ ظ„ظ„ط³ظ„ظپ ظˆط§ظ„ط®طµظˆظ…ط§طھ">
          <p className="muted" style={{ margin: 0 }}>ظ„ظٹط³ ظ„ط¯ظٹظƒ طµظ„ط§ط­ظٹط© ظ„ظ„ظˆطµظˆظ„ ط¥ظ„ظ‰ ظ‡ط°ظ‡ ط§ظ„طµظپط­ط©.</p>
          <p className="muted" style={{ marginBottom: 0 }}>طھظˆط§طµظ„ ظ…ط¹ ظ…ط³ط¤ظˆظ„ ط§ظ„ظ†ط¸ط§ظ… ظ„طھط­ط¯ظٹط« ط§ظ„طµظ„ط§ط­ظٹط§طھ.</p>
        </Card>
      ) : (
        <>
            <Card title="ط³ظ„ظپط© ط¬ط¯ظٹط¯ط©">
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

      <Card title="ظ‚ط§ط¦ظ…ط© ط§ظ„ط³ظ„ظپ">
        <SearchToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="ط¨ط­ط« ط¨ط§ط³ظ… ط§ظ„ظ…ظˆط¸ظپ ط£ظˆ ط±ظ‚ظ… ط§ظ„ط³ظ„ظپط©"
          inputAriaLabel="ط¨ط­ط« ط§ظ„ط³ظ„ظپ"
        />

        <QueryFeedback
          isLoading={workspace.loans.isLoading}
          isError={workspace.loans.isError}
          error={workspace.loans.error}
          isEmpty={!loans.length}
          loadingText="ط¬ط§ط±ظٹ طھط­ظ…ظٹظ„ ط§ظ„ط³ظ„ظپ..."
          errorTitle="طھط¹ط°ط± طھط­ظ…ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط³ظ„ظپ"
          emptyTitle="ظ„ط§ طھظˆط¬ط¯ ط³ظ„ظپ ظ…ط³ط¬ظ„ط© ط­طھظ‰ ط§ظ„ط¢ظ†."
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
              itemLabel: 'ط³ظ„ظپط©',
            }}
            columns={[
              { key: 'loanNo', header: 'ط±ظ‚ظ… ط§ظ„ط³ظ„ظپط©', cell: (row) => fallbackText(row.loanNo || row.id) },
              { key: 'employee', header: 'ط§ظ„ظ…ظˆط¸ظپ', cell: (row) => fallbackText(row.employeeName) },
              { key: 'loanType', header: 'ط§ظ„ظ†ظˆط¹', cell: (row) => loanTypeLabel(row.loanType) },
              { key: 'principalAmount', header: 'ظ‚ظٹظ…ط© ط§ظ„ط³ظ„ظپط©', cell: (row) => canViewSalaryAmounts ? money(row.principalAmount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.' },
              { key: 'remainingAmount', header: 'ط§ظ„ظ…طھط¨ظ‚ظٹ', cell: (row) => canViewSalaryAmounts ? money(row.remainingAmount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.' },
              { key: 'repaymentMode', header: 'ط·ط±ظٹظ‚ط© ط§ظ„ط³ط¯ط§ط¯', cell: (row) => repaymentModeLabel(row.repaymentMode) },
              { key: 'status', header: 'ط§ظ„ط­ط§ظ„ط©', cell: (row) => statusLabel(row.status) },
              { key: 'issueDate', header: 'طھط§ط±ظٹط® ط§ظ„ط³ظ„ظپط©', cell: (row) => fallbackText(row.issueDate) },
              {
                key: 'plan',
                header: 'ط®ط·ط© ط§ظ„ط³ط¯ط§ط¯',
                cell: (row) => {
                  const installments = Array.isArray(row.installments) ? row.installments as HrLoanInstallment[] : [];
                  if (!installments.length) return fallbackText(repaymentModeLabel(row.repaymentMode));
                  return (
                    <details>
                      <summary>{`ط¹ط¯ط¯ ط§ظ„ط£ظ‚ط³ط§ط·: ${installments.length}`}</summary>
                      <div className="table-wrap" style={{ marginTop: 8 }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>ط±ظ‚ظ… ط§ظ„ظ‚ط³ط·</th>
                              <th>ط´ظ‡ط± ط§ظ„ط§ط³طھط­ظ‚ط§ظ‚</th>
                              <th>ظ‚ظٹظ…ط© ط§ظ„ظ‚ط³ط·</th>
                              <th>ط§ظ„ط­ط§ظ„ط©</th>
                              <th>طھط§ط±ظٹط® ط§ظ„ط®طµظ…</th>
                            </tr>
                          </thead>
                          <tbody>
                            {installments.map((item) => (
                              <tr key={String(item.id)}>
                                <td>{item.installmentNumber || 'â€”'}</td>
                                <td>{monthLabel(item.dueDate)}</td>
                                <td>{canViewSalaryAmounts ? money(item.amount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}</td>
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
                header: 'ط¥ط¬ط±ط§ط،ط§طھ',
                cell: (row) => {
                  const status = String(row.status || '').trim().toLowerCase();
                  const canApprove = canManageLoans && (!status || status === 'pending' || status === 'draft' || status === 'new');
                  const canDisburse = canManageLoans && status === 'approved';
                  const canRepay = canManageLoans && Number(row.remainingAmount || 0) > 0;
                  return (
                    <div className="actions compact-actions">
                      {canApprove ? <Button variant="secondary" onClick={() => { void mutations.approveLoan.mutateAsync(String(row.id)); }}>ط§ط¹طھظ…ط§ط¯</Button> : null}
                      {canDisburse ? <Button variant="secondary" onClick={() => { void mutations.disburseLoan.mutateAsync(String(row.id)); }}>طµط±ظپ</Button> : null}
                      {canRepay ? <Button variant="secondary" onClick={() => setSelectedLoanForRepayment(String(row.id))}>طھط³ط¬ظٹظ„ ط³ط¯ط§ط¯</Button> : null}
                    </div>
                  );
                },
              },
            ]}
          />

                    {selectedRepaymentLoan ? (
            <HrLoanRepaymentForm
              selectedLoanLabel={fallbackText(selectedRepaymentLoan.loanNo || selectedRepaymentLoan.id)}
              remainingAmountText={canViewSalaryAmounts ? money(selectedRepaymentLoan.remainingAmount) : 'ظ„ط§ طھظ…ظ„ظƒ طµظ„ط§ط­ظٹط© ط¹ط±ط¶ ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ.'}
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


