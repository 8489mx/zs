import { useTranslation } from 'react-i18next';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { CheckIcon } from '@/shared/components/icons/AppIcons';
import { text, money, normalize, getPayFrequencyLabel } from '@/features/hr/pages/payroll/hr-payroll.helpers';
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

export function renderPayrollStatusBadge(statusRaw: unknown) {
  const status = normalize(statusRaw);
  if (status === 'draft') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '1px 5px',
          borderRadius: '10px',
          fontSize: '0.68rem',
          fontWeight: 700,
          background: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fde68a',
          whiteSpace: 'nowrap',
        }}
        title="مسودة — بانتظار المراجعة والتدقيق"
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
        مسودة
      </span>
    );
  }
  if (status === 'reviewed') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '1px 5px',
          borderRadius: '10px',
          fontSize: '0.68rem',
          fontWeight: 700,
          background: '#eff6ff',
          color: '#1e40af',
          border: '1px solid #bfdbfe',
          whiteSpace: 'nowrap',
        }}
        title="تمت المراجعة — جاهز للاعتماد النهائي"
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
        جاهز
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '1px 5px',
          borderRadius: '10px',
          fontSize: '0.68rem',
          fontWeight: 700,
          background: '#ecfdf5',
          color: '#065f46',
          border: '1px solid #a7f3d0',
          whiteSpace: 'nowrap',
        }}
        title="معتمد نهائياً — جاهز للصرف"
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
        معتمد
      </span>
    );
  }
  if (status === 'partially_paid') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '1px 5px',
          borderRadius: '10px',
          fontSize: '0.68rem',
          fontWeight: 700,
          background: '#eff6ff',
          color: '#1d4ed8',
          border: '1px solid #bfdbfe',
          whiteSpace: 'nowrap',
        }}
        title="صرف جزئي — تم صرف رواتب بعض الموظفين"
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
        صرف جزئي
      </span>
    );
  }
  if (status === 'paid') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '1px 5px',
          borderRadius: '10px',
          fontSize: '0.68rem',
          fontWeight: 700,
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #86efac',
          whiteSpace: 'nowrap',
        }}
        title="تم الصرف وتوليد القيد المحاسبي"
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
        تم الصرف
      </span>
    );
  }
  if (status === 'cancelled' || status === 'canceled') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '1px 5px',
          borderRadius: '10px',
          fontSize: '0.68rem',
          fontWeight: 700,
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fca5a5',
          whiteSpace: 'nowrap',
        }}
        title="كشف ملغي"
      >
        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
        ملغي
      </span>
    );
  }
  return <span>{text(statusRaw)}</span>;
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

  const runTabs: Array<{ key: PayrollRunTab; label: string }> = [
    { key: 'monthly', label: 'شهري' },
    { key: 'biweekly', label: 'نصف شهري' },
    { key: 'weekly', label: 'أسبوعي' },
    { key: 'daily', label: 'يومي' },
    { key: 'all_active', label: isEgypt ? 'كافة الكشوف النشطة' : 'كافة المسيرات النشطة' },
    { key: 'cancelled', label: isEgypt ? 'الكشوفات الملغية' : 'المسيرات الملغية' },
  ];

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
          {runTabs.map((tab) => {
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

        <div style={{ minHeight: '140px' }} className="payroll-runs-table-wrap">
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
              tableStyle={{ tableLayout: 'fixed', width: '100%', fontSize: '0.73rem' }}
              pagination={{ page, pageSize, totalItems, onPageChange, onPageSizeChange, itemLabel: isEgypt ? 'كشف' : 'مسير' }}
              columns={[
                {
                  key: 'periodMonth',
                  header: t('hr.payroll.payroll_runs_table.s6', "الشهر"),
                  width: '64px',
                  style: { padding: '4px 2px', textAlign: 'center' },
                  cell: (row) => {
                    const isSelected = String(row.id) === String(selectedRunId);
                    return (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: isSelected ? '#170e5e' : 'transparent',
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                          title={isSelected ? (isEgypt ? 'الكشف المعروض أدناه' : 'المسير المعروض أدناه') : undefined}
                        />
                        <span style={{ fontWeight: 700, color: isSelected ? '#170e5e' : '#0f172a', fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                          {text(row.periodMonth)}
                        </span>
                      </div>
                    );
                  },
                },
                {
                  key: 'payFrequency',
                  header: t('hr.payroll.payroll_runs_table.s7', "الدورة"),
                  width: '54px',
                  style: { padding: '4px 2px', textAlign: 'center' },
                  cell: (row) => (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        color: '#334155',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getPayFrequencyLabel(row.payFrequency)}
                    </span>
                  ),
                },
                {
                  key: 'startDate',
                  header: t('hr.payroll.payroll_runs_table.s12', "من"),
                  width: '62px',
                  style: { padding: '4px 2px', textAlign: 'center' },
                  cell: (row) => (
                    <span style={{ fontSize: '0.69rem', color: '#475569', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
                      {row.startDate ? text(row.startDate) : t('hr.payroll.payroll_runs_table.s13', "أول الشهر")}
                    </span>
                  ),
                },
                {
                  key: 'endDate',
                  header: t('hr.payroll.payroll_runs_table.s14', "إلى"),
                  width: '62px',
                  style: { padding: '4px 2px', textAlign: 'center' },
                  cell: (row) => (
                    <span style={{ fontSize: '0.69rem', color: '#475569', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
                      {row.endDate ? text(row.endDate) : t('hr.payroll.payroll_runs_table.s15', "آخر الشهر")}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: t('hr.payroll.payroll_runs_table.s16', "الحالة"),
                  width: '64px',
                  style: { padding: '4px 2px', textAlign: 'center' },
                  cell: (row) => (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {renderPayrollStatusBadge(row.status)}
                    </div>
                  ),
                },
                {
                  key: 'itemCount',
                  header: t('hr.payroll.payroll_runs_table.emp_header', "الموظفون"),
                  width: '50px',
                  style: { padding: '4px 2px', textAlign: 'center' },
                  cell: (row) => {
                    const count = Number(row.itemCount || (row.items?.length ?? 0));
                    return (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '18px',
                          padding: '1px 4px',
                          borderRadius: '6px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          color: '#1e293b',
                        }}
                      >
                        {count}
                      </span>
                    );
                  },
                },
                {
                  key: 'totalNetPay',
                  header: t('hr.payroll.payroll_runs_table.s18', "صافي المرتبات"),
                  width: '88px',
                  style: { padding: '4px 2px', textAlign: 'center' },
                  cell: (row) => (
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                      {canViewSalaryAmounts ? money(row.totalNetPay) : '—'}
                    </span>
                  ),
                },
                {
                  key: 'createdAt',
                  header: t('hr.payroll.payroll_runs_table.s19', "تاريخ الإنشاء"),
                  width: '68px',
                  style: { padding: '4px 2px', textAlign: 'center' },
                  cell: (row) => {
                    const raw = String(row.createdAt || '').trim();
                    if (!raw) return '—';
                    let dateStr = raw;
                    let timeStr = '';
                    if (raw.includes('T')) {
                      const [d, tPart] = raw.split('T');
                      dateStr = d;
                      timeStr = tPart?.slice(0, 5) || '';
                    } else if (raw.includes(' ')) {
                      const parts = raw.split(' ');
                      if (parts[0].includes(':')) {
                        timeStr = parts[0];
                        dateStr = parts[1] || '';
                      } else {
                        dateStr = parts[0];
                        timeStr = parts[1] || '';
                      }
                    }
                    return (
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15 }}>
                        <span style={{ fontSize: '0.69rem', fontWeight: 600, color: '#334155', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>{dateStr}</span>
                        {timeStr ? <span style={{ fontSize: '0.63rem', color: '#94a3b8' }}>{timeStr}</span> : null}
                      </div>
                    );
                  },
                },
                {
                  key: 'actions',
                  header: t('hr.payroll.payroll_runs_table.s20', "إجراء"),
                  width: '172px',
                  style: { padding: '3px 2px', textAlign: 'center' },
                  cell: (row) => {
                    const isCancelled = normalize(row.status) === 'cancelled' || normalize(row.status) === 'canceled';
                    if (isCancelled) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '22px' }}>
                          <span
                            style={{
                              fontSize: '0.67rem',
                              color: '#991b1b',
                              fontWeight: 600,
                              background: '#fee2e2',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              border: '1px solid #fca5a5',
                              display: 'inline-block',
                            }}
                          >
                            {isEgypt ? 'كشف ملغي' : 'مسير ملغي'}
                          </span>
                        </div>
                      );
                    }
                    const btnBaseStyle: React.CSSProperties = {
                      padding: '1px 5px',
                      fontSize: '0.67rem',
                      fontWeight: 600,
                      minHeight: '22px',
                      height: '22px',
                      lineHeight: 1,
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      boxShadow: 'none',
                      flexShrink: 0,
                    };
                    return (
                      <div
                        className="actions compact-actions"
                        style={{
                          flexWrap: 'nowrap',
                          gap: '3px',
                          minHeight: '22px',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {canManagePayroll && normalize(row.status) !== 'approved' && normalize(row.status) !== 'paid' ? (
                          <Button
                            variant="secondary"
                            onClick={() => onRecalculate(String(row.id))}
                            style={btnBaseStyle}
                            title={t('hr.payroll.payroll_runs_table.recalc_title', "إعادة احتساب الكشف وتحديث الحضور والرواتب")}
                          >
                            {t('hr.payroll.payroll_runs_table.recalc_short', "احتساب")}
                          </Button>
                        ) : null}
                        {canManagePayroll && ['draft', 'reviewed'].includes(normalize(row.status)) ? (
                          <Button
                            variant="secondary"
                            onClick={() => onReviewClick(String(row.id))}
                            style={{
                              ...btnBaseStyle,
                              color: '#1e40af',
                              borderColor: '#bfdbfe',
                              background: '#eff6ff',
                            }}
                            title={
                              normalize(row.status) === 'reviewed'
                                ? 'إعادة مراجعة الكشف وتعديل التسويات'
                                : t('hr.payroll.payroll_runs_table.review_title', "مراجعة وتدقيق بنود الكشف")
                            }
                          >
                            {t('hr.payroll.payroll_runs_table.review_short', "مراجعة")}
                          </Button>
                        ) : null}
                        {canApprovePayroll && normalize(row.status) === 'reviewed' ? (
                          <Button
                            variant="secondary"
                            onClick={() => onApproveClick(String(row.id))}
                            style={{
                              ...btnBaseStyle,
                              fontWeight: 700,
                              color: '#166534',
                              borderColor: '#86efac',
                              background: '#f0fdf4',
                            }}
                            title={t('hr.payroll.payroll_runs_table.approve_title', "اعتماد كشف المرتبات نهائياً")}
                          >
                            {t('hr.payroll.payroll_runs_table.approve_short', "اعتماد")}
                          </Button>
                        ) : null}
                        {canApprovePayroll && ['approved', 'partially_paid'].includes(normalize(row.status)) ? (
                          <Button
                            variant="primary"
                            onClick={() => onPayClick(String(row.id))}
                            style={{
                              ...btnBaseStyle,
                              fontWeight: 700,
                              background: '#170e5e',
                              color: '#ffffff',
                              padding: '1px 7px',
                            }}
                            title={
                              normalize(row.status) === 'partially_paid'
                                ? 'صرف باقي مرتبات الموظفين المعتمدين في هذا الكشف'
                                : t('hr.payroll.payroll_runs_table.pay_title', "تسجيل صرف المرتبات وتوليد السند")
                            }
                          >
                            {normalize(row.status) === 'partially_paid' ? 'صرف المتبقي' : t('hr.payroll.payroll_runs_table.pay_short', "صرف")}
                          </Button>
                        ) : null}
                        {canManagePayroll && ['draft', 'reviewed'].includes(normalize(row.status)) ? (
                          <Button
                            variant="secondary"
                            onClick={() => onCancel(String(row.id))}
                            style={{
                              ...btnBaseStyle,
                              color: '#dc2626',
                              borderColor: '#fecaca',
                              background: '#fff5f5',
                            }}
                            title={t('hr.payroll.payroll_runs_table.cancel_title', "إلغاء هذا الكشف")}
                          >
                            {t('hr.payroll.payroll_runs_table.cancel_short', "إلغاء")}
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
