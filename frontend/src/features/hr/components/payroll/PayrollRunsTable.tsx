import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <>
      {/* Compact Smart Audit Strip */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '0.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{t('hr.payroll.payroll_runs_table.s0', "فحص التدقيق المحاسبي:")}</span>
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
        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>{t('hr.payroll.payroll_runs_table.s1', "كشوف المرتبات المسجلة")}</div>
        <QueryFeedback isLoading={isLoading} isError={isError} error={error} isEmpty={!runs.length} loadingText={t('hr.payroll.payroll_runs_table.s2', "جارٍ تحميل كشوف المرتبات...")} errorTitle={t('hr.payroll.payroll_runs_table.s3', "تعذر تحميل كشوف المرتبات")} emptyTitle={t('hr.payroll.payroll_runs_table.s4', "لا توجد بيانات مرتبات لهذه الفترة.")}>
          <DataTable
            rows={runs}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => onSelectRun(String(row.id))}
            density="compact"
            pagination={{ page, pageSize, totalItems, onPageChange, onPageSizeChange, itemLabel: t('hr.payroll.payroll_runs_table.s5', "كشف") }}
            columns={[
              { key: 'periodMonth', header: t('hr.payroll.payroll_runs_table.s6', "الشهر"), cell: (row) => text(row.periodMonth) },
              { key: 'payFrequency', header: t('hr.payroll.payroll_runs_table.s7', "الدورة"), cell: (row) => row.payFrequency === 'weekly' ? t('hr.payroll.payroll_runs_table.s8', "أسبوعي") : row.payFrequency === 'biweekly' ? t('hr.payroll.payroll_runs_table.s9', "نصف شهري") : row.payFrequency === 'daily' ? t('hr.payroll.payroll_runs_table.s10', "يومي") : t('hr.payroll.payroll_runs_table.s11', "شهري") },
              { key: 'startDate', header: t('hr.payroll.payroll_runs_table.s12', "من"), cell: (row) => row.startDate ? text(row.startDate) : t('hr.payroll.payroll_runs_table.s13', "أول الشهر") },
              { key: 'endDate', header: t('hr.payroll.payroll_runs_table.s14', "إلى"), cell: (row) => row.endDate ? text(row.endDate) : t('hr.payroll.payroll_runs_table.s15', "آخر الشهر") },
              { key: 'status', header: t('hr.payroll.payroll_runs_table.s16', "الحالة"), cell: (row) => statusLabel(row.status) },
              { key: 'itemCount', header: t('hr.payroll.payroll_runs_table.s17', "عدد الموظفين"), cell: (row) => text(row.itemCount || (row.items?.length ?? 0)) },
              { key: 'totalNetPay', header: t('hr.payroll.payroll_runs_table.s18', "صافي المرتبات"), cell: (row) => canViewSalaryAmounts ? money(row.totalNetPay) : '—' },
              { key: 'createdAt', header: t('hr.payroll.payroll_runs_table.s19', "تاريخ الإنشاء"), cell: (row) => text(row.createdAt) },
              {
                key: 'actions',
                header: t('hr.payroll.payroll_runs_table.s20', "إجراء"),
                cell: (row) => (
                  <div className="actions compact-actions" style={{ flexWrap: 'nowrap' }}>
                    {canManagePayroll && normalize(row.status) !== 'approved' && normalize(row.status) !== 'paid' ? (
                      <Button variant="secondary" onClick={() => onRecalculate(String(row.id))} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.payroll.payroll_runs_table.s21', "مراجعة")}</Button>
                    ) : null}
                    {canManagePayroll && normalize(row.status) === 'draft' ? (
                      <Button variant="secondary" onClick={() => onReviewClick(String(row.id))} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.payroll.payroll_runs_table.s22', "اعتماد")}</Button>
                    ) : null}
                    {canApprovePayroll && normalize(row.status) === 'reviewed' ? (
                      <Button variant="secondary" onClick={() => onApproveClick(String(row.id))} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.payroll.payroll_runs_table.s23', "اعتماد نهائي")}</Button>
                    ) : null}
                    {canApprovePayroll && normalize(row.status) === 'approved' ? (
                      <Button variant="primary" onClick={() => onPayClick(String(row.id))} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.payroll.payroll_runs_table.s24', "صرف")}</Button>
                    ) : null}
                    {canManagePayroll && normalize(row.status) !== 'paid' && normalize(row.status) !== 'cancelled' ? (
                      <Button variant="secondary" onClick={() => onCancel(String(row.id))} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.payroll.payroll_runs_table.s25', "إلغاء")}</Button>
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
