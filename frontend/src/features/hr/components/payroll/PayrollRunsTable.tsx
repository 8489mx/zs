import { useTranslation } from 'react-i18next';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { CheckIcon } from '@/shared/components/icons/AppIcons';
import { text, money, statusLabel, normalize, getPayFrequencyLabel } from '@/features/hr/pages/payroll/hr-payroll.helpers';
import type { HrPayrollRun } from '@/types/domain';

export type PayrollRunTab = 'monthly' | 'biweekly' | 'weekly' | 'daily' | 'all_active' | 'cancelled';

export interface PayrollRunTabCounts {
  monthly: number;
  biweekly: number;
  weekly: number;
  daily: number;
  all_active?: number;
  allActive?: number;
  cancelled: number;
}

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
  selectedRunId?: string;
  activeTab: PayrollRunTab;
  onTabChange: (tab: PayrollRunTab) => void;
  tabCounts: PayrollRunTabCounts;
  onCreateRun?: () => void;
  canViewSalaryAmounts: boolean;
  canManagePayroll: boolean;
  canApprovePayroll: boolean;
  onRecalculate: (id: string) => void;
  onReviewClick: (id: string) => void;
  onApproveClick: (id: string) => void;
  onPayClick: (id: string) => void;
  onCancel: (id: string) => void;
  isEgypt?: boolean;
}

const RUN_TABS: Array<{ key: PayrollRunTab; label: string }> = [
  { key: 'monthly', label: 'شهري' },
  { key: 'biweekly', label: 'نصف شهري' },
  { key: 'weekly', label: 'أسبوعي' },
  { key: 'daily', label: 'يومي' },
  { key: 'all_active', label: 'كافة الكشوف النشطة' },
  { key: 'cancelled', label: 'الكشوفات الملغية' },
];

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
  selectedRunId,
  activeTab,
  onTabChange,
  tabCounts,
  onCreateRun,
  canViewSalaryAmounts,
  canManagePayroll,
  canApprovePayroll,
  onRecalculate,
  onReviewClick,
  onApproveClick,
  onPayClick,
  onCancel,
  isEgypt = false,
}: PayrollRunsTableProps) {
  const { t } = useTranslation();

  const getEmptyMessage = () => {
    if (activeTab === 'cancelled') {
      return isEgypt ? 'لا توجد أي كشوف مرتبات ملغية.' : 'لا توجد أي مسيرات رواتب ملغية.';
    }
    if (activeTab === 'monthly') {
      return isEgypt ? 'لا توجد كشوف مرتبات شهرية نشطة مسجلة لهذه الفترة.' : 'لا توجد مسيرات رواتب شهرية نشطة مسجلة لهذه الفترة.';
    }
    if (activeTab === 'biweekly') {
      return isEgypt ? 'لا توجد كشوف مرتبات نصف شهرية نشطة مسجلة لهذه الفترة.' : 'لا توجد مسيرات رواتب نصف شهرية نشطة مسجلة لهذه الفترة.';
    }
    if (activeTab === 'weekly') {
      return isEgypt ? 'لا توجد كشوف مرتبات أسبوعية نشطة مسجلة لهذه الفترة.' : 'لا توجد مسيرات رواتب أسبوعية نشطة مسجلة لهذه الفترة.';
    }
    if (activeTab === 'daily') {
      return isEgypt ? 'لا توجد كشوف مرتبات يومية نشطة مسجلة لهذه الفترة.' : 'لا توجد مسيرات رواتب يومية نشطة مسجلة لهذه الفترة.';
    }
    return isEgypt ? 'لا توجد كشوف مرتبات مسجلة لهذه الفترة.' : 'لا توجد مسيرات رواتب مسجلة لهذه الفترة.';
  };

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

      {/* Runs Table Section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
            {isEgypt ? 'كشوف المرتبات المسجلة' : 'مسيرات الرواتب المسجلة'}
          </div>
          {onCreateRun && canManagePayroll ? (
            <Button
              type="button"
              variant="primary"
              onClick={onCreateRun}
              style={{ padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600, background: '#170e5e' }}
            >
              + {isEgypt ? 'تجهيز كشف جديد' : 'تجهيز مسير جديد'}
            </Button>
          ) : null}
        </div>

        {/* Executive Tabs for Frequency & Cancelled Runs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px', background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          {RUN_TABS.map((tab) => {
            const count = tab.key === 'all_active'
              ? (tabCounts.all_active ?? tabCounts.allActive ?? 0)
              : (tabCounts[tab.key] ?? 0);
            const isActive = activeTab === tab.key;
            const isCancelledTab = tab.key === 'cancelled';
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  background: isActive ? '#170e5e' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxSizing: 'border-box',
                  transition: 'none',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isActive
                      ? 'rgba(255, 255, 255, 0.22)'
                      : isCancelledTab && count > 0
                      ? '#fee2e2'
                      : '#f1f5f9',
                    color: isActive
                      ? '#ffffff'
                      : isCancelledTab && count > 0
                      ? '#b91c1c'
                      : '#64748b',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ minHeight: '140px' }}>
          <QueryFeedback
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!runs.length}
            loadingText={isEgypt ? 'جارٍ تحميل كشوف المرتبات...' : 'جارٍ تحميل مسيرات الرواتب...'}
            errorTitle={isEgypt ? 'تعذر تحميل كشوف المرتبات' : 'تعذر تحميل مسيرات الرواتب'}
            emptyTitle={getEmptyMessage()}
          >
            <DataTable
              rows={runs}
              rowKey={(row) => String(row.id)}
              onRowClick={(row) => onSelectRun(String(row.id))}
              density="compact"
              tableStyle={{ tableLayout: 'fixed', width: '100%' }}
              pagination={{ page, pageSize, totalItems, onPageChange, onPageSizeChange, itemLabel: isEgypt ? 'كشف' : 'مسير' }}
              columns={[
                {
                  key: 'periodMonth',
                  header: t('hr.payroll.payroll_runs_table.s6', "الشهر"),
                  width: '110px',
                  cell: (row) => {
                    const isSelected = String(row.id) === String(selectedRunId);
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isSelected ? '#170e5e' : 'transparent',
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                          title={isSelected ? 'الكشف المعروض أدناه' : undefined}
                        />
                        <span style={{ fontWeight: 600, color: isSelected ? '#170e5e' : '#0f172a' }}>
                          {text(row.periodMonth)}
                        </span>
                      </div>
                    );
                  },
                },
                {
                  key: 'payFrequency',
                  header: t('hr.payroll.payroll_runs_table.s7', "دورة القبض"),
                  width: '95px',
                  cell: (row) => getPayFrequencyLabel(row.payFrequency),
                },
                {
                  key: 'startDate',
                  header: t('hr.payroll.payroll_runs_table.s12', "من"),
                  width: '95px',
                  cell: (row) => row.startDate ? text(row.startDate) : t('hr.payroll.payroll_runs_table.s13', "أول الشهر"),
                },
                {
                  key: 'endDate',
                  header: t('hr.payroll.payroll_runs_table.s14', "إلى"),
                  width: '95px',
                  cell: (row) => row.endDate ? text(row.endDate) : t('hr.payroll.payroll_runs_table.s15', "آخر الشهر"),
                },
                {
                  key: 'status',
                  header: t('hr.payroll.payroll_runs_table.s16', "الحالة"),
                  width: '90px',
                  cell: (row) => statusLabel(row.status),
                },
                {
                  key: 'itemCount',
                  header: t('hr.payroll.payroll_runs_table.s17', "عدد الموظفين"),
                  width: '85px',
                  cell: (row) => text(row.itemCount || (row.items?.length ?? 0)),
                },
                {
                  key: 'totalNetPay',
                  header: t('hr.payroll.payroll_runs_table.s18', "صافي المرتبات"),
                  width: '110px',
                  cell: (row) => canViewSalaryAmounts ? money(row.totalNetPay) : '—',
                },
                {
                  key: 'createdAt',
                  header: t('hr.payroll.payroll_runs_table.s19', "تاريخ الإنشاء"),
                  width: '135px',
                  cell: (row) => text(row.createdAt),
                },
                {
                  key: 'actions',
                  header: t('hr.payroll.payroll_runs_table.s20', "إجراء"),
                  width: '265px',
                  cell: (row) => {
                    const isCancelled = normalize(row.status) === 'cancelled' || normalize(row.status) === 'canceled';
                    if (isCancelled) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', minHeight: '26px' }}>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              color: '#991b1b',
                              fontWeight: 600,
                              background: '#fee2e2',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #fca5a5',
                              display: 'inline-block',
                            }}
                          >
                            كشف ملغي
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div className="actions compact-actions" style={{ flexWrap: 'nowrap', gap: '4px', minHeight: '26px', alignItems: 'center' }}>
                        {canManagePayroll && normalize(row.status) !== 'approved' && normalize(row.status) !== 'paid' ? (
                          <Button variant="secondary" onClick={() => onRecalculate(String(row.id))} style={{ padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {t('hr.payroll.payroll_runs_table.recalc', "إعادة احتساب")}
                          </Button>
                        ) : null}
                        {canManagePayroll && ['draft', 'reviewed'].includes(normalize(row.status)) ? (
                          <Button variant="secondary" onClick={() => onReviewClick(String(row.id))} style={{ padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', borderColor: '#bfdbfe' }}>
                            {normalize(row.status) === 'reviewed' ? 'إعادة مراجعة' : t('hr.payroll.payroll_runs_table.review_approve', "مراجعة واعتماد")}
                          </Button>
                        ) : null}
                        {canApprovePayroll && normalize(row.status) === 'reviewed' ? (
                          <Button variant="secondary" onClick={() => onApproveClick(String(row.id))} style={{ padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600, color: '#166534', borderColor: '#bbf7d0' }}>
                            {t('hr.payroll.payroll_runs_table.final_approve', "اعتماد نهائي")}
                          </Button>
                        ) : null}
                        {canApprovePayroll && normalize(row.status) === 'approved' ? (
                          <Button variant="primary" onClick={() => onPayClick(String(row.id))} style={{ padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {t('hr.payroll.payroll_runs_table.pay', "صرف المرتبات")}
                          </Button>
                        ) : null}
                        {canManagePayroll && normalize(row.status) !== 'paid' ? (
                          <Button variant="secondary" onClick={() => onCancel(String(row.id))} style={{ padding: '3px 8px', fontSize: '0.75rem', color: '#991b1b', borderColor: '#fecaca' }}>
                            {t('hr.payroll.payroll_runs_table.cancel', "إلغاء")}
                          </Button>
                        ) : null}
                      </div>
                    );
                  },
                },
              ]}
            />
          </QueryFeedback>
        </div>
      </div>
    </>
  );
}
