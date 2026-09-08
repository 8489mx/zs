import { QueryFeedback } from '@/shared/components/query-feedback';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { CheckIcon } from '@/shared/components/icons/AppIcons';
import { text, money, statusLabel, normalize } from '@/features/hr/pages/payroll/hr-payroll.helpers';
import type { HrPayrollRun } from '@/types/domain';

interface PayrollRunsTableProps {
  payrollChecklist: Array<{ key: string; title: string; status: string; ok: boolean; action?: string; onClick?: () => void }>;
  runs: HrPayrollRun[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onSelectRun: (id: string) => void;
  canViewSalaryAmounts: boolean;
  canManagePayroll: boolean;
  canApprovePayroll: boolean;
  onRecalculate: (id: string) => void;
  onReviewClick: (id: string) => void;
  onApproveClick: (id: string) => void;
  onPayClick: (id: string) => void;
  onCancel: (id: string) => void;
}

export function PayrollRunsTable({
  payrollChecklist,
  runs,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  onSelectRun,
  canViewSalaryAmounts,
  canManagePayroll,
  canApprovePayroll,
  onRecalculate,
  onReviewClick,
  onApproveClick,
  onPayClick,
  onCancel,
}: PayrollRunsTableProps) {
  return (
    <>
      {/* Compact Smart Audit Strip */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '0.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>فحص التدقيق المحاسبي:</span>
          </strong>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {payrollChecklist.map((item) => (
              <span
                key={item.key}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: item.ok ? '#f0fdf4' : '#fefce8',
                  color: item.ok ? '#166534' : '#854d0e',
                  border: `1px solid ${item.ok ? '#bbf7d0' : '#fef08a'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title={item.status}
              >
                {item.ok ? <CheckIcon size={13} color="#16a34a" /> : '•'} {item.title}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {payrollChecklist.filter((item) => item.onClick && (!item.ok || item.key === 'status')).map((item) => (
            <Button key={item.key} type="button" variant={item.ok ? 'secondary' : 'primary'} onClick={item.onClick} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
              {item.action}
            </Button>
          ))}
        </div>
      </div>

      {/* Runs Table */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>كشوف المرتبات المسجلة</div>
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} isEmpty={!runs.length} loadingText="جارٍ تحميل كشوف المرتبات..." errorTitle="تعذر تحميل كشوف المرتبات" emptyTitle="لا توجد بيانات مرتبات لهذه الفترة.">
          <DataTable
            rows={runs}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => onSelectRun(String(row.id))}
            density="compact"
            pagination={{ page, pageSize, totalItems, onPageChange, onPageSizeChange, itemLabel: 'كشف' }}
            columns={[
              { key: 'periodMonth', header: 'الشهر', cell: (row) => text(row.periodMonth) },
              { key: 'payFrequency', header: 'الدورة', cell: (row) => row.payFrequency === 'weekly' ? 'أسبوعي' : row.payFrequency === 'biweekly' ? 'نصف شهري' : row.payFrequency === 'daily' ? 'يومي' : 'شهري' },
              { key: 'startDate', header: 'من', cell: (row) => row.startDate ? text(row.startDate) : 'أول الشهر' },
              { key: 'endDate', header: 'إلى', cell: (row) => row.endDate ? text(row.endDate) : 'آخر الشهر' },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
              { key: 'itemCount', header: 'عدد الموظفين', cell: (row) => text(row.itemCount || (row.items?.length ?? 0)) },
              { key: 'totalNetPay', header: 'صافي المرتبات', cell: (row) => canViewSalaryAmounts ? money(row.totalNetPay) : '—' },
              { key: 'createdAt', header: 'تاريخ الإنشاء', cell: (row) => text(row.createdAt) },
              {
                key: 'actions',
                header: 'إجراء',
                cell: (row) => (
                  <div className="actions compact-actions" style={{ flexWrap: 'nowrap' }}>
                    {canManagePayroll && normalize(row.status) !== 'approved' && normalize(row.status) !== 'paid' ? (
                      <Button variant="secondary" onClick={() => onRecalculate(String(row.id))} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>مراجعة</Button>
                    ) : null}
                    {canManagePayroll && normalize(row.status) === 'draft' ? (
                      <Button variant="secondary" onClick={() => onReviewClick(String(row.id))} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>اعتماد</Button>
                    ) : null}
                    {canApprovePayroll && normalize(row.status) === 'reviewed' ? (
                      <Button variant="secondary" onClick={() => onApproveClick(String(row.id))} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>اعتماد نهائي</Button>
                    ) : null}
                    {canApprovePayroll && normalize(row.status) === 'approved' ? (
                      <Button variant="primary" onClick={() => onPayClick(String(row.id))} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>صرف</Button>
                    ) : null}
                    {canManagePayroll && normalize(row.status) !== 'paid' && normalize(row.status) !== 'cancelled' ? (
                      <Button variant="secondary" onClick={() => onCancel(String(row.id))} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>إلغاء</Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </div>
    </>
  );
}
