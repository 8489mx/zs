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
  payFrequency: 'monthly' | 'weekly' | 'biweekly' | 'daily';
  startDate: string;
  endDate: string;
  notes: string;
}

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
    return items.filter((item) => {
      const base = Number(item.baseSalary || 0);
      const hourly = Number(item.hourlyRate || 0);
      const net = Number(item.netPay || 0);
      return base > 0 || hourly > 0 || net > 0;
    });
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
      { key: 'status', title: 'حالة الكشف', status: runIsFinal ? 'تم الاعتماد/الصرف. لا يمكن تعديل المسير الآن.' : 'يرجى مراجعة المسير قبل اعتماد الرواتب.', ok: runIsFinal || summary.needsReview === 0, action: selectedRunStatus === 'approved' ? 'صرف المرتبات' : 'اعتماد نهائي', onClick: selectedRunStatus === 'approved' ? () => setShowPayRun(true) : (!runIsFinal && selectedRun) ? () => handleRunActionClick(selectedRun.id, 'approve') : undefined },
    ];
  }, [dueLoanInstallmentRows.length, filteredRunItems.length, navigate, runIsFinal, selectedRun, summary.needsReview]);

  function handleRunActionClick(runId: string, actionType: 'review' | 'approve') {
    if (selectedRunId !== runId) {
      setSelectedRunId(runId);
      alert('تم عرض تفاصيل هذا المسير. يرجى مراجعتها بالأسفل وتأكيد عدم وجود استثناءات معلقة ثم حاول مرة أخرى.');
      return;
    }
    const hasExceptions = filteredRunItems.some(item => Number(item.unresolvedExceptionsCount || 0) > 0);
    if (hasExceptions) {
      setPendingApprovalAction({ runId, type: actionType });
    } else {
      executeRunAction(runId, actionType);
    }
  }

  function executeRunAction(runId: string, actionType: 'review' | 'approve') {
    if (actionType === 'review' && mutations.reviewPayrollRun) {
      void mutations.reviewPayrollRun.mutateAsync(runId);
    } else if (actionType === 'approve' && mutations.approvePayrollRun) {
      void mutations.approvePayrollRun.mutateAsync(runId);
    }
    setPendingApprovalAction(null);
  }

  async function handlePayRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    if (!selectedRunId) return;
    try {
      await mutations.payPayrollRun.mutateAsync({ id: selectedRunId, payload: { paymentChannel: payChannel } });
      setShowPayRun(false);
    } catch (error) {
      setFormError(getErrorMessage(error, 'تعذر صرف المرتبات.'));
    }
  }

  async function handleCreateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const periodMonth = String(draft.periodMonth || '').trim();
    if (!periodMonth) { setFormError('شهر مسير المرتبات مطلوب.'); return; }
    try {
      await mutations.createPayrollRun.mutateAsync({ 
        periodMonth, 
        payFrequency: draft.payFrequency,
        startDate: draft.startDate || undefined,
        endDate: draft.endDate || undefined,
        notes: String(draft.notes || '').trim() || undefined 
      });
      setDraft(initialDraft);
      setShowCreateRun(false);
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
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
            @page { size: A4 portrait; margin: 10mm; }
            body { 
              font-family: 'Tajawal', Tahoma, Arial, sans-serif; 
              padding: 0; margin: 0; color: #1e293b; line-height: 1.5; 
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .container { max-width: 100%; box-sizing: border-box; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #0f172a; font-size: 22px; font-weight: 700; }
            .header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .details div { background: #fdfdfd; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .details p { margin: 6px 0; font-size: 13px; }
            .details strong { display: inline-block; width: 110px; color: #475569; }
            .section-title { font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; color: #0f172a; font-weight: 700; }
            .totals { background: #fdfdfd; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px; }
            .totals .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .totals .row span { font-weight: 500; }
            .totals .total { font-weight: 700; font-size: 18px; color: #16a34a; margin-top: 10px; padding-top: 10px; border-top: 2px solid #e2e8f0; }
            .footer { margin-top: 40px; display: flex; justify-content: space-around; padding-top: 20px; }
            .signature-box { text-align: center; width: 40%; }
            .signature-box .title { font-weight: 700; color: #475569; margin-bottom: 30px; }
            .signature-box .line { border-bottom: 1px dashed #cbd5e1; width: 80%; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>مفردات الراتب (ملخص)</h1>
              <p>خاص بشهر: ${text(selectedRun?.periodMonth)}</p>
            </div>
            <div class="details">
              <div>
                <div class="section-title">بيانات الموظف الأساسية</div>
                <p><strong>اسم الموظف:</strong> ${text(row.employeeName)}</p>
                <p><strong>كود الموظف:</strong> ${text(row.employeeNo)}</p>
                <p><strong>القسم:</strong> ${text(employeesMap.get(String(row.employeeId))?.departmentName)}</p>
              </div>
              <div>
                <div class="section-title">ملخص الحضور والانصراف</div>
                <p><strong>أيام الغياب:</strong> ${Number(row.attendanceAbsentDays || 0)} يوم</p>
                <p><strong>أيام التأخير:</strong> ${Number(row.attendanceLateDays || 0)} يوم</p>
                <p><strong>إجازات بدون راتب:</strong> ${Number(row.unpaidLeaveDays || 0)} يوم</p>
              </div>
            </div>
            
            <div class="totals">
              <div class="section-title" style="border:none; margin:0 0 15px;">الحساب النهائي (الاستحقاقات والاستقطاعات)</div>
              <div class="row"><strong class="muted">الراتب الأساسي:</strong> <span>${money(row.baseSalary)}</span></div>
              <div class="row"><strong class="muted">إجمالي البدلات والمكافآت:</strong> <span>${money(row.allowanceAmount)}</span></div>
              <div class="row"><strong class="muted">الخصومات (تأخير وغياب):</strong> <span style="color:#dc2626">-${money(row.deductionAmount)}</span></div>
              <div class="row"><strong class="muted">أقساط السلف المستحقة:</strong> <span style="color:#dc2626">-${money(row.loanDeductionAmount)}</span></div>
              <div class="row total"><strong>صافي الراتب المستحق:</strong> <span>${money(row.netPay)}</span></div>
            </div>

            <div class="footer">
              <div class="signature-box">
                <div class="title">توقيع الموظف</div>
                <div class="line"></div>
              </div>
              <div class="signature-box">
                <div class="title">توقيع المدير</div>
                <div class="line"></div>
              </div>
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
  const printPayslipDetailed = (row: HrPayrollRunItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>مفردات مرتب (تفصيلي) - ${text(row.employeeName)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
            @page { size: A4 portrait; margin: 10mm; }
            body { 
              font-family: 'Tajawal', Tahoma, Arial, sans-serif; 
              padding: 0; margin: 0; color: #1e293b; line-height: 1.5; 
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .container { max-width: 100%; box-sizing: border-box; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px; }
            .header h1 { margin: 0; color: #0f172a; font-size: 20px; font-weight: 700; }
            .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
            .details div { background: #fdfdfd; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .details p { margin: 5px 0; font-size: 12px; }
            .details strong { display: inline-block; width: 100px; color: #475569; }
            .section-title { font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; color: #0f172a; font-weight: 700; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .table th, .table td { padding: 6px; text-align: center; border-bottom: 1px solid #e2e8f0; font-size: 12px; border: 1px solid #e2e8f0; }
            .table th { background: #f8fafc; font-weight: 700; color: #475569; }
            .notes { background: #fffbeb; padding: 10px; border-right: 3px solid #f59e0b; border-radius: 4px; margin-bottom: 15px; font-size: 12px; color: #92400e; }
            .totals { background: #fdfdfd; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px; }
            .totals .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .totals .row span { font-weight: 500; }
            .totals .total { font-weight: 700; font-size: 16px; color: #16a34a; margin-top: 8px; padding-top: 8px; border-top: 2px solid #e2e8f0; }
            .footer { margin-top: 30px; display: flex; justify-content: space-around; padding-top: 15px; }
            .signature-box { text-align: center; width: 40%; }
            .signature-box .title { font-weight: 700; color: #475569; margin-bottom: 25px; font-size: 13px; }
            .signature-box .line { border-bottom: 1px dashed #cbd5e1; width: 80%; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>مفردات الراتب (تفصيلي)</h1>
              <p>خاص بشهر: ${text(selectedRun?.periodMonth)}</p>
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
                <p><strong>الراتب الأساسي:</strong> ${money(row.baseSalary)}</p>
                ${normalize(row.compensationType) === 'hourly' ? '<p><strong>سعر الساعة:</strong> ' + money(row.hourlyRate || 0) + '</p>' : ''}
              </div>
            </div>

            <div class="section-title" style="border: none; margin-bottom: 6px;">تفاصيل الحضور والانصراف خلال الشهر</div>
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
              <div class="section-title" style="border:none; margin:0 0 10px;">الحساب النهائي (الاستحقاقات والاستقطاعات)</div>
              <div class="row"><strong class="muted">الراتب الأساسي:</strong> <span>${money(row.baseSalary)}</span></div>
              <div class="row"><strong class="muted">إجمالي البدلات والمكافآت (الإضافي):</strong> <span>${money(row.allowanceAmount)}</span></div>
              <div class="row"><strong class="muted">إجمالي الاستقطاعات (غياب/تأخير/جزاءات):</strong> <span style="color:#dc2626">-${money(row.deductionAmount)}</span></div>
              <div class="row"><strong class="muted">أقساط السلف المستحقة:</strong> <span style="color:#dc2626">-${money(row.loanDeductionAmount)}</span></div>
              <div class="row total"><strong>صافي الراتب المستحق:</strong> <span>${money(row.netPay)}</span></div>
            </div>

            <div class="footer">
              <div class="signature-box">
                <div class="title">توقيع الموظف</div>
                <div class="line"></div>
              </div>
              <div class="signature-box">
                <div class="title">توقيع المدير</div>
                <div class="line"></div>
              </div>
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
            body { 
              font-family: 'Tajawal', Tahoma, Arial, sans-serif; 
              padding: 0; margin: 0; color: #1e293b; line-height: 1.6; 
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .header { 
              text-align: center; border-bottom: 2px solid #e2e8f0; 
              padding-bottom: 20px; margin-bottom: 25px; 
              display: flex; flex-direction: column; align-items: center; gap: 4px;
            }
            .header h1 { margin: 0; color: #0f172a; font-size: 26px; font-weight: 700; }
            .header p { margin: 0; color: #64748b; font-size: 16px; font-weight: 500; }
            .table { 
              width: 100%; border-collapse: collapse; margin-bottom: 25px; 
              font-size: 14px;
            }
            .table thead { display: table-header-group; }
            .table tr { page-break-inside: avoid; }
            .table th, .table td { 
              padding: 12px 14px; text-align: right; 
              border: 1px solid #cbd5e1; 
            }
            .table th { 
              background-color: #f8fafc; font-weight: 700; 
              color: #334155; border-bottom: 2px solid #94a3b8; 
            }
            .table tbody tr:nth-child(even) { background-color: #fbfcfd; }

            .footer { 
              margin-top: 60px; display: flex; justify-content: space-between; 
              padding-top: 25px; clear: both; page-break-inside: avoid;
            }
            .signature-box {
              text-align: center; width: 30%;
            }
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
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px' }}>
      <PageHeader
        title="المرتبات"
        description="مسار شهري واضح: جهّز المسير، راجع الحضور والإجازات والسلف، ثم اعتمد عند اكتمال المراجعة."
        actions={
          <div className="actions compact-actions">
            {hasCreatePayrollRun && canManagePayroll ? <Button variant="secondary" onClick={() => { setDraft((current) => ({ ...current, periodMonth: current.periodMonth || monthFilter })); setShowCreateRun(true); }}>إنشاء مسير الشهر</Button> : null}
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

          {showCreateRun && (
            <DialogShell open={true} onClose={() => setShowCreateRun(false)} width="500px">
              <div style={{ padding: '24px' }}>
                <h2 style={{ marginTop: 0 }}>تجهيز مسير المرتبات</h2>
                {hasCreatePayrollRun && canManagePayroll ? (
                  <form className="form-grid" onSubmit={(e) => void handleCreateRun(e)}>
                    <label className="field field-wide"><span>شهر مسير المرتبات (كمرجع) *</span><input type="month" value={draft.periodMonth} onChange={(event) => setDraft((current) => ({ ...current, periodMonth: event.target.value }))} required /></label>
                    <label className="field"><span>دورة القبض المستهدفة</span><select value={draft.payFrequency} onChange={(event) => setDraft((current) => ({ ...current, payFrequency: event.target.value as any }))}><option value="monthly">شهري</option><option value="weekly">أسبوعي</option><option value="biweekly">نصف شهري (كل أسبوعين)</option><option value="daily">يومي</option></select></label>
                    <div className="form-grid field-wide" style={{ gap: '12px', display: 'flex' }}>
                      <label className="field" style={{ flex: 1 }}><span>تاريخ البداية (اختياري)</span><input type="date" value={draft.startDate} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} /></label>
                      <label className="field" style={{ flex: 1 }}><span>تاريخ النهاية (اختياري)</span><input type="date" value={draft.endDate} onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))} /></label>
                    </div>
                    <label className="field field-wide"><span>ملاحظات</span><input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} /></label>
                    {formError ? <div className="field-wide error-box">{formError}</div> : null}
                    <div className="actions compact-actions field-wide" style={{ marginTop: '16px' }}>
                      <Button type="submit" disabled={mutations.createPayrollRun.isPending}>{mutations.createPayrollRun.isPending ? 'جارٍ التجهيز...' : 'تجهيز المسير'}</Button>
                      <Button type="button" variant="secondary" onClick={() => setShowCreateRun(false)}>إلغاء</Button>
                    </div>
                  </form>
                ) : (
                  <p className="muted">لا تملك صلاحية تنفيذ هذا الإجراء.</p>
                )}
              </div>
            </DialogShell>
          )}

          {showPayRun && (
            <DialogShell open={true} onClose={() => setShowPayRun(false)} width="500px">
              <div style={{ padding: '24px' }}>
                <h2 style={{ marginTop: 0 }}>صرف المرتبات</h2>
                {canApprovePayroll && mutations.payPayrollRun ? (
                  <form className="form-grid" onSubmit={(e) => void handlePayRun(e)}>
                    <p style={{ marginBottom: '16px' }}>أنت على وشك صرف المرتبات للمسير المعتمد الخاص بشهر {text(selectedRun?.periodMonth)}. سيتم إنشاء قيد يومية محاسبي بالصرف.</p>
                    <label className="field field-wide">
                      <span>طريقة الصرف *</span>
                      <select value={payChannel} onChange={(event) => setPayChannel(event.target.value as 'cash' | 'bank')} required>
                        <option value="cash">نقداً (من الخزينة)</option>
                        <option value="bank">تحويل بنكي</option>
                      </select>
                    </label>
                    {formError ? <div className="field-wide error-box">{formError}</div> : null}
                    <div className="actions compact-actions field-wide" style={{ marginTop: '16px' }}>
                      <Button type="submit" disabled={mutations.payPayrollRun.isPending}>{mutations.payPayrollRun.isPending ? 'جارٍ الصرف...' : 'تأكيد الصرف'}</Button>
                      <Button type="button" variant="secondary" onClick={() => setShowPayRun(false)}>إلغاء</Button>
                    </div>
                  </form>
                ) : (
                  <p className="muted">لا تملك صلاحية تنفيذ هذا الإجراء.</p>
                )}
              </div>
            </DialogShell>
          )}

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
                  { key: 'payFrequency', header: 'الدورة', cell: (row) => row.payFrequency === 'weekly' ? 'أسبوعي' : row.payFrequency === 'biweekly' ? 'نصف شهري' : row.payFrequency === 'daily' ? 'يومي' : 'شهري' },
                  { key: 'startDate', header: 'من', cell: (row) => row.startDate ? text(row.startDate) : 'أول الشهر' },
                  { key: 'endDate', header: 'إلى', cell: (row) => row.endDate ? text(row.endDate) : 'آخر الشهر' },
                  { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
                  { key: 'itemCount', header: 'عدد الموظفين', cell: (row) => text(row.itemCount || (row.items?.length ?? 0)) },
                  { key: 'totalNetPay', header: 'صافي المرتبات', cell: (row) => canViewSalaryAmounts ? money(row.totalNetPay) : 'لا تملك صلاحية عرض هذه البيانات.' },
                  { key: 'createdAt', header: 'تاريخ الإنشاء', cell: (row) => text(row.createdAt) },
                  { key: 'actions', header: 'إجراء', cell: (row) => <div className="actions compact-actions" style={{ flexWrap: 'nowrap' }}>{canManagePayroll && mutations.recalculatePayrollRun && normalize(row.status) !== 'approved' && normalize(row.status) !== 'paid' ? <Button variant="secondary" onClick={() => { void mutations.recalculatePayrollRun.mutateAsync(String(row.id)); }}>مراجعة</Button> : null}{canManagePayroll && mutations.reviewPayrollRun && normalize(row.status) === 'draft' ? <Button variant="secondary" onClick={() => handleRunActionClick(String(row.id), 'review')}>اعتماد</Button> : null}{canApprovePayroll && mutations.approvePayrollRun && normalize(row.status) === 'reviewed' ? <Button variant="secondary" onClick={() => handleRunActionClick(String(row.id), 'approve')}>اعتماد نهائي</Button> : null}{canApprovePayroll && mutations.payPayrollRun && normalize(row.status) === 'approved' ? <Button variant="primary" onClick={() => { setSelectedRunId(String(row.id)); setShowPayRun(true); }}>صرف</Button> : null}{canManagePayroll && mutations.cancelPayrollRun && normalize(row.status) !== 'paid' && normalize(row.status) !== 'cancelled' ? <Button variant="secondary" onClick={() => { void mutations.cancelPayrollRun.mutateAsync(String(row.id)); }}>إلغاء</Button> : null}</div> },
                ]}
              />
            </QueryFeedback>
          </FormSection>

          <FormSection title="مراجعة قبل الاعتماد" description="قائمة مختصرة تمنع نسيان الحضور أو السلف.">
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {payrollChecklist.map((item) => (
                <div key={item.key} className="field" style={{ alignItems: 'flex-start', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', background: item.ok ? 'var(--surface-50)' : 'var(--surface-color)' }}>
                  <strong>{item.ok ? '✓' : '•'} {item.title}</strong>
                  <span className="muted" style={{ fontSize: '13px', margin: '8px 0', flex: 1 }}>{item.status}</span>
                  {item.onClick ? <Button type="button" variant={item.ok ? 'secondary' : 'primary'} onClick={item.onClick} style={{ width: '100%', fontSize: '13px' }}>{item.action}</Button> : null}
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="تفاصيل ومراجعة المسير">
            {!selectedRunId ? <p className="muted">اختر كشفًا من الجدول لعرض تفاصيل الموظفين.</p> : (
              <QueryFeedback isLoading={payrollRunDetails.isLoading} isError={payrollRunDetails.isError} error={payrollRunDetails.error} isEmpty={false} loadingText="جارٍ تحميل تفاصيل المسير..." errorTitle="تعذر تحميل تفاصيل المسير">
                {!selectedRun ? <p className="muted">تفاصيل المسير غير متاحة من الواجهة الحالية.</p> : filteredRunItems.length ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <p className="muted" style={{ margin: 0 }}>الخصومات المقترحة للمراجعة فقط، ولا يتم تطبيقها تلقائيًا إلا بعد اعتماد المسؤول.</p>
                      {runIsFinal && (
                        <Button variant="secondary" onClick={() => printPayrollSignatureSheet()}>طباعة كشف تسليم الرواتب</Button>
                      )}
                    </div>
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
                      <DialogShell open={true} onClose={() => setSelectedReviewItem(null)} width="500px">
                        <div style={{ padding: '24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                            <h2 style={{ margin: 0, color: 'var(--text-color)', fontSize: '20px' }}>تفاصيل المرتب</h2>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '15px', color: 'var(--text-color)' }}>{text(selectedReviewItem.employeeName)}</p>
                              <span className="muted" style={{ fontSize: '13px' }}>كود: {text(selectedReviewItem.employeeNo)}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
                              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--text-color)' }}>الحساب النهائي</h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                                  <span className="muted">الراتب الأساسي:</span>
                                  <span style={{ fontWeight: '500' }}>{canViewSalaryAmounts ? money(selectedReviewItem.baseSalary) : '—'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                                  <span className="muted">البدلات والإضافي:</span>
                                  <span style={{ fontWeight: '500' }}>{canViewSalaryAmounts ? money(selectedReviewItem.allowanceAmount) : '—'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                                  <span className="muted">الخصومات (تأخير وغياب):</span>
                                  <span style={{ fontWeight: '500', color: 'var(--red-600)' }}>{canViewSalaryAmounts ? money(selectedReviewItem.deductionAmount) : '—'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '6px' }}>
                                  <span className="muted">السلف والأقساط:</span>
                                  <span style={{ fontWeight: '500', color: 'var(--red-600)' }}>{canViewSalaryAmounts ? money(selectedReviewItem.loanDeductionAmount) : '—'}</span>
                                </div>
                              </div>
                              
                              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>صافي الراتب المستحق:</span>
                                <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--green-700)' }}>{canViewSalaryAmounts ? money(selectedReviewItem.netPay) : '—'}</span>
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                              <div>
                                <div className="muted" style={{ fontSize: '12px', marginBottom: '4px' }}>نوع الأجر</div>
                                <div style={{ fontWeight: '500', fontSize: '14px' }}>{normalize(selectedReviewItem.compensationType) === 'hourly' ? 'أجر بالساعة/اليوم' : 'راتب شهري'}</div>
                              </div>
                              {normalize(selectedReviewItem.compensationType) === 'hourly' && (
                                <>
                                  <div>
                                    <div className="muted" style={{ fontSize: '12px', marginBottom: '4px' }}>أجر الساعة/اليوم</div>
                                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{canViewSalaryAmounts ? money(selectedReviewItem.hourlyRate || 0) : '—'}</div>
                                  </div>
                                  <div>
                                    <div className="muted" style={{ fontSize: '12px', marginBottom: '4px' }}>ساعات العمل اليومية</div>
                                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{selectedReviewItem.expectedDailyHours || 0}</div>
                                  </div>
                                </>
                              )}
                              <div>
                                <div className="muted" style={{ fontSize: '12px', marginBottom: '4px' }}>تنبيهات عامة</div>
                                <div style={{ fontWeight: '500', fontSize: '14px', color: reviewFlagText(selectedReviewItem) ? 'var(--orange-600)' : 'inherit' }}>
                                  {reviewFlagText(selectedReviewItem) || 'لا يوجد'}
                                </div>
                              </div>
                            </div>

                            {(selectedReviewItem.payrollReviewNotes || selectedReviewItem.notes) && (
                              <div style={{ background: 'var(--yellow-50)', padding: '16px', borderRadius: '8px', borderRight: '4px solid var(--yellow-400)' }}>
                                {selectedReviewItem.payrollReviewNotes && (
                                  <div style={{ marginBottom: selectedReviewItem.notes ? '12px' : '0' }}>
                                    <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--yellow-800)', fontSize: '13px' }}>ملاحظات مراجعة الحضور:</strong>
                                    <span style={{ color: 'var(--yellow-900)', fontSize: '14px' }}>{text(selectedReviewItem.payrollReviewNotes)}</span>
                                  </div>
                                )}
                                {selectedReviewItem.notes && (
                                  <div>
                                    <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--yellow-800)', fontSize: '13px' }}>ملاحظات إضافية:</strong>
                                    <span style={{ color: 'var(--yellow-900)', fontSize: '14px' }}>{text(selectedReviewItem.notes)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Button variant="primary" onClick={() => setSelectedReviewItem(null)}>إغلاق</Button>
                            </div>
                            {runIsFinal && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="secondary" onClick={() => printPayslipSummary(selectedReviewItem)}>ملخص (A4)</Button>
                                <Button variant="secondary" onClick={() => printPayslipDetailed(selectedReviewItem)}>تفصيلي (A4)</Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </DialogShell>
                    )}
                  </>
                ) : <p className="muted">لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية.</p>}
              </QueryFeedback>
            )}
          </FormSection>

          {pendingApprovalAction && (
            <DialogShell open={true} onClose={() => setPendingApprovalAction(null)} width="600px">
              <div style={{ padding: '24px' }}>
                <h2 style={{ marginTop: 0, color: 'var(--error-color)' }}>تنبيه: استثناءات معلقة</h2>
                <p>يوجد استثناءات حضور وانصراف معلقة للموظفين التاليين بحاجة للمراجعة. هل أنت متأكد من رغبتك بالاستمرار دون معالجتها؟</p>
                <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'var(--surface-color)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {filteredRunItems.filter(i => Number(i.unresolvedExceptionsCount || 0) > 0).map(i => (
                      <li key={i.id} style={{ marginBottom: '4px' }}>
                        {text(i.employeeName)} ({text(i.employeeNo)})
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="actions">
                  <Button variant="secondary" onClick={() => setPendingApprovalAction(null)}>إلغاء الأمر ومراجعة الاستثناءات</Button>
                  <Button variant="danger" onClick={() => executeRunAction(pendingApprovalAction.runId, pendingApprovalAction.type)}>نعم، تابع الاعتماد</Button>
                </div>
              </div>
            </DialogShell>
          )}
        </>
      )}

      </main>
    </div>
  );
}



