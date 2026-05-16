import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee, HrPayrollRun, HrPayrollRunItem } from '@/types/domain';
import { getErrorMessage } from '@/lib/errors';
import { useHrMutations, useHrPayrollRun, useHrWorkspace } from '@/features/hr/hooks/useHr';

interface PayrollDraft {
  periodMonth: string;
  notes: string;
}

const initialDraft: PayrollDraft = {
  periodMonth: '',
  notes: '',
};

type PayrollReviewStatus = 'all' | 'needs_review' | 'ready' | 'approved' | 'paid';

const reviewStatusOptions: Array<{ value: PayrollReviewStatus; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'needs_review', label: 'يحتاج مراجعة' },
  { value: 'ready', label: 'جاهز' },
  { value: 'approved', label: 'معتمد' },
  { value: 'paid', label: 'مدفوع' },
];

function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0.00 ج.م';
  return `${amount.toFixed(2)} ج.م`;
}

function text(value: unknown) {
  return String(value || '').trim() || '—';
}

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function statusLabel(value: unknown) {
  const status = normalize(value);
  if (status === 'draft') return 'مسودة / بانتظار المراجعة';
  if (status === 'reviewed') return 'جاهز';
  if (status === 'approved') return 'معتمد';
  if (status === 'paid') return 'مدفوع';
  if (status === 'cancelled' || status === 'canceled') return 'ملغي';
  return text(value);
}

function itemNeedsReview(row: HrPayrollRunItem) {
  return (
    Number(row.unpaidLeaveDays || 0) > 0
    || Number(row.loanDeductionAmount || 0) > 0
    || Number(row.deductionAmount || 0) > 0
    || Number(row.suggestedAttendanceDeductionAmount || 0) > 0
    || Number(row.suggestedLeaveDeductionAmount || 0) > 0
    || Number(row.attendanceAbsentDays || 0) > 0
    || Number(row.attendanceHalfDays || 0) > 0
    || Number(row.attendanceEarlyLeaveDays || 0) > 0
    || !Number.isFinite(Number(row.baseSalary || 0))
    || Number(row.baseSalary || 0) <= 0
  );
}

function employeeMatches(row: HrPayrollRunItem, employeesMap: Map<string, HrEmployee>, searchTerm: string, department: string) {
  const employee = employeesMap.get(String(row.employeeId));
  const departmentName = normalize(employee?.departmentName || '');
  const rowDepartment = normalize((row as { departmentName?: string }).departmentName || '');

  if (department !== 'all' && departmentName !== department && rowDepartment !== department) {
    return false;
  }

  if (!searchTerm) return true;

  const haystack = [
    row.employeeName,
    row.employeeNo,
    row.employeeId,
    employee?.firstName,
    employee?.lastName,
    employee?.displayName,
    employee?.employeeNo,
  ].map((value) => normalize(value)).join(' ');

  return haystack.includes(searchTerm);
}

function reviewAttendanceText(row: HrPayrollRunItem) {
  return `غياب ${Number(row.attendanceAbsentDays || 0)} / تأخير ${Number(row.attendanceLateDays || 0)} / نصف يوم ${Number(row.attendanceHalfDays || 0)} / انصراف مبكر ${Number(row.attendanceEarlyLeaveDays || 0)}`;
}

function reviewLeavesText(row: HrPayrollRunItem) {
  return `معتمدة ${Number(row.approvedLeaveDays || 0)} / بدون مرتب ${Number(row.unpaidLeaveDays || 0)}`;
}

function reviewFlagText(row: HrPayrollRunItem) {
  const flags: string[] = [];
  if (Number(row.unpaidLeaveDays || 0) > 0) flags.push('إجازة غير مدفوعة');
  if (Number(row.loanDeductionAmount || 0) > 0) flags.push('سلف/أقساط');
  if (Number(row.deductionAmount || 0) > 0) flags.push('خصومات');
  if (Number(row.attendanceAbsentDays || 0) > 0 || Number(row.attendanceHalfDays || 0) > 0 || Number(row.attendanceEarlyLeaveDays || 0) > 0) flags.push('استثناء حضور');
  if (Number(row.baseSalary || 0) <= 0) flags.push('راتب أساسي غير مكتمل');
  return flags.length ? flags.join('، ') : 'جاهز';
}

export function HrPayrollPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();

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

    return {
      totalEmployees,
      totalBaseSalary,
      totalDeductions,
      totalLoanDeduction,
      totalNet,
      needsReview,
    };
  }, [filteredRunItems]);

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

  async function handleCreateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    const periodMonth = String(draft.periodMonth || '').trim();
    if (!periodMonth) {
      setFormError('شهر المرتب مطلوب.');
      return;
    }

    try {
      await mutations.createPayrollRun.mutateAsync({
        periodMonth,
        notes: String(draft.notes || '').trim() || undefined,
      });
      setDraft(initialDraft);
    } catch (error) {
      setFormError(getErrorMessage(error, 'تعذر تجهيز كشف المرتب.'));
    }
  }

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="المرتبات"
        description="مساحة تشغيل شهرية لمراجعة كشوف المرتبات قبل الاعتماد والصرف."
        actions={
          <div className="actions compact-actions">
            {hasCreatePayrollRun ? (
              <Button variant="secondary" onClick={() => setDraft((current) => ({ ...current, periodMonth: current.periodMonth || monthFilter }))}>
                إنشاء مسير الشهر
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
          </div>
        }
      />

      <Card title="فترة التشغيل والفلاتر">
        <div className="form-grid">
          <label className="field">
            <span>الشهر</span>
            <input type="month" value={monthFilter} onChange={(event) => { setMonthFilter(event.target.value); setPage(1); }} />
          </label>
          <label className="field">
            <span>السنة</span>
            <input value={monthFilter.split('-')[0] || ''} readOnly />
          </label>
          <label className="field field-wide">
            <span>بحث الموظف (اسم/كود)</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اكتب اسم الموظف أو كوده" />
          </label>
          <label className="field">
            <span>القسم</span>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="all">الكل</option>
              {departmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>حالة المراجعة</span>
            <select value={reviewStatusFilter} onChange={(event) => setReviewStatusFilter(event.target.value as PayrollReviewStatus)}>
              {reviewStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>حالة المسير</span>
            <select value={runStatusFilter} onChange={(event) => setRunStatusFilter(event.target.value)}>
              <option value="all">الكل</option>
              {runStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <div className="stats-grid">
        <Card title="إجمالي الموظفين"><strong>{summary.totalEmployees || 0}</strong></Card>
        <Card title="إجمالي الرواتب الأساسية"><strong>{summary.totalEmployees ? money(summary.totalBaseSalary) : 'غير متاح'}</strong></Card>
        <Card title="إجمالي الخصومات"><strong>{summary.totalEmployees ? money(summary.totalDeductions) : 'غير متاح'}</strong></Card>
        <Card title="إجمالي السلف / الأقساط"><strong>{summary.totalEmployees ? money(summary.totalLoanDeduction) : 'غير متاح'}</strong></Card>
        <Card title="صافي المرتبات"><strong>{summary.totalEmployees ? money(summary.totalNet) : 'غير متاح'}</strong></Card>
        <Card title="يحتاج مراجعة"><strong>{summary.needsReview}</strong></Card>
      </div>

      <Card title="تنبيه مراجعة">
        <p className="muted" style={{ margin: 0 }}>
          حساب الضرائب والتأمينات يحتاج إعدادات ومراجعة محاسب قبل الاعتماد النهائي.
        </p>
      </Card>

      <Card title="تجهيز مسير المرتبات">
        {hasCreatePayrollRun ? (
          <form className="form-grid" onSubmit={(event) => { void handleCreateRun(event); }}>
            <label className="field">
              <span>شهر المرتب *</span>
              <input type="month" value={draft.periodMonth} onChange={(event) => setDraft((current) => ({ ...current, periodMonth: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>ملاحظات</span>
              <input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            {formError ? <div className="field-wide error-box">{formError}</div> : null}
            <div className="actions compact-actions field-wide">
              <Button type="submit" disabled={mutations.createPayrollRun.isPending}>{mutations.createPayrollRun.isPending ? 'جارٍ التجهيز...' : 'تجهيز مسير المرتبات'}</Button>
            </div>
          </form>
        ) : (
          <p className="muted">تجهيز مسير جديد غير متاح من الواجهة الحالية.</p>
        )}
      </Card>

      <Card title="كشوف المرتبات الشهرية">
        <QueryFeedback
          isLoading={workspace.payrollRuns.isLoading}
          isError={workspace.payrollRuns.isError}
          error={workspace.payrollRuns.error}
          isEmpty={!filteredRuns.length}
          loadingText="جارٍ تحميل كشوف المرتبات..."
          errorTitle="تعذر تحميل كشوف المرتبات"
          emptyTitle="لا توجد بيانات مرتبات لهذه الفترة."
        >
          <DataTable
            rows={filteredRuns}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => setSelectedRunId(String(row.id))}
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
              itemLabel: 'كشف',
            }}
            columns={[
              { key: 'periodMonth', header: 'الشهر', cell: (row) => text(row.periodMonth) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
              { key: 'itemCount', header: 'عدد الموظفين', cell: (row) => text(row.itemCount || (row.items?.length ?? 0)) },
              { key: 'totalBaseSalary', header: 'إجمالي الأساسي', cell: (row) => money(row.totalBaseSalary) },
              { key: 'totalDeductionAmount', header: 'إجمالي الخصومات', cell: (row) => money(row.totalDeductionAmount) },
              { key: 'totalLoanDeductionAmount', header: 'إجمالي السلف/الأقساط', cell: (row) => money(row.totalLoanDeductionAmount) },
              { key: 'totalNetPay', header: 'صافي المرتبات', cell: (row) => money(row.totalNetPay) },
              { key: 'createdAt', header: 'تاريخ الإنشاء', cell: (row) => text(row.createdAt) },
              {
                key: 'actions',
                header: 'إجراء',
                cell: (row) => (
                  <div className="actions compact-actions">
                    {mutations.recalculatePayrollRun ? <Button variant="secondary" onClick={() => { void mutations.recalculatePayrollRun.mutateAsync(String(row.id)); }}>مراجعة</Button> : null}
                    {mutations.reviewPayrollRun ? <Button variant="secondary" onClick={() => { void mutations.reviewPayrollRun.mutateAsync(String(row.id)); }}>اعتماد</Button> : null}
                    {mutations.approvePayrollRun ? <Button variant="secondary" onClick={() => { void mutations.approvePayrollRun.mutateAsync(String(row.id)); }}>اعتماد نهائي</Button> : null}
                    {mutations.cancelPayrollRun ? <Button variant="secondary" onClick={() => { void mutations.cancelPayrollRun.mutateAsync(String(row.id)); }}>إلغاء</Button> : null}
                  </div>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </Card>

      <Card title="تفاصيل ومراجعة المسير">
        {!selectedRunId ? (
          <p className="muted">اختر كشفًا من الجدول لعرض تفاصيل الموظفين.</p>
        ) : (
          <QueryFeedback
            isLoading={payrollRunDetails.isLoading}
            isError={payrollRunDetails.isError}
            error={payrollRunDetails.error}
            isEmpty={false}
            loadingText="جارٍ تحميل تفاصيل المسير..."
            errorTitle="تعذر تحميل تفاصيل المسير"
          >
            {!selectedRun ? (
              <p className="muted">تفاصيل المسير غير متاحة من الواجهة الحالية.</p>
            ) : filteredRunItems.length ? (
              <>
                <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>
                  الخصومات المقترحة للمراجعة فقط، ولا يتم تطبيقها تلقائيًا إلا بعد اعتماد المسؤول.
                </p>
                <DataTable
                  rows={filteredRunItems}
                  rowKey={(row) => String(row.id)}
                  density="compact"
                  columns={[
                    { key: 'employeeNo', header: 'كود الموظف', cell: (row) => text(row.employeeNo) },
                    { key: 'employeeName', header: 'اسم الموظف', cell: (row) => text(row.employeeName) },
                    {
                      key: 'compensationType',
                      header: 'نوع الأجر',
                      cell: (row) => normalize(row.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري',
                    },
                    {
                      key: 'department',
                      header: 'القسم',
                      cell: (row) => text(employeesMap.get(String(row.employeeId))?.departmentName),
                    },
                    {
                      key: 'hourlyRate',
                      header: 'أجر الساعة',
                      cell: (row) => normalize(row.compensationType) === 'hourly' ? money(row.hourlyRate || 0) : 'غير متاح',
                    },
                    {
                      key: 'expectedDailyHours',
                      header: 'ساعات اليوم المتوقعة',
                      cell: (row) => normalize(row.compensationType) === 'hourly' ? String(row.expectedDailyHours || 0) : 'غير متاح',
                    },
                    { key: 'baseSalary', header: 'الراتب الأساسي', cell: (row) => money(row.baseSalary) },
                    { key: 'allowanceAmount', header: 'البدلات', cell: (row) => money(row.allowanceAmount) },
                    { key: 'deductionAmount', header: 'الخصومات', cell: (row) => money(row.deductionAmount) },
                    { key: 'loanDeductionAmount', header: 'السلف/الأقساط', cell: (row) => money(row.loanDeductionAmount) },
                    {
                      key: 'unpaidLeave',
                      header: 'إجازات غير مدفوعة / تنبيهات',
                      cell: (row) => Number(row.unpaidLeaveDays || 0) > 0 ? `بدون مرتب ${Number(row.unpaidLeaveDays || 0)} يوم` : reviewFlagText(row),
                    },
                    { key: 'netPay', header: 'صافي الراتب', cell: (row) => money(row.netPay) },
                    { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
                    {
                      key: 'reviewAttendance',
                      header: 'مراجعة الحضور',
                      cell: (row) => reviewAttendanceText(row),
                    },
                    {
                      key: 'reviewLeaves',
                      header: 'مراجعة الإجازات',
                      cell: (row) => reviewLeavesText(row),
                    },
                    {
                      key: 'suggestedDeduction',
                      header: 'خصم مقترح',
                      cell: (row) => money(Number(row.suggestedAttendanceDeductionAmount || 0) + Number(row.suggestedLeaveDeductionAmount || 0)),
                    },
                    {
                      key: 'details',
                      header: 'عرض التفاصيل',
                      cell: (row) => (
                        <details>
                          <summary>مراجعة</summary>
                          <div className="muted" style={{ marginTop: 8 }}>
                            <div>الراتب الأساسي: {money(row.baseSalary)}</div>
                            <div>نوع الأجر: {normalize(row.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري'}</div>
                            <div>أجر الساعة: {normalize(row.compensationType) === 'hourly' ? money(row.hourlyRate || 0) : 'غير متاح'}</div>
                            <div>ساعات اليوم المتوقعة: {normalize(row.compensationType) === 'hourly' ? String(row.expectedDailyHours || 0) : 'غير متاح'}</div>
                            <div>الخصومات: {money(row.deductionAmount)}</div>
                            <div>السلف/الأقساط: {money(row.loanDeductionAmount)}</div>
                            <div>الإجازات غير المدفوعة: {Number(row.unpaidLeaveDays || 0)} يوم</div>
                            <div>ملاحظات المراجعة: {text(row.payrollReviewNotes)}</div>
                            <div>ملاحظات إضافية: {text(row.notes)}</div>
                          </div>
                        </details>
                      ),
                    },
                  ]}
                />
                {!filteredRunItems.length ? <p className="muted">لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية.</p> : null}
              </>
            ) : (
              <p className="muted">لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية.</p>
            )}
          </QueryFeedback>
        )}
      </Card>

      <Card title="ملاحظة تشغيلية">
        <p className="muted" style={{ margin: 0 }}>
          بعض تنبيهات المراجعة تحتاج ربط بيانات إضافية لاحقًا.
        </p>
      </Card>
    </div>
  );
}
