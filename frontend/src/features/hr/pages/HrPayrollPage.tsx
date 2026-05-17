import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee, HrPayrollRun, HrPayrollRunItem } from '@/types/domain';
import { getErrorMessage } from '@/lib/errors';
import { useHrMutations, useHrPayrollRun, useHrWorkspace } from '@/features/hr/hooks/useHr';
import { HrPayrollTopSections } from '@/features/hr/pages/payroll/HrPayrollTopSections';
import { HrPayrollOperationalNote, HrPayrollWorkflowCard } from '@/features/hr/pages/payroll/HrPayrollStaticCards';
import {
  employeeMatches,
  itemNeedsReview,
  money,
  normalize,
  reviewAttendanceText,
  reviewFlagText,
  reviewLeavesText,
  statusLabel,
  text,
  type PayrollReviewStatus,
} from '@/features/hr/pages/payroll/hr-payroll.helpers';

interface PayrollDraft {
  periodMonth: string;
  notes: string;
}

const initialDraft: PayrollDraft = {
  periodMonth: '',
  notes: '',
};

export function HrPayrollPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();
  const canViewPayroll = useHasAnyPermission(['hrPayrollView', 'hrPayrollManage', 'hrPayrollApprove']);
  const canManagePayroll = useHasAnyPermission(['hrPayrollManage', 'hrPayrollApprove']);
  const canApprovePayroll = useHasAnyPermission('hrPayrollApprove');
  const canViewSalaryAmounts = useHasAnyPermission(['hrSalaryView', 'hrSalaryManage', 'hrPayrollManage', 'hrPayrollApprove']);

  const now = new Date();
  const initialMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [monthFilter, setMonthFilter] = useState(initialMonth);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<PayrollReviewStatus>('all');
  const [draft, setDraft] = useState<PayrollDraft>(initialDraft);
  const [formError, setFormError] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');

  const workspace = useHrWorkspace({ page, pageSize, month: monthFilter });
  const payrollRunDetails = useHrPayrollRun(selectedRunId || undefined);

  const runs = useMemo(() => (workspace.payrollRuns.data?.runs || []) as HrPayrollRun[], [workspace.payrollRuns.data?.runs]);
  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const employeesMap = useMemo(() => new Map(employees.map((employee) => [String(employee.id), employee])), [employees]);

  const totalItems = Number(workspace.payrollRuns.data?.summary?.totalItems || runs.length || 0);
  const selectedRunFromList = useMemo(() => runs.find((row) => String(row.id) === String(selectedRunId)), [runs, selectedRunId]);
  const selectedRun = (payrollRunDetails.data?.run || selectedRunFromList) as HrPayrollRun | undefined;
  const runItems = useMemo(() => (selectedRun?.items || []) as HrPayrollRunItem[], [selectedRun?.items]);

  const departmentOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const employee of employees) {
      const key = normalize(employee.departmentName);
      if (!key) continue;
      set.set(key, String(employee.departmentName || '').trim());
    }
    return Array.from(set.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [employees]);

  const filteredRunItems = useMemo(() => {
    const searchTerm = normalize(search);
    return runItems.filter((row) => {
      if (!employeeMatches(row, employeesMap, searchTerm, departmentFilter)) return false;
      const rowStatus = normalize(row.status);
      const needsReview = itemNeedsReview(row);
      if (reviewStatusFilter === 'all') return true;
      if (reviewStatusFilter === 'needs_review') return needsReview;
      if (reviewStatusFilter === 'ready') return rowStatus === 'reviewed' || (rowStatus === 'draft' && !needsReview);
      if (reviewStatusFilter === 'approved') return rowStatus === 'approved';
      if (reviewStatusFilter === 'paid') return rowStatus === 'paid';
      return true;
    });
  }, [runItems, search, employeesMap, departmentFilter, reviewStatusFilter]);

  const summary = useMemo(() => {
    const rows = filteredRunItems;
    const totalEmployees = rows.length;
    const totalBaseSalary = rows.reduce((sum, row) => sum + Number(row.baseSalary || 0), 0);
    const totalDeductions = rows.reduce((sum, row) => sum + Number(row.deductionAmount || 0), 0);
    const totalLoanDeduction = rows.reduce((sum, row) => sum + Number(row.loanDeductionAmount || 0), 0);
    const totalNet = rows.reduce((sum, row) => sum + Number(row.netPay || 0), 0);
    const needsReview = rows.filter(itemNeedsReview).length;
    return { totalEmployees, totalBaseSalary, totalDeductions, totalLoanDeduction, totalNet, needsReview };
  }, [filteredRunItems]);

  const dueLoanInstallmentRows = useMemo(
    () => filteredRunItems.filter((row) => Number(row.loanDeductionAmount || 0) > 0),
    [filteredRunItems],
  );

  const runStatusOptions = useMemo(() => {
    const labels = new Map<string, string>();
    for (const row of runs) {
      const value = normalize(row.status);
      if (!value) continue;
      labels.set(value, statusLabel(value));
    }
    return Array.from(labels.entries()).map(([value, label]) => ({ value, label }));
  }, [runs]);

  const [runStatusFilter, setRunStatusFilter] = useState('all');
  const filteredRuns = useMemo(() => {
    if (runStatusFilter === 'all') return runs;
    return runs.filter((row) => normalize(row.status) === runStatusFilter);
  }, [runs, runStatusFilter]);

  const hasCreatePayrollRun = Boolean(mutations.createPayrollRun);
  const selectedRunStatus = normalize(selectedRun?.status);
  const runIsFinal = selectedRunStatus === 'approved' || selectedRunStatus === 'paid';
  const payrollChecklist = useMemo(() => {
    const hasRun = Boolean(selectedRun);
    const hasItems = filteredRunItems.length > 0;
    return [
      { key: 'run', title: 'اختيار كشف المرتبات', status: hasRun ? `تم اختيار كشف ${text(selectedRun?.periodMonth)}` : 'اختر كشفًا من جدول كشوف المرتبات أولًا.', ok: hasRun, action: 'اختيار كشف', onClick: undefined },
      { key: 'items', title: 'وجود موظفين داخل الكشف', status: hasItems ? `${filteredRunItems.length} موظف ظاهر حسب الفلاتر الحالية.` : 'لا توجد بنود موظفين ظاهرة. راجع الفلاتر أو أنشئ المسير.', ok: hasItems, action: 'مسح فلاتر المراجعة', onClick: () => { setSearch(''); setDepartmentFilter('all'); setReviewStatusFilter('all'); } },
      { key: 'review', title: 'مراجعة الحضور والإجازات', status: summary.needsReview > 0 ? `${summary.needsReview} موظف يحتاج مراجعة قبل الاعتماد.` : 'لا توجد تنبيهات مراجعة ظاهرة في الفلتر الحالي.', ok: summary.needsReview === 0, action: summary.needsReview > 0 ? 'عرض المحتاج مراجعة' : 'فتح الحضور', onClick: summary.needsReview > 0 ? () => setReviewStatusFilter('needs_review') : () => navigate('/hr/attendance') },
      { key: 'loans', title: 'أقساط السلف لهذا الشهر', status: dueLoanInstallmentRows.length > 0 ? `${dueLoanInstallmentRows.length} موظف لديهم خصم سلفة/قسط داخل الكشف.` : 'لا توجد أقساط سلف ظاهرة داخل الكشف الحالي.', ok: true, action: 'فتح السلف', onClick: () => navigate('/hr/loans') },
      { key: 'status', title: 'حالة الاعتماد', status: runIsFinal ? 'الكشف معتمد/مصروف. أي تعديل يحتاج مراجعة إدارية.' : 'الكشف ما زال قابلًا للمراجعة قبل الاعتماد النهائي.', ok: runIsFinal || summary.needsReview === 0, action: 'فتح تفاصيل الكشف', onClick: undefined },
    ];
  }, [dueLoanInstallmentRows.length, filteredRunItems.length, navigate, runIsFinal, selectedRun, summary.needsReview]);

  async function handleCreateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const periodMonth = String(draft.periodMonth || '').trim();
    if (!periodMonth) { setFormError('شهر مسير المرتبات مطلوب.'); return; }
    try {
      await mutations.createPayrollRun.mutateAsync({ periodMonth, notes: String(draft.notes || '').trim() || undefined });
      setDraft(initialDraft);
    } catch (error) {
      setFormError(getErrorMessage(error, 'تعذر تجهيز مسير المرتبات.'));
    }
  }

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="المرتبات"
        description="مسار شهري واضح: جهّز المسير، راجع الحضور والإجازات والسلف، ثم اعتمد عند اكتمال المراجعة."
        actions={
          <div className="actions compact-actions">
            {hasCreatePayrollRun && canManagePayroll ? <Button variant="secondary" onClick={() => setDraft((current) => ({ ...current, periodMonth: current.periodMonth || monthFilter }))}>إنشاء مسير الشهر</Button> : null}
            <Button variant="secondary" onClick={() => navigate('/hr/attendance')}>مراجعة الحضور</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
          </div>
        }
      />

      {!canViewPayroll ? (
        <Card title="الوصول للمرتبات">
          <p className="muted" style={{ margin: 0 }}>ليس لديك صلاحية للوصول إلى هذه الصفحة.</p>
          <p className="muted" style={{ marginBottom: 0 }}>تواصل مع مسؤول النظام لتحديث الصلاحيات.</p>
        </Card>
      ) : (
        <>
          <HrPayrollWorkflowCard />
          <HrPayrollTopSections
            monthFilter={monthFilter}
            search={search}
            departmentFilter={departmentFilter}
            reviewStatusFilter={reviewStatusFilter}
            runStatusFilter={runStatusFilter}
            departmentOptions={departmentOptions}
            runStatusOptions={runStatusOptions}
            summary={summary}
            canViewSalaryAmounts={canViewSalaryAmounts}
            dueLoanInstallmentRows={dueLoanInstallmentRows}
            draft={draft}
            formError={formError}
            canManagePayroll={canManagePayroll}
            hasCreatePayrollRun={hasCreatePayrollRun}
            isCreatePending={mutations.createPayrollRun.isPending}
            onMonthFilterChange={(value) => { setMonthFilter(value); setPage(1); }}
            onSearchChange={setSearch}
            onDepartmentFilterChange={setDepartmentFilter}
            onReviewStatusFilterChange={setReviewStatusFilter}
            onRunStatusFilterChange={setRunStatusFilter}
            onDraftChange={setDraft}
            onCreateRun={(event) => { void handleCreateRun(event); }}
          />

          <Card title="مراجعة قبل الاعتماد" description="قائمة مختصرة تمنع نسيان الحضور أو السلف أو البنود التي تحتاج مراجعة قبل اعتماد المرتبات.">
            <div className="form-grid">
              {payrollChecklist.map((item) => (
                <div key={item.key} className="field" style={{ alignItems: 'flex-start' }}>
                  <strong>{item.ok ? '✓' : '•'} {item.title}</strong>
                  <span className="muted">{item.status}</span>
                  {item.onClick ? <Button type="button" variant="secondary" onClick={item.onClick}>{item.action}</Button> : null}
                </div>
              ))}
            </div>
          </Card>

          <Card title="كشوف المرتبات الشهرية">
            <QueryFeedback isLoading={workspace.payrollRuns.isLoading} isError={workspace.payrollRuns.isError} error={workspace.payrollRuns.error} isEmpty={!filteredRuns.length} loadingText="جارٍ تحميل كشوف المرتبات..." errorTitle="تعذر تحميل كشوف المرتبات" emptyTitle="لا توجد بيانات مرتبات لهذه الفترة.">
              <DataTable
                rows={filteredRuns}
                rowKey={(row) => String(row.id)}
                onRowClick={(row) => setSelectedRunId(String(row.id))}
                density="compact"
                pagination={{ page, pageSize, totalItems, onPageChange: setPage, onPageSizeChange: (next) => { setPageSize(next); setPage(1); }, itemLabel: 'كشف' }}
                columns={[
                  { key: 'periodMonth', header: 'الشهر', cell: (row) => text(row.periodMonth) },
                  { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
                  { key: 'itemCount', header: 'عدد الموظفين', cell: (row) => text(row.itemCount || (row.items?.length ?? 0)) },
                  { key: 'totalBaseSalary', header: 'إجمالي الأساسي', cell: (row) => canViewSalaryAmounts ? money(row.totalBaseSalary) : 'لا تملك صلاحية عرض هذه البيانات.' },
                  { key: 'totalDeductionAmount', header: 'إجمالي الخصومات', cell: (row) => canViewSalaryAmounts ? money(row.totalDeductionAmount) : 'لا تملك صلاحية عرض هذه البيانات.' },
                  { key: 'totalLoanDeductionAmount', header: 'إجمالي السلف/الأقساط', cell: (row) => canViewSalaryAmounts ? money(row.totalLoanDeductionAmount) : 'لا تملك صلاحية عرض هذه البيانات.' },
                  { key: 'totalNetPay', header: 'صافي المرتبات', cell: (row) => canViewSalaryAmounts ? money(row.totalNetPay) : 'لا تملك صلاحية عرض هذه البيانات.' },
                  { key: 'createdAt', header: 'تاريخ الإنشاء', cell: (row) => text(row.createdAt) },
                  { key: 'actions', header: 'إجراء', cell: (row) => <div className="actions compact-actions">{canManagePayroll && mutations.recalculatePayrollRun ? <Button variant="secondary" onClick={() => { void mutations.recalculatePayrollRun.mutateAsync(String(row.id)); }}>مراجعة</Button> : null}{canManagePayroll && mutations.reviewPayrollRun ? <Button variant="secondary" onClick={() => { void mutations.reviewPayrollRun.mutateAsync(String(row.id)); }}>اعتماد</Button> : null}{canApprovePayroll && mutations.approvePayrollRun ? <Button variant="secondary" onClick={() => { void mutations.approvePayrollRun.mutateAsync(String(row.id)); }}>اعتماد نهائي</Button> : null}{canManagePayroll && mutations.cancelPayrollRun ? <Button variant="secondary" onClick={() => { void mutations.cancelPayrollRun.mutateAsync(String(row.id)); }}>إلغاء</Button> : null}</div> },
                ]}
              />
            </QueryFeedback>
          </Card>

          <Card title="تفاصيل ومراجعة المسير">
            {!selectedRunId ? <p className="muted">اختر كشفًا من الجدول لعرض تفاصيل الموظفين.</p> : (
              <QueryFeedback isLoading={payrollRunDetails.isLoading} isError={payrollRunDetails.isError} error={payrollRunDetails.error} isEmpty={false} loadingText="جارٍ تحميل تفاصيل المسير..." errorTitle="تعذر تحميل تفاصيل المسير">
                {!selectedRun ? <p className="muted">تفاصيل المسير غير متاحة من الواجهة الحالية.</p> : filteredRunItems.length ? (
                  <>
                    <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>الخصومات المقترحة للمراجعة فقط، ولا يتم تطبيقها تلقائيًا إلا بعد اعتماد المسؤول.</p>
                    <DataTable
                      rows={filteredRunItems}
                      rowKey={(row) => String(row.id)}
                      density="compact"
                      columns={[
                        { key: 'employeeNo', header: 'كود الموظف', cell: (row) => text(row.employeeNo) },
                        { key: 'employeeName', header: 'اسم الموظف', cell: (row) => text(row.employeeName) },
                        { key: 'compensationType', header: 'نوع الأجر', cell: (row) => normalize(row.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري' },
                        { key: 'department', header: 'القسم', cell: (row) => text(employeesMap.get(String(row.employeeId))?.departmentName) },
                        { key: 'hourlyRate', header: 'أجر الساعة', cell: (row) => normalize(row.compensationType) === 'hourly' ? money(row.hourlyRate || 0) : 'غير متاح' },
                        { key: 'expectedDailyHours', header: 'ساعات اليوم المتوقعة', cell: (row) => normalize(row.compensationType) === 'hourly' ? String(row.expectedDailyHours || 0) : 'غير متاح' },
                        { key: 'baseSalary', header: 'الراتب الأساسي', cell: (row) => canViewSalaryAmounts ? money(row.baseSalary) : 'لا تملك صلاحية عرض هذه البيانات.' },
                        { key: 'allowanceAmount', header: 'البدلات', cell: (row) => canViewSalaryAmounts ? money(row.allowanceAmount) : 'لا تملك صلاحية عرض هذه البيانات.' },
                        { key: 'deductionAmount', header: 'الخصومات', cell: (row) => canViewSalaryAmounts ? money(row.deductionAmount) : 'لا تملك صلاحية عرض هذه البيانات.' },
                        { key: 'loanDeductionAmount', header: 'السلف/الأقساط', cell: (row) => canViewSalaryAmounts ? money(row.loanDeductionAmount) : 'لا تملك صلاحية عرض هذه البيانات.' },
                        { key: 'unpaidLeave', header: 'إجازات غير مدفوعة / تنبيهات', cell: (row) => Number(row.unpaidLeaveDays || 0) > 0 ? `غير مدفوعة ${Number(row.unpaidLeaveDays || 0)} يوم` : reviewFlagText(row) },
                        { key: 'netPay', header: 'صافي الراتب', cell: (row) => canViewSalaryAmounts ? money(row.netPay) : 'لا تملك صلاحية عرض هذه البيانات.' },
                        { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
                        { key: 'reviewAttendance', header: 'مراجعة الحضور', cell: (row) => reviewAttendanceText(row) },
                        { key: 'reviewLeaves', header: 'مراجعة الإجازات', cell: (row) => reviewLeavesText(row) },
                        { key: 'suggestedDeduction', header: 'خصم مقترح', cell: (row) => canViewSalaryAmounts ? money(Number(row.suggestedAttendanceDeductionAmount || 0) + Number(row.suggestedLeaveDeductionAmount || 0)) : 'لا تملك صلاحية عرض هذه البيانات.' },
                        { key: 'details', header: 'عرض التفاصيل', cell: (row) => <details><summary>مراجعة</summary><div className="muted" style={{ marginTop: 8 }}><div>الراتب الأساسي: {canViewSalaryAmounts ? money(row.baseSalary) : 'لا تملك صلاحية عرض هذه البيانات.'}</div><div>نوع الأجر: {normalize(row.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري'}</div><div>أجر الساعة: {normalize(row.compensationType) === 'hourly' ? (canViewSalaryAmounts ? money(row.hourlyRate || 0) : 'لا تملك صلاحية عرض هذه البيانات.') : 'غير متاح'}</div><div>ساعات اليوم المتوقعة: {normalize(row.compensationType) === 'hourly' ? String(row.expectedDailyHours || 0) : 'غير متاح'}</div><div>الخصومات: {canViewSalaryAmounts ? money(row.deductionAmount) : 'لا تملك صلاحية عرض هذه البيانات.'}</div><div>السلف/الأقساط: {canViewSalaryAmounts ? money(row.loanDeductionAmount) : 'لا تملك صلاحية عرض هذه البيانات.'}</div><div>الإجازات غير المدفوعة: {Number(row.unpaidLeaveDays || 0)} يوم</div><div>ملاحظات المراجعة: {text(row.payrollReviewNotes)}</div><div>ملاحظات إضافية: {text(row.notes)}</div></div></details> },
                      ]}
                    />
                  </>
                ) : <p className="muted">لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية.</p>}
              </QueryFeedback>
            )}
          </Card>

          <HrPayrollOperationalNote />
        </>
      )}
    </div>
  );
}
