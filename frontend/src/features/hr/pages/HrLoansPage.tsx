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

type LoanQuickFilter = 'active' | 'due' | 'pending' | 'closed' | 'all';

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function hasDueInstallment(row: HrLoan) {
  return Number(row.dueInstallmentsAmount || 0) > 0 || Number(row.dueInstallmentsCount || 0) > 0;
}

function isActiveLoan(row: HrLoan) {
  const status = normalize(row.status);
  return Number(row.remainingAmount || 0) > 0 && status !== 'cancelled' && status !== 'repaid' && status !== 'paid';
}

function matchesQuickFilter(row: HrLoan, filter: LoanQuickFilter) {
  const status = normalize(row.status);
  if (filter === 'all') return true;
  if (filter === 'active') return isActiveLoan(row);
  if (filter === 'due') return hasDueInstallment(row);
  if (filter === 'pending') return !status || status === 'pending' || status === 'draft' || status === 'new' || status === 'approved';
  if (filter === 'closed') return status === 'repaid' || status === 'paid' || status === 'cancelled' || Number(row.remainingAmount || 0) <= 0;
  return true;
}

export function HrLoansPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const canViewLoans = useHasAnyPermission('hrLoans');
  const canManageLoans = useHasAnyPermission('hrLoans');
  const canViewSalaryAmounts = useHasAnyPermission(['hrLoans', 'hrSalaryView', 'hrSalaryManage', 'hrPayrollManage', 'hrPayrollApprove']);

  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<LoanQuickFilter>('active');
  const [showCreate, setShowCreate] = useState(false);
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
  const visibleLoans = useMemo(() => loans.filter((row) => matchesQuickFilter(row, quickFilter)), [loans, quickFilter]);
  const totalItems = quickFilter === 'all' ? Number(workspace.loans.data?.summary?.totalItems || loans.length || 0) : visibleLoans.length;

  const selectedRepaymentLoan = useMemo(
    () => loans.find((row) => String(row.id) === String(selectedLoanForRepayment)),
    [loans, selectedLoanForRepayment],
  );

  const summary = useMemo(() => {
    const active = loans.filter(isActiveLoan).length;
    const due = loans.filter(hasDueInstallment).length;
    const pending = loans.filter((row) => matchesQuickFilter(row, 'pending')).length;
    const closed = loans.filter((row) => matchesQuickFilter(row, 'closed')).length;
    const dueAmount = loans.reduce((sum, row) => sum + Number(row.dueInstallmentsAmount || 0), 0);
    const remainingAmount = loans.reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0);
    return { total: loans.length, active, due, pending, closed, dueAmount, remainingAmount, visible: visibleLoans.length };
  }, [loans, visibleLoans.length]);

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
      setShowCreate(false);
      setQuickFilter('active');
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
        description="سجل السلفة، راجع الأقساط المستحقة، ثم تأكد من ظهورها في المرتبات قبل الاعتماد."
        actions={(
          <div className="compact-actions">
            <Button type="button" onClick={() => setShowCreate((current) => !current)}>{showCreate ? 'إغلاق نموذج السلفة' : 'سلفة جديدة'}</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
          </div>
        )}
      />

      {!canViewLoans ? (
        <Card title="الوصول للسلف والخصومات">
          <p className="muted" style={{ margin: 0 }}>ليس لديك صلاحية للوصول إلى هذه الصفحة.</p>
          <p className="muted" style={{ marginBottom: 0 }}>تواصل مع مسؤول النظام لتحديث الصلاحيات.</p>
        </Card>
      ) : (
        <>
      <Card title="تسلسل السلف والخصومات" description="استخدم الصفحة بهذا الترتيب حتى لا تظهر خصومات مفاجئة في المرتبات.">
        <div className="form-grid">
          <div className="field"><strong>1. سجل السلفة</strong><span className="muted">اختر الموظف والمبلغ وخطة السداد.</span></div>
          <div className="field"><strong>2. اعتمد أو اصرف</strong><span className="muted">راجع السلف الجديدة قبل صرفها فعليًا.</span></div>
          <div className="field"><strong>3. راجع أقساط الشهر</strong><span className="muted">الأقساط المستحقة تنتقل للمراجعة في المرتبات.</span></div>
          <div className="field"><strong>4. تابع السداد</strong><span className="muted">سجل السداد اليدوي أو راجع الخصم من المرتب.</span></div>
        </div>
      </Card>

      {showCreate ? (
        <Card title="سلفة جديدة" description="اختر طريقة السداد قبل الحفظ. خطة السداد لا تُخصم من المرتب إلا داخل مسير المرتبات.">
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
      ) : null}

      <Card title="ملخص السلف" description="اضغط على الكروت لتصفية القائمة مباشرة.">
        <div className="stats-grid">
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('all'); setPage(1); }} style={{ textAlign: 'right' }}><span>إجمالي السلف</span><strong>{summary.total}</strong></button>
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('active'); setPage(1); }} style={{ textAlign: 'right' }}><span>سلف نشطة</span><strong>{summary.active}</strong></button>
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('due'); setPage(1); }} style={{ textAlign: 'right' }}><span>أقساط مستحقة</span><strong>{summary.due}</strong></button>
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('pending'); setPage(1); }} style={{ textAlign: 'right' }}><span>تحتاج اعتماد/صرف</span><strong>{summary.pending}</strong></button>
          <button className="stat-card" type="button" onClick={() => { setQuickFilter('closed'); setPage(1); }} style={{ textAlign: 'right' }}><span>مغلقة/مسددة</span><strong>{summary.closed}</strong></button>
          <div className="stat-card"><span>إجمالي مستحق هذا الشهر</span><strong>{canViewSalaryAmounts ? money(summary.dueAmount) : '—'}</strong></div>
          <div className="stat-card"><span>إجمالي المتبقي</span><strong>{canViewSalaryAmounts ? money(summary.remainingAmount) : '—'}</strong></div>
          <div className="stat-card"><span>ظاهر حاليًا</span><strong>{summary.visible}</strong></div>
        </div>
      </Card>

      <Card title="قائمة السلف" description="السلف النشطة تظهر افتراضيًا. استخدم الفلاتر لمراجعة المستحق أو المغلق.">
        <div className="compact-actions" style={{ marginBottom: 12 }}>
          <Button type="button" variant={quickFilter === 'active' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('active'); setPage(1); }}>نشطة</Button>
          <Button type="button" variant={quickFilter === 'due' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('due'); setPage(1); }}>أقساط مستحقة</Button>
          <Button type="button" variant={quickFilter === 'pending' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('pending'); setPage(1); }}>تحتاج اعتماد/صرف</Button>
          <Button type="button" variant={quickFilter === 'closed' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('closed'); setPage(1); }}>مغلقة/مسددة</Button>
          <Button type="button" variant={quickFilter === 'all' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('all'); setPage(1); }}>كل السلف</Button>
        </div>

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
          isEmpty={!visibleLoans.length}
          loadingText="جاري تحميل السلف..."
          errorTitle="تعذر تحميل بيانات السلف"
          emptyTitle={search || quickFilter !== 'all' ? 'لا توجد سلف مطابقة للفلاتر الحالية.' : 'لا توجد سلف مسجلة حتى الآن.'}
          emptyHint={search || quickFilter !== 'all' ? 'جرّب تغيير الفلتر أو البحث.' : 'ابدأ بتسجيل سلفة جديدة من زر أعلى الصفحة.'}
        >
          <DataTable
            rows={visibleLoans}
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
              { key: 'dueInstallmentsAmount', header: 'مستحق هذا الشهر', cell: (row) => canViewSalaryAmounts ? money(row.dueInstallmentsAmount || 0) : 'لا تملك صلاحية عرض هذه البيانات.' },
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
                  const status = normalize(row.status);
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

      <Card title="ملاحظة تشغيلية">
        <p className="muted" style={{ margin: 0 }}>الأقساط المستحقة تظهر في مراجعة المرتبات للشهر المحدد. لا تعتمد المرتبات قبل مراجعة السلف النشطة والمستحقة.</p>
      </Card>
      </>
      )}
    </div>
  );
}
