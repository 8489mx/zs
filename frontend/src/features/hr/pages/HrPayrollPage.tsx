import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrPayrollRun, HrPayrollRunItem } from '@/types/domain';
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

function money(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0.00 ج.م';
  return `${amount.toFixed(2)} ج.م`;
}

function text(value: unknown) {
  return String(value || '').trim() || '—';
}

function statusLabel(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'draft') return 'مسودة';
  if (status === 'reviewed') return 'تمت المراجعة';
  if (status === 'approved') return 'معتمد';
  if (status === 'paid') return 'مصروف';
  if (status === 'cancelled') return 'ملغي';
  return 'غير محدد';
}

export function HrPayrollPage() {
  const navigate = useNavigate();
  const mutations = useHrMutations();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [draft, setDraft] = useState<PayrollDraft>(initialDraft);
  const [formError, setFormError] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');

  const workspace = useHrWorkspace({ page, pageSize });
  const payrollRunDetails = useHrPayrollRun(selectedRunId || undefined);

  const runs = useMemo(() => (workspace.payrollRuns.data?.runs || []) as HrPayrollRun[], [workspace.payrollRuns.data?.runs]);
  const totalItems = Number(workspace.payrollRuns.data?.summary?.totalItems || runs.length || 0);
  const selectedRunFromList = useMemo(() => runs.find((row) => String(row.id) === String(selectedRunId)), [runs, selectedRunId]);
  const selectedRun = (payrollRunDetails.data?.run || selectedRunFromList) as HrPayrollRun | undefined;
  const runItems = useMemo(() => (selectedRun?.items || []) as HrPayrollRunItem[], [selectedRun?.items]);

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
        description="تجهيز ومراجعة كشوف المرتبات بناءً على بيانات الموظفين والعقود والسلف."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>}
      />

      <Card title="تجهيز كشف مرتب">
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
              <Button type="submit" disabled={mutations.createPayrollRun.isPending}>{mutations.createPayrollRun.isPending ? 'جارٍ التجهيز...' : 'تجهيز الكشف'}</Button>
            </div>
          </form>
        ) : (
          <p className="muted">تجهيز كشف جديد غير متاح من الواجهة الحالية حتى يتم ربط الإجراء.</p>
        )}
      </Card>

      <Card title="كشوف المرتبات">
        <QueryFeedback
          isLoading={workspace.payrollRuns.isLoading}
          isError={workspace.payrollRuns.isError}
          error={workspace.payrollRuns.error}
          isEmpty={!runs.length}
          loadingText="جارٍ تحميل كشوف المرتبات..."
          errorTitle="تعذر تحميل كشوف المرتبات"
          emptyTitle="لا توجد كشوف مرتبات مسجلة."
        >
          <DataTable
            rows={runs}
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
              { key: 'periodMonth', header: 'شهر المرتب', cell: (row) => text(row.periodMonth) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
              { key: 'itemCount', header: 'عدد الموظفين', cell: (row) => text(row.itemCount || (row.items?.length ?? 0)) },
              { key: 'totalBaseSalary', header: 'إجمالي الأساسي', cell: (row) => money(row.totalBaseSalary) },
              { key: 'totalLoanDeductionAmount', header: 'إجمالي السلف/الخصومات', cell: (row) => money(row.totalLoanDeductionAmount) },
              { key: 'totalNetPay', header: 'إجمالي الصافي', cell: (row) => money(row.totalNetPay) },
              { key: 'createdAt', header: 'تاريخ الإنشاء', cell: (row) => text(row.createdAt) },
              {
                key: 'actions',
                header: 'إجراءات',
                cell: (row) => (
                  <div className="actions compact-actions">
                    {mutations.recalculatePayrollRun ? <Button variant="secondary" onClick={() => { void mutations.recalculatePayrollRun.mutateAsync(String(row.id)); }}>إعادة احتساب</Button> : null}
                    {mutations.reviewPayrollRun ? <Button variant="secondary" onClick={() => { void mutations.reviewPayrollRun.mutateAsync(String(row.id)); }}>مراجعة</Button> : null}
                    {mutations.approvePayrollRun ? <Button variant="secondary" onClick={() => { void mutations.approvePayrollRun.mutateAsync(String(row.id)); }}>اعتماد</Button> : null}
                    {mutations.cancelPayrollRun ? <Button variant="secondary" onClick={() => { void mutations.cancelPayrollRun.mutateAsync(String(row.id)); }}>إلغاء</Button> : null}
                  </div>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </Card>

      <Card title="تفاصيل كشف المرتب">
        {!selectedRunId ? (
          <p className="muted">اختر كشفًا من الجدول لعرض التفاصيل.</p>
        ) : (
          <QueryFeedback
            isLoading={payrollRunDetails.isLoading}
            isError={payrollRunDetails.isError}
            error={payrollRunDetails.error}
            isEmpty={false}
            loadingText="جارٍ تحميل تفاصيل الكشف..."
            errorTitle="تعذر تحميل تفاصيل الكشف"
          >
            {!selectedRun ? (
              <p className="muted">تفاصيل الكشف غير متاحة من الواجهة الحالية.</p>
            ) : runItems.length ? (
              <DataTable
                rows={runItems}
                rowKey={(row) => String(row.id)}
                density="compact"
                columns={[
                  { key: 'employeeName', header: 'الموظف', cell: (row) => text(row.employeeName) },
                  { key: 'employeeNo', header: 'كود الموظف', cell: (row) => text(row.employeeNo) },
                  { key: 'baseSalary', header: 'الأساسي', cell: (row) => money(row.baseSalary) },
                  { key: 'allowanceAmount', header: 'الإضافات', cell: (row) => money(row.allowanceAmount) },
                  { key: 'deductionAmount', header: 'الخصومات', cell: (row) => money(row.deductionAmount) },
                  { key: 'loanDeductionAmount', header: 'خصم السلف', cell: (row) => money(row.loanDeductionAmount) },
                  { key: 'netPay', header: 'الصافي', cell: (row) => money(row.netPay) },
                  { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
                  { key: 'notes', header: 'ملاحظات', cell: (row) => text(row.notes) },
                ]}
              />
            ) : (
              <p className="muted">لا توجد تفاصيل لهذا الكشف.</p>
            )}
          </QueryFeedback>
        )}
      </Card>
    </div>
  );
}
