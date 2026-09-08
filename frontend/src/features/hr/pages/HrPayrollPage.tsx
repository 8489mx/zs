import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { useHasAnyPermission } from '@/shared/hooks/use-permission';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee, HrPayrollRun, HrPayrollRunItem } from '@/types/domain';
import { getErrorMessage } from '@/lib/errors';
import { useHrMutations, useHrPayrollRun, useHrWorkspace } from '@/features/hr/hooks/useHr';
import { HrPayrollTopSections } from '@/features/hr/pages/payroll/HrPayrollTopSections';
import {
  employeeMatches,
  itemNeedsReview,
  money,
  normalize,
  statusLabel,
  text,
  type PayrollReviewStatus,
} from '@/features/hr/pages/payroll/hr-payroll.helpers';
import { DialogShell } from '@/shared/components/dialog-shell';
import { systemAlert } from '@/shared/components/system-alert';
import { PayrollWpsExportModal } from '@/features/hr/components/payroll/PayrollWpsExportModal';
import { CreatePayrollRunModal, type PayrollDraft } from '../components/payroll/CreatePayrollRunModal';
import { PayPayrollRunModal } from '../components/payroll/PayPayrollRunModal';
import { PayrollReviewItemModal } from '../components/payroll/PayrollReviewItemModal';
import { PayrollRunsTable } from '../components/payroll/PayrollRunsTable';

const initialDraft: PayrollDraft = {
  periodMonth: '',
  payFrequency: 'monthly',
  startDate: '',
  endDate: '',
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
  const [pendingApprovalAction, setPendingApprovalAction] = useState<{ runId: string; type: 'review' | 'approve' } | null>(null);
  const [showCreateRun, setShowCreateRun] = useState(false);
  const [showPayRun, setShowPayRun] = useState(false);
  const [showWpsModal, setShowWpsModal] = useState(false);
  const [payChannel, setPayChannel] = useState<'cash' | 'bank'>('cash');

  const workspace = useHrWorkspace({ page, pageSize, month: monthFilter });
  const payrollRunDetails = useHrPayrollRun(selectedRunId || undefined);

  const runs = useMemo(() => (workspace.payrollRuns.data?.runs || []) as HrPayrollRun[], [workspace.payrollRuns.data?.runs]);
  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const employeesMap = useMemo(() => new Map(employees.map((employee) => [String(employee.id), employee])), [employees]);

  const totalItems = Number(workspace.payrollRuns.data?.summary?.totalItems || runs.length || 0);
  const selectedRunFromList = useMemo(() => runs.find((row) => String(row.id) === String(selectedRunId)), [runs, selectedRunId]);
  const selectedRun = (payrollRunDetails.data?.run || selectedRunFromList) as HrPayrollRun | undefined;
  const runItems = useMemo(() => {
    const items = (selectedRun?.items || []) as HrPayrollRunItem[];
    return items.filter((item) => item.status !== 'excluded');
  }, [selectedRun?.items]);

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
      if (reviewStatusFilter === 'approved' && rowStatus !== 'approved') return false;
      if (reviewStatusFilter === 'needs_review' && !needsReview) return false;
      if (reviewStatusFilter === 'ready' && (rowStatus === 'approved' || needsReview)) return false;
      if (reviewStatusFilter === 'paid' && rowStatus !== 'paid') return false;
      return true;
    });
  }, [departmentFilter, employeesMap, reviewStatusFilter, runItems, search]);

  const runStatusOptions = [
    { value: 'all', label: 'كافة الحالات' },
    { value: 'draft', label: 'مسودة' },
    { value: 'reviewed', label: 'تمت المراجعة' },
    { value: 'approved', label: 'معتمد' },
    { value: 'paid', label: 'مصروف' },
    { value: 'cancelled', label: 'ملغي' },
  ];

  const [runStatusFilter, setRunStatusFilter] = useState('all');

  const filteredRuns = useMemo(() => {
    if (runStatusFilter === 'all') return runs;
    return runs.filter((r) => normalize(r.status) === runStatusFilter);
  }, [runs, runStatusFilter]);

  const summary = useMemo(() => {
    const totalNet = runItems.reduce((acc, row) => acc + Number(row.netPay || 0), 0);
    const totalBase = runItems.reduce((acc, row) => acc + Number(row.baseSalary || 0), 0);
    const totalAllowances = runItems.reduce((acc, row) => acc + Number(row.allowanceAmount || 0), 0);
    const totalDeductions = runItems.reduce((acc, row) => acc + Number(row.deductionAmount || 0), 0);
    const totalLoanDeduction = runItems.reduce((acc, row) => acc + Number(row.loanDeductionAmount || 0), 0);
    const flaggedCount = runItems.filter(itemNeedsReview).length;
    return {
      totalNet,
      totalBase,
      totalBaseSalary: totalBase,
      totalAllowances,
      totalDeductions,
      totalLoanDeduction,
      flaggedCount,
      needsReview: flaggedCount,
      itemCount: runItems.length,
      totalEmployees: runItems.length,
    };
  }, [runItems]);

  const dueLoanInstallmentRows = useMemo(() => {
    return runItems.filter((item) => Number(item.loanDeductionAmount || 0) > 0);
  }, [runItems]);

  const hasCreatePayrollRun = Boolean(mutations.createPayrollRun);
  const runIsFinal = selectedRun && (normalize(selectedRun.status) === 'approved' || normalize(selectedRun.status) === 'paid');

  const payrollChecklist = useMemo(() => {
    const list: Array<{ key: string; title: string; status: string; ok: boolean; action?: string; onClick?: () => void }> = [];
    list.push({
      key: 'run',
      title: 'تجهيز المسير',
      status: selectedRun ? `مسير شهر ${selectedRun.periodMonth}` : 'لم يتم التجهيز',
      ok: Boolean(selectedRun),
      action: !selectedRun ? 'تجهيز مسير الشهر' : undefined,
      onClick: !selectedRun ? () => setShowCreateRun(true) : undefined,
    });
    list.push({
      key: 'attendance',
      title: 'مراجعة الحضور',
      status: summary.flaggedCount ? `${summary.flaggedCount} موظف بحاجة لمراجعة` : 'تم التحقق من البصمة',
      ok: summary.flaggedCount === 0,
      action: 'فتح الحضور',
      onClick: () => navigate('/hr/attendance'),
    });
    list.push({
      key: 'loans',
      title: 'أقساط السلف',
      status: dueLoanInstallmentRows.length ? `${dueLoanInstallmentRows.length} قسط مستقطع` : 'لا توجد سلف معلقة',
      ok: true,
      action: 'مراجعة السلف',
      onClick: () => navigate('/hr/loans'),
    });
    if (selectedRun) {
      list.push({
        key: 'status',
        title: 'حالة الاعتماد',
        status: statusLabel(selectedRun.status),
        ok: Boolean(runIsFinal),
        action: normalize(selectedRun.status) === 'draft' ? 'اعتماد المسير' : normalize(selectedRun.status) === 'reviewed' ? 'اعتماد نهائي' : undefined,
        onClick: normalize(selectedRun.status) === 'draft' ? () => handleRunActionClick(String(selectedRun.id), 'review') : normalize(selectedRun.status) === 'reviewed' ? () => handleRunActionClick(String(selectedRun.id), 'approve') : undefined,
      });
    }
    return list;
  }, [selectedRun, summary.flaggedCount, dueLoanInstallmentRows.length, runIsFinal, navigate]);

  const handleRunActionClick = (runId: string, type: 'review' | 'approve') => {
    const exceptions = runItems.filter((i) => Number(i.unresolvedExceptionsCount || 0) > 0);
    if (exceptions.length > 0) {
      setPendingApprovalAction({ runId, type });
      return;
    }
    executeRunAction(runId, type);
  };

  const executeRunAction = async (runId: string, type: 'review' | 'approve') => {
    try {
      if (type === 'review') {
        await mutations.reviewPayrollRun?.mutateAsync(runId);
      } else {
        await mutations.approvePayrollRun?.mutateAsync(runId);
      }
      setPendingApprovalAction(null);
    } catch (err) {
      systemAlert(getErrorMessage(err));
    }
  };

  const handleCreateRun = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.periodMonth) return;
    try {
      setFormError('');
      const res = await mutations.createPayrollRun.mutateAsync(draft);
      setShowCreateRun(false);
      if (res?.run?.id) {
        setSelectedRunId(String(res.run.id));
      }
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  const handlePayRun = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRunId) return;
    try {
      setFormError('');
      await mutations.payPayrollRun?.mutateAsync({ id: selectedRunId, payload: { paymentChannel: payChannel } });
      setShowPayRun(false);
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  const printPayrollSignatureSheet = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>كشف تسليم الرواتب - ${text(selectedRun?.periodMonth)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Tajawal', Tahoma, Arial, sans-serif; padding: 0; margin: 0; color: #1e293b; line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
            .header h1 { margin: 0; color: #0f172a; font-size: 26px; font-weight: 700; }
            .header p { margin: 0; color: #64748b; font-size: 16px; font-weight: 500; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px; }
            .table thead { display: table-header-group; }
            .table tr { page-break-inside: avoid; }
            .table th, .table td { padding: 12px 14px; text-align: right; border: 1px solid #cbd5e1; }
            .table th { background-color: #f8fafc; font-weight: 700; color: #334155; border-bottom: 2px solid #94a3b8; }
            .table tbody tr:nth-child(even) { background-color: #fbfcfd; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; padding-top: 25px; clear: both; page-break-inside: avoid; }
            .signature-box { text-align: center; width: 30%; }
            .signature-box .title { font-weight: 700; color: #475569; margin-bottom: 40px; }
            .signature-box .line { border-bottom: 1px solid #94a3b8; width: 80%; margin: 0 auto; }
            .amount { font-family: monospace; font-size: 15px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>كشف تسليم الرواتب</h1>
            <p>خاص بشهر: ${text(selectedRun?.periodMonth)}</p>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">م</th>
                <th style="width: 100px;">كود الموظف</th>
                <th>اسم الموظف</th>
                <th style="width: 140px;">صافي الراتب المستحق</th>
                <th style="width: 220px;">التوقيع / ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRunItems.map((row, index) => `
                <tr>
                  <td style="text-align: center; color: #64748b;">${index + 1}</td>
                  <td style="color: #64748b;">${text(row.employeeNo)}</td>
                  <td style="font-weight: 500;">${text(row.employeeName)}</td>
                  <td class="amount">${money(row.netPay)}</td>
                  <td></td>
                </tr>
              `).join('')}
              <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 15px;">
                <td colspan="3" style="text-align: left; padding: 12px 14px; border: 1px solid #cbd5e1; color: #0f172a;">إجمالي الرواتب المستحقة:</td>
                <td class="amount" style="padding: 12px 14px; border: 1px solid #cbd5e1; color: #0f172a; font-size: 16px;">${money(summary.totalNet)}</td>
                <td style="border: 1px solid #cbd5e1; background-color: #f8fafc;"></td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <div class="signature-box">
              <div class="title">إعداد الموارد البشرية</div>
              <div class="line"></div>
            </div>
            <div class="signature-box">
              <div class="title">اعتماد الإدارة</div>
              <div class="line"></div>
            </div>
            <div class="signature-box">
              <div class="title">توقيع أمين الخزينة</div>
              <div class="line"></div>
            </div>
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
      <main className="document-prototype-column" style={{ paddingBottom: '20px' }}>
        <PageHeader
          title="المرتبات"
          description="مسار شهري واضح: جهّز المسير، راجع الحضور والإجازات والسلف، ثم اعتمد عند اكتمال المراجعة."
          actions={
            <div className="actions compact-actions">
              {hasCreatePayrollRun && canManagePayroll ? (
                <Button onClick={() => { setDraft((current) => ({ ...current, periodMonth: current.periodMonth || monthFilter })); setShowCreateRun(true); }}>
                  إنشاء مسير الشهر
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => navigate('/hr/attendance')}>مراجعة الحضور</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/loans')}>مراجعة السلف</Button>
              <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
            </div>
          }
        />
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {!canViewPayroll ? (
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#64748b' }}>
              <p style={{ margin: 0 }}>ليس لديك صلاحية للوصول إلى بيانات المرتبات.</p>
            </div>
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

              <PayrollRunsTable
                payrollChecklist={payrollChecklist}
                runs={filteredRuns}
                isLoading={workspace.payrollRuns.isLoading}
                isError={workspace.payrollRuns.isError}
                error={workspace.payrollRuns.error}
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={(next) => { setPageSize(next); setPage(1); }}
                onSelectRun={(id) => setSelectedRunId(id)}
                canViewSalaryAmounts={canViewSalaryAmounts}
                canManagePayroll={canManagePayroll}
                canApprovePayroll={canApprovePayroll}
                onRecalculate={(id) => void mutations.recalculatePayrollRun?.mutateAsync(id)}
                onReviewClick={(id) => handleRunActionClick(id, 'review')}
                onApproveClick={(id) => handleRunActionClick(id, 'approve')}
                onPayClick={(id) => { setSelectedRunId(id); setShowPayRun(true); }}
                onCancel={(id) => void mutations.cancelPayrollRun?.mutateAsync(id)}
              />

              {/* Selected Run Details Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                    تفاصيل ومراجعة موظفي المسير {selectedRun ? `(${text(selectedRun.periodMonth)})` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {selectedRun && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowWpsModal(true)}
                        style={{ padding: '2px 10px', fontSize: '0.8rem', background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', fontWeight: 600 }}
                      >
                        تصدير ملف حماية الأجور (WPS / SIF)
                      </Button>
                    )}
                    {runIsFinal && (
                      <Button variant="secondary" onClick={() => printPayrollSignatureSheet()} style={{ padding: '2px 10px', fontSize: '0.8rem' }}>طباعة كشف تسليم الرواتب</Button>
                    )}
                  </div>
                </div>

                {!selectedRunId ? (
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    اضغط على أي كشف من الجدول أعلاه لعرض وتفصيل رواتب الموظفين الخاصة به.
                  </div>
                ) : (
                  <QueryFeedback isLoading={payrollRunDetails.isLoading} isError={payrollRunDetails.isError} error={payrollRunDetails.error} isEmpty={false} loadingText="جارٍ تحميل تفاصيل المسير..." errorTitle="تعذر تحميل تفاصيل المسير">
                    {!selectedRun ? (
                      <p className="muted">تفاصيل المسير غير متاحة.</p>
                    ) : filteredRunItems.length ? (
                      <DataTable
                        rows={filteredRunItems}
                        rowKey={(row) => String(row.id)}
                        density="compact"
                        columns={[
                          { key: 'employeeNo', header: 'كود الموظف', cell: (row) => text(row.employeeNo) },
                          { key: 'employeeName', header: 'اسم الموظف', cell: (row) => text(row.employeeName) },
                          { key: 'baseSalary', header: 'الراتب الأساسي', cell: (row) => canViewSalaryAmounts ? money(row.baseSalary) : '—' },
                          { key: 'allowanceAmount', header: 'البدلات والإضافي', cell: (row) => canViewSalaryAmounts ? money(row.allowanceAmount) : '—' },
                          { key: 'deductionAmount', header: 'الخصومات', cell: (row) => canViewSalaryAmounts ? money(row.deductionAmount) : '—' },
                          { key: 'loanDeductionAmount', header: 'السلف/الأقساط', cell: (row) => canViewSalaryAmounts ? money(row.loanDeductionAmount) : '—' },
                          { key: 'netPay', header: 'صافي الراتب', cell: (row) => canViewSalaryAmounts ? money(row.netPay) : '—' },
                          { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
                          { key: 'details', header: 'التفاصيل', cell: (row) => <Button variant="secondary" onClick={() => setSelectedReviewItem(row)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>تفاصيل</Button> },
                        ]}
                      />
                    ) : (
                      <p className="muted" style={{ padding: '16px', textAlign: 'center' }}>لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية.</p>
                    )}
                  </QueryFeedback>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreatePayrollRunModal
        isOpen={showCreateRun}
        onClose={() => setShowCreateRun(false)}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={handleCreateRun}
        isPending={mutations.createPayrollRun.isPending}
        canManagePayroll={canManagePayroll}
        hasCreatePayrollRun={hasCreatePayrollRun}
        formError={formError}
      />

      <PayPayrollRunModal
        isOpen={showPayRun}
        onClose={() => setShowPayRun(false)}
        selectedRun={selectedRun}
        payChannel={payChannel}
        onPayChannelChange={setPayChannel}
        onSubmit={handlePayRun}
        isPending={mutations.payPayrollRun?.isPending ?? false}
        canApprovePayroll={canApprovePayroll}
        formError={formError}
      />

      {showWpsModal && selectedRun && (
        <PayrollWpsExportModal
          runId={String(selectedRun.id)}
          runMonth={String(selectedRun.periodMonth || '')}
          runName={String((selectedRun as any).name || `مسير شهر ${selectedRun.periodMonth || ''}`)}
          onClose={() => setShowWpsModal(false)}
        />
      )}

      <PayrollReviewItemModal
        item={selectedReviewItem}
        onClose={() => setSelectedReviewItem(null)}
        canViewSalaryAmounts={canViewSalaryAmounts}
        runIsFinal={Boolean(runIsFinal)}
        onPrintSummary={(item) => alert('طباعة ملخص للموظف ' + item.employeeName)}
        onPrintDetailed={(item) => alert('طباعة تفصيلي للموظف ' + item.employeeName)}
      />

      {pendingApprovalAction && (
        <DialogShell open={true} onClose={() => setPendingApprovalAction(null)} width="600px">
          <div style={{ padding: '24px' }}>
            <h2 style={{ marginTop: 0, color: '#dc2626' }}>تنبيه: استثناءات معلقة</h2>
            <p>يوجد استثناءات حضور وانصراف معلقة للموظفين بحاجة للمراجعة. هل أنت متأكد من رغبتك بالاستمرار دون معالجتها؟</p>
            <div className="actions">
              <Button variant="secondary" onClick={() => setPendingApprovalAction(null)}>إلغاء ومراجعة الاستثناءات</Button>
              <Button variant="danger" onClick={() => executeRunAction(pendingApprovalAction.runId, pendingApprovalAction.type)}>نعم، تابع الاعتماد</Button>
            </div>
          </div>
        </DialogShell>
      )}
    </div>
  );
}
