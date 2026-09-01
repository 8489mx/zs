import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { DialogShell } from '@/shared/components/dialog-shell';
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
  return Number(row.remainingAmount || 0) > 0 && status !== 'cancelled' && status !== 'repaid' && status !== 'rejected';
}

function matchesQuickFilter(row: HrLoan, filter: LoanQuickFilter) {
  const status = normalize(row.status);
  if (filter === 'all') return true;
  if (filter === 'active') return isActiveLoan(row);
  if (filter === 'due') return hasDueInstallment(row);
  if (filter === 'pending') return status === 'pending' || status === 'draft' || status === 'new' || status === 'approved';
  if (filter === 'closed') return status === 'repaid' || status === 'cancelled' || status === 'rejected' || (Number(row.remainingAmount || 0) <= 0 && status !== 'draft');
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
  const [selectedLoanForPlan, setSelectedLoanForPlan] = useState<HrLoan | null>(null);
  const [repaymentDraft, setRepaymentDraft] = useState<RepaymentDraft>({ amount: '', method: 'manual_cash', notes: '' });
  const [repaymentError, setRepaymentError] = useState('');

  const [periodMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

  const workspace = useHrWorkspace({ search, page, pageSize, periodMonth });
  const employees = useMemo(() => workspace.employees.data?.employees || [], [workspace.employees.data?.employees]);
  const loans = useMemo(() => (workspace.loans.data?.loans || []) as HrLoan[], [workspace.loans.data?.loans]);
  const visibleLoans = useMemo(() => loans.filter((row) => matchesQuickFilter(row, quickFilter)), [loans, quickFilter]);
  const totalItems = quickFilter === 'all' ? Number(workspace.loans.data?.summary?.totalItems || loans.length || 0) : visibleLoans.length;

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
      return { principalAmount: 0, installmentCount, installmentAmount: 0, totalInstallments: 0, startMonthLabel: '—', endMonthLabel: '—', firstDueDate: '' };
    }

    const baseInstallment = Math.round(principalAmount / installmentCount);
    const totalBeforeLast = baseInstallment * Math.max(0, installmentCount - 1);
    const lastInstallment = principalAmount - totalBeforeLast;
    const totalInstallments = totalBeforeLast + lastInstallment;
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

    if (!employeeId) { setFormError('اختيار الموظف مطلوب.'); return; }
    if (!(principalAmount > 0)) { setFormError('قيمة السلفة مطلوبة ويجب أن تكون أكبر من صفر.'); return; }
    if (!issueDate) { setFormError('تاريخ السلفة مطلوب.'); return; }
    if (isInstallments && rawInstallmentCount <= 0) { setFormError('عدد الدفعات مطلوب ويجب أن يكون أكبر من صفر.'); return; }
    if (isInstallments && installmentCount > 60) { setFormError('عدد الدفعات يجب ألا يتجاوز 60 دفعة.'); return; }

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
    if (!selectedLoanForPlan?.id) return;
    const amount = parsePositiveNumber(repaymentDraft.amount);
    const remainingAmount = Number(selectedLoanForPlan.remainingAmount || 0);
    if (!(amount > 0)) { setRepaymentError('قيمة السداد مطلوبة.'); return; }
    if (!(remainingAmount > 0)) { setRepaymentError('لا يوجد مبلغ متبقٍ على هذه السلفة.'); return; }
    if (amount > remainingAmount) { setRepaymentError(`قيمة السداد لا يمكن أن تكون أكبر من المتبقي (${money(remainingAmount)}).`); return; }
    const repaymentMethod = String(repaymentDraft.method || 'manual_cash').trim();
    try {
      await mutations.repayLoan.mutateAsync({ id: String(selectedLoanForPlan.id), payload: { amount, repaymentMethod: repaymentMethod === 'salary_deduction' ? 'salary_deduction' : 'manual_cash', note: String(repaymentDraft.notes || '').trim() || undefined } });
      setRepaymentDraft({ amount: '', method: 'manual_cash', notes: '' });
      setSelectedLoanForPlan(null);
    } catch (error) {
      setRepaymentError(getErrorMessage(error, 'تعذر تسجيل السداد.'));
    }
  }

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '20px' }}>
        <PageHeader
          title="السلف والخصومات"
          description="إدارة سلف الموظفين، خطط الأقساط الشهرية، والمتابعة المباشرة قبل مسير الرواتب."
          actions={
            <div className="actions compact-actions">
              <Button type="button" onClick={() => setShowCreate((current) => !current)}>
                {showCreate ? 'إغلاق النموذج' : '+ سلفة جديدة'}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>المرتبات</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/employees')}>الموظفون</Button>
            </div>
          }
        />
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

          {!canViewLoans ? (
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#64748b' }}>
              <p style={{ margin: 0 }}>ليس لديك صلاحية للوصول إلى بيانات السلف والخصومات.</p>
            </div>
          ) : (
            <>
              {showCreate ? (
                <div style={{ marginBottom: '16px' }}>
                  <HrLoanCreateForm loanDraft={loanDraft} employees={employees as HrEmployee[]} canManageLoans={canManageLoans} formError={formError} planPreview={planPreview} isPending={mutations.saveLoan.isPending} onChange={(patch) => setLoanDraft((current) => ({ ...current, ...patch }))} onSubmit={() => { void handleCreateLoan(); }} />
                </div>
              ) : null}

              {/* Compact Single-Row KPI Summary Bar */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>ملخص السلف والخصومات</span>
                  <span style={{ fontSize: '0.725rem', color: '#64748b' }}>اضغط على أي مؤشر لتصفية القائمة فوراً</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '8px' }}>
                  {[
                    { label: 'إجمالي السلف', value: summary.total, onClick: () => { setQuickFilter('all'); setPage(1); }, isAlert: false, active: quickFilter === 'all' },
                    { label: 'سلف نشطة', value: summary.active, onClick: () => { setQuickFilter('active'); setPage(1); }, isAlert: false, active: quickFilter === 'active' },
                    { label: 'أقساط مستحقة', value: summary.due, onClick: () => { setQuickFilter('due'); setPage(1); }, isAlert: summary.due > 0, active: quickFilter === 'due' },
                    { label: 'تحتاج اعتماد/صرف', value: summary.pending, onClick: () => { setQuickFilter('pending'); setPage(1); }, isAlert: summary.pending > 0, active: quickFilter === 'pending' },
                    { label: 'مغلقة/مسددة', value: summary.closed, onClick: () => { setQuickFilter('closed'); setPage(1); }, isAlert: false, active: quickFilter === 'closed' },
                    { label: 'مستحق الشهر', value: canViewSalaryAmounts ? money(summary.dueAmount) : '—', onClick: () => {}, isAlert: false, active: false },
                    { label: 'إجمالي المتبقي', value: canViewSalaryAmounts ? money(summary.remainingAmount) : '—', onClick: () => {}, isAlert: false, active: false },
                    { label: 'ظاهر حالياً', value: summary.visible, onClick: () => {}, isAlert: false, active: false },
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      onClick={stat.onClick}
                      style={{
                        background: stat.active ? '#eff6ff' : '#ffffff',
                        border: `1px solid ${stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0'}`,
                        borderRadius: '6px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        minWidth: 0,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0'; }}
                    >
                      <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.label}>
                        {stat.label}
                      </span>
                      <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : stat.active ? '#1d4ed8' : '#0f172a', lineHeight: 1.2 }}>
                        {stat.value}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Integrated Toolbar - Single Row */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="بحث باسم الموظف أو رقم السلفة..."
                  style={{ width: '220px', minWidth: '170px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
                />

                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button type="button" variant={quickFilter === 'active' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('active'); setPage(1); }} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>نشطة</Button>
                  <Button type="button" variant={quickFilter === 'due' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('due'); setPage(1); }} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>أقساط مستحقة</Button>
                  <Button type="button" variant={quickFilter === 'pending' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('pending'); setPage(1); }} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>تحتاج اعتماد/صرف</Button>
                  <Button type="button" variant={quickFilter === 'closed' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('closed'); setPage(1); }} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>مغلقة/مسددة</Button>
                  <Button type="button" variant={quickFilter === 'all' ? 'primary' : 'secondary'} onClick={() => { setQuickFilter('all'); setPage(1); }} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>كل السلف</Button>
                </div>
              </div>

              <QueryFeedback isLoading={workspace.loans.isLoading} isError={workspace.loans.isError} error={workspace.loans.error} isEmpty={!visibleLoans.length} loadingText="جاري تحميل السلف..." errorTitle="تعذر تحميل بيانات السلف" emptyTitle={search || quickFilter !== 'all' ? 'لا توجد سلف مطابقة للفلاتر الحالية.' : 'لا توجد سلف مسجلة حتى الآن.'} emptyHint={search || quickFilter !== 'all' ? 'جرّب تغيير الفلتر أو البحث.' : 'ابدأ بتسجيل سلفة جديدة من زر أعلى الصفحة.'}>
                <DataTable
                  rows={visibleLoans}
                  rowKey={(row) => String(row.id)}
                  density="compact"
                  pagination={{ page, pageSize, totalItems, onPageChange: setPage, onPageSizeChange: (next) => { setPageSize(next); setPage(1); }, itemLabel: 'سلفة' }}
                  columns={[
                    { key: 'loanNo', header: 'رقم السلفة', cell: (row) => fallbackText(row.loanNo || row.id) },
                    { key: 'employee', header: 'الموظف', cell: (row) => fallbackText(row.employeeName) },
                    { key: 'loanType', header: 'النوع', cell: (row) => loanTypeLabel(row.loanType) },
                    { key: 'principalAmount', header: 'قيمة السلفة', cell: (row) => canViewSalaryAmounts ? money(row.principalAmount) : '—' },
                    { key: 'remainingAmount', header: 'المتبقي', cell: (row) => canViewSalaryAmounts ? money(row.remainingAmount) : '—' },
                    { key: 'dueInstallmentsAmount', header: 'مستحق الشهر', cell: (row) => canViewSalaryAmounts ? money(row.dueInstallmentsAmount || 0) : '—' },
                    { key: 'repaymentMode', header: 'طريقة السداد', cell: (row) => repaymentModeLabel(row.repaymentMode) },
                    { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
                    { key: 'issueDate', header: 'تاريخ السلفة', cell: (row) => fallbackText(row.issueDate) },
                    {
                      key: 'plan',
                      header: 'خطة السداد',
                      cell: (row) => {
                        return <Button variant="secondary" onClick={() => setSelectedLoanForPlan(row)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>التفاصيل والسداد</Button>;
                      },
                    },
                    {
                      key: 'actions',
                      header: 'إجراءات',
                      cell: (row) => {
                        const status = normalize(row.status);
                        const canApprove = canManageLoans && (!status || status === 'pending' || status === 'draft' || status === 'new');
                        const canDisburse = canManageLoans && status === 'approved';
                        return <div className="actions compact-actions">{canApprove ? <Button variant="secondary" onClick={() => { void mutations.approveLoan.mutateAsync(String(row.id)); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>اعتماد</Button> : null}{canDisburse ? <Button variant="secondary" onClick={() => { void mutations.disburseLoan.mutateAsync(String(row.id)); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>صرف</Button> : null}</div>;
                      },
                    },
                  ]}
                />

                {selectedLoanForPlan ? (
                  <DialogShell open={true} onClose={() => setSelectedLoanForPlan(null)} width="850px">
                    <div style={{ padding: '24px' }}>
                      <h3 style={{ marginBottom: '24px', fontSize: '1.25rem' }}>
                        السلفة رقم {fallbackText(selectedLoanForPlan.loanNo || selectedLoanForPlan.id)} - {fallbackText(selectedLoanForPlan.employeeName)}
                      </h3>

                      {/* Section 1: Repayment Form (if applicable) */}
                      {(canManageLoans && Number(selectedLoanForPlan.remainingAmount || 0) > 0) ? (
                        <div style={{ marginBottom: '32px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ marginBottom: '8px', fontSize: '0.95rem' }}>تسجيل سداد يدوي</h4>
                          <HrLoanRepaymentForm selectedLoanLabel={fallbackText(selectedLoanForPlan.loanNo || selectedLoanForPlan.id)} remainingAmountText={canViewSalaryAmounts ? money(selectedLoanForPlan.remainingAmount) : '—'} repaymentDraft={repaymentDraft} repaymentError={repaymentError} isPending={mutations.repayLoan.isPending} onChange={(patch) => setRepaymentDraft((current) => ({ ...current, ...patch }))} onSubmit={() => { void handleRepay(); }} onCancel={() => { setRepaymentDraft({ amount: '', method: 'manual_cash', notes: '' }); setSelectedLoanForPlan(null); }} />
                        </div>
                      ) : null}

                      {/* Section 2: Installments Table */}
                      <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ marginBottom: '16px', fontSize: '0.95rem' }}>جدول الأقساط</h4>
                        {Array.isArray(selectedLoanForPlan.installments) && selectedLoanForPlan.installments.length ? (
                          <div className="table-wrap">
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
                                {(selectedLoanForPlan.installments as HrLoanInstallment[]).map((item) => (
                                  <tr key={String(item.id)}>
                                    <td>{item.installmentNumber || '—'}</td>
                                    <td>{monthLabel(item.dueDate)}</td>
                                    <td>{canViewSalaryAmounts ? money(item.amount) : '—'}</td>
                                    <td>{installmentStatusLabel(item.status)}</td>
                                    <td>{fallbackText(item.paidAt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>طريقة السداد لهذه السلفة: {repaymentModeLabel(selectedLoanForPlan.repaymentMode)} (لا توجد خطة أقساط)</p>
                        )}
                      </div>

                      <div className="actions" style={{ marginTop: '16px', justifyContent: 'flex-end' }}>
                        <Button variant="secondary" onClick={() => setSelectedLoanForPlan(null)}>إغلاق</Button>
                      </div>
                    </div>
                  </DialogShell>
                ) : null}
              </QueryFeedback>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

