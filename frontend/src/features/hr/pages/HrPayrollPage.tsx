import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
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
  reviewFlagText,
  statusLabel,
  text,
  type PayrollReviewStatus,
} from '@/features/hr/pages/payroll/hr-payroll.helpers';
import { DialogShell } from '@/shared/components/dialog-shell';

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
  const [selectedReviewItem, setSelectedReviewItem] = useState<HrPayrollRunItem | null>(null);

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

  const printPayslipSummary = (row: HrPayrollRunItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>مفردات مرتب (ملخص) - ${text(row.employeeName)}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: Tahoma, Arial, sans-serif; padding: 0; margin: 0; color: #333; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #222; font-size: 22px; }
            .header p { margin: 5px 0 0; color: #666; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .details div { background: #f9f9f9; padding: 12px; border-radius: 6px; }
            .details strong { display: inline-block; width: 110px; }
            .section-title { font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 12px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { padding: 8px; text-align: right; border-bottom: 1px solid #eee; font-size: 14px; }
            .table th { background: #f5f5f5; font-weight: bold; }
            .totals { background: #f0f7ff; padding: 15px; border-radius: 6px; font-size: 15px; }
            .totals .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .totals .total { font-weight: bold; font-size: 18px; color: #0d47a1; margin-top: 10px; padding-top: 10px; border-top: 2px solid #ccc; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px dashed #ccc; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>مفردات الراتب (ملخص)</h1>
            <p>عن شهر: ${text(selectedRun?.periodMonth)}</p>
          </div>
          <div class="details">
            <div>
              <div class="section-title">بيانات الموظف</div>
              <p><strong>اسم الموظف:</strong> ${text(row.employeeName)}</p>
              <p><strong>كود الموظف:</strong> ${text(row.employeeNo)}</p>
              <p><strong>القسم:</strong> ${text(employeesMap.get(String(row.employeeId))?.departmentName)}</p>
              <p><strong>نوع الأجر:</strong> ${normalize(row.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري'}</p>
            </div>
            <div>
              <div class="section-title">ملخص الحضور</div>
              <p><strong>أيام الغياب:</strong> ${Number(row.attendanceAbsentDays || 0)} يوم</p>
              <p><strong>أيام التأخير:</strong> ${Number(row.attendanceLateDays || 0)} يوم</p>
              <p><strong>إجازات بدون راتب:</strong> ${Number(row.unpaidLeaveDays || 0)} يوم</p>
            </div>
          </div>
          <div class="totals">
            <div class="section-title" style="border:none; margin:0 0 15px;">الاستحقاقات والاستقطاعات</div>
            <div class="row"><strong>الراتب الأساسي:</strong> <span>${row.baseSalary || 0} ج.م</span></div>
            <div class="row"><strong>إجمالي البدلات والإضافي:</strong> <span>${row.allowanceAmount || 0} ج.م</span></div>
            <div class="row"><strong>إجمالي الخصومات (تأخير/غياب):</strong> <span style="color:#d32f2f">-${row.deductionAmount || 0} ج.م</span></div>
            <div class="row"><strong>أقساط السلف:</strong> <span style="color:#d32f2f">-${row.loanDeductionAmount || 0} ج.م</span></div>
            <div class="row total"><strong>صافي الراتب المستحق:</strong> <span>${row.netPay || 0} ج.م</span></div>
          </div>
          <div class="footer">
            <div>توقيع الموظف: ___________________</div>
            <div>توقيع المدير: ___________________</div>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  const printPayslipDetailed = (row: HrPayrollRunItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>مفردات مرتب (تفصيلي) - ${text(row.employeeName)}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: Tahoma, Arial, sans-serif; padding: 0; margin: 0; color: #333; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #222; font-size: 22px; }
            .header p { margin: 5px 0 0; color: #666; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .details div { background: #f9f9f9; padding: 12px; border-radius: 6px; }
            .details strong { display: inline-block; width: 110px; }
            .section-title { font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 12px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { padding: 8px; text-align: right; border-bottom: 1px solid #eee; font-size: 14px; }
            .table th { background: #f5f5f5; font-weight: bold; }
            .totals { background: #f0f7ff; padding: 15px; border-radius: 6px; font-size: 15px; }
            .totals .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .totals .total { font-weight: bold; font-size: 18px; color: #0d47a1; margin-top: 10px; padding-top: 10px; border-top: 2px solid #ccc; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px dashed #ccc; }
            .notes { background: #fffde7; padding: 12px; border-left: 4px solid #fbc02d; margin-bottom: 15px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>مفردات الراتب (تفصيلي)</h1>
            <p>عن شهر: ${text(selectedRun?.periodMonth)}</p>
          </div>
          <div class="details">
            <div>
              <div class="section-title">بيانات الموظف الأساسية</div>
              <p><strong>اسم الموظف:</strong> ${text(row.employeeName)}</p>
              <p><strong>كود الموظف:</strong> ${text(row.employeeNo)}</p>
              <p><strong>القسم:</strong> ${text(employeesMap.get(String(row.employeeId))?.departmentName)}</p>
            </div>
            <div>
              <div class="section-title">بيانات التعاقد</div>
              <p><strong>نوع الأجر:</strong> ${normalize(row.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري'}</p>
              <p><strong>الراتب الأساسي:</strong> ${row.baseSalary || 0} ج.م</p>
              ${normalize(row.compensationType) === 'hourly' ? '<p><strong>سعر الساعة:</strong> ' + (row.hourlyRate || 0) + ' ج.م</p>' : ''}
            </div>
          </div>

          <div class="section-title">تفاصيل الحضور والانصراف خلال الشهر</div>
          <table class="table">
            <thead>
              <tr>
                <th>أيام الحضور</th>
                <th>أيام الغياب</th>
                <th>أيام التأخير</th>
                <th>انصراف مبكر</th>
                <th>إجازات بدون راتب</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>غير متاح</td>
                <td>${Number(row.attendanceAbsentDays || 0)} يوم</td>
                <td>${Number(row.attendanceLateDays || 0)} يوم</td>
                <td>${Number(row.attendanceEarlyLeaveDays || 0)} يوم</td>
                <td>${Number(row.unpaidLeaveDays || 0)} يوم</td>
              </tr>
            </tbody>
          </table>

          ${row.payrollReviewNotes ? '<div class="notes"><strong>ملاحظات الحضور والإجازات:</strong><br/>' + text(row.payrollReviewNotes) + '</div>' : ''}

          <div class="totals">
            <div class="section-title" style="border:none; margin:0 0 15px;">الحساب النهائي (الاستحقاقات والاستقطاعات)</div>
            <div class="row"><strong>الراتب الأساسي:</strong> <span>${row.baseSalary || 0} ج.م</span></div>
            <div class="row"><strong>إجمالي البدلات والمكافآت (الإضافي):</strong> <span>${row.allowanceAmount || 0} ج.م</span></div>
            <div class="row"><strong>إجمالي الاستقطاعات (غياب/تأخير/جزاءات):</strong> <span style="color:#d32f2f">-${row.deductionAmount || 0} ج.م</span></div>
            <div class="row"><strong>أقساط السلف المستحقة:</strong> <span style="color:#d32f2f">-${row.loanDeductionAmount || 0} ج.م</span></div>
            <div class="row total"><strong>صافي الراتب المستحق:</strong> <span>${row.netPay || 0} ج.م</span></div>
          </div>
          <div class="footer">
            <div>توقيع الموظف: ___________________</div>
            <div>توقيع المدير: ___________________</div>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
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
        <FormSection title="الوصول للمرتبات">
          <p className="muted" style={{ margin: 0 }}>ليس لديك صلاحية للوصول إلى هذه الصفحة.</p>
          <p className="muted" style={{ marginBottom: 0 }}>تواصل مع مسؤول النظام لتحديث الصلاحيات.</p>
        </FormSection>
      ) : (
        <>
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

          <FormSection title="مراجعة قبل الاعتماد" description="قائمة مختصرة تمنع نسيان الحضور أو السلف أو البنود التي تحتاج مراجعة قبل اعتماد المرتبات.">
            <div className="form-grid">
              {payrollChecklist.map((item) => (
                <div key={item.key} className="field" style={{ alignItems: 'flex-start' }}>
                  <strong>{item.ok ? '✓' : '•'} {item.title}</strong>
                  <span className="muted">{item.status}</span>
                  {item.onClick ? <Button type="button" variant="secondary" onClick={item.onClick}>{item.action}</Button> : null}
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="كشوف المرتبات الشهرية">
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
                  { key: 'actions', header: 'إجراء', cell: (row) => <div className="actions compact-actions" style={{ flexWrap: 'nowrap' }}>{canManagePayroll && mutations.recalculatePayrollRun ? <Button variant="secondary" onClick={() => { void mutations.recalculatePayrollRun.mutateAsync(String(row.id)); }}>مراجعة</Button> : null}{canManagePayroll && mutations.reviewPayrollRun ? <Button variant="secondary" onClick={() => { void mutations.reviewPayrollRun.mutateAsync(String(row.id)); }}>اعتماد</Button> : null}{canApprovePayroll && mutations.approvePayrollRun ? <Button variant="secondary" onClick={() => { void mutations.approvePayrollRun.mutateAsync(String(row.id)); }}>اعتماد نهائي</Button> : null}{canManagePayroll && mutations.cancelPayrollRun ? <Button variant="secondary" onClick={() => { void mutations.cancelPayrollRun.mutateAsync(String(row.id)); }}>إلغاء</Button> : null}</div> },
                ]}
              />
            </QueryFeedback>
          </FormSection>

          <FormSection title="تفاصيل ومراجعة المسير">
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
                        { key: 'baseSalary', header: 'الراتب الأساسي', cell: (row) => canViewSalaryAmounts ? money(row.baseSalary) : '—' },
                        { key: 'allowanceAmount', header: 'البدلات (إضافي وغيره)', cell: (row) => canViewSalaryAmounts ? money(row.allowanceAmount) : '—' },
                        { key: 'deductionAmount', header: 'الخصومات (تأخير وغياب)', cell: (row) => canViewSalaryAmounts ? money(row.deductionAmount) : '—' },
                        { key: 'loanDeductionAmount', header: 'السلف/الأقساط', cell: (row) => canViewSalaryAmounts ? money(row.loanDeductionAmount) : '—' },
                        { key: 'netPay', header: 'صافي الراتب', cell: (row) => canViewSalaryAmounts ? money(row.netPay) : '—' },
                        { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
                        { key: 'details', header: 'التفاصيل', cell: (row) => <Button variant="secondary" onClick={() => setSelectedReviewItem(row)}>تفاصيل</Button> },
                      ]}
                    />

                    {selectedReviewItem && (
                      <DialogShell open={true} onClose={() => setSelectedReviewItem(null)} width="1000px">
                        <div style={{ padding: '24px' }}>
                          <h2 style={{ marginTop: 0 }}>مراجعة وتفاصيل المرتب</h2>
                          <p className="muted">الموظف: {text(selectedReviewItem.employeeName)} ({text(selectedReviewItem.employeeNo)})</p>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 24px', fontSize: '14px', marginTop: '16px' }}>
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                              <strong className="muted">الراتب الأساسي:</strong> <span>{canViewSalaryAmounts ? money(selectedReviewItem.baseSalary) : '—'}</span>
                            </div>
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                              <strong className="muted">البدلات والإضافي:</strong> <span>{canViewSalaryAmounts ? money(selectedReviewItem.allowanceAmount) : '—'}</span>
                            </div>
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                              <strong className="muted">الخصومات (تأخير وغياب):</strong> <span>{canViewSalaryAmounts ? money(selectedReviewItem.deductionAmount) : '—'}</span>
                            </div>
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                              <strong className="muted">السلف والأقساط:</strong> <span>{canViewSalaryAmounts ? money(selectedReviewItem.loanDeductionAmount) : '—'}</span>
                            </div>
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gridColumn: '1 / -1', background: 'var(--surface-100)', paddingInline: '12px', borderRadius: '4px' }}>
                              <strong style={{ fontSize: '15px' }}>صافي الراتب:</strong> <span style={{ fontWeight: 'bold', color: 'var(--green-700)', fontSize: '15px' }}>{canViewSalaryAmounts ? money(selectedReviewItem.netPay) : '—'}</span>
                            </div>
                            
                            <hr style={{ gridColumn: '1 / -1', margin: '8px 0', border: 'none' }} />
                            
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                              <strong className="muted">نوع الأجر:</strong> <span>{normalize(selectedReviewItem.compensationType) === 'hourly' ? 'أجر بالساعة' : 'راتب شهري'}</span>
                            </div>
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                              <strong className="muted">أجر الساعة:</strong> <span>{normalize(selectedReviewItem.compensationType) === 'hourly' ? (canViewSalaryAmounts ? money(selectedReviewItem.hourlyRate || 0) : '—') : 'غير متاح'}</span>
                            </div>
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                              <strong className="muted">ساعات العمل اليومية:</strong> <span>{normalize(selectedReviewItem.compensationType) === 'hourly' ? String(selectedReviewItem.expectedDailyHours || 0) : 'غير متاح'}</span>
                            </div>
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                              <strong className="muted">تنبيهات عامة:</strong> <span>{reviewFlagText(selectedReviewItem) || '—'}</span>
                            </div>
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
                              <strong className="muted">ملاحظات مراجعة الحضور:</strong> 
                              <span style={{ color: 'var(--red-600)' }}>{text(selectedReviewItem.payrollReviewNotes) || 'لا توجد ملاحظات'}</span>
                            </div>
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
                              <strong className="muted">ملاحظات إضافية:</strong> 
                              <span>{text(selectedReviewItem.notes) || '—'}</span>
                            </div>
                          </div>

                          {runIsFinal && (
                            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                              <Button variant="secondary" onClick={() => printPayslipSummary(selectedReviewItem)}>طباعة مفردات مرتب (ملخص)</Button>
                              <Button variant="secondary" onClick={() => printPayslipDetailed(selectedReviewItem)}>طباعة مفردات مرتب (تفصيلي)</Button>
                            </div>
                          )}

                          <div style={{ marginTop: '24px', textAlign: 'left' }}>
                            <Button variant="primary" onClick={() => setSelectedReviewItem(null)}>إغلاق</Button>
                          </div>
                        </div>
                      </DialogShell>
                    )}
                  </>
                ) : <p className="muted">لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية.</p>}
              </QueryFeedback>
            )}
          </FormSection>

          <HrPayrollOperationalNote />
        </>
      )}

          <HrPayrollWorkflowCard />
      </main>
    </div>
  );
}

