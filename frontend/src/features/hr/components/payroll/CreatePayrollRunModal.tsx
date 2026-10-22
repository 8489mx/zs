import { useTranslation } from 'react-i18next';
import React, { useEffect, useMemo } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon, CalendarIcon, UsersIcon, CheckCircleIcon, AlertCircleIcon, InfoIcon } from '@/shared/components/icons/AppIcons';

export interface PayrollDraft {
  periodMonth: string;
  payFrequency: 'monthly' | 'weekly' | 'biweekly' | 'daily' | 'all';
  startDate: string;
  endDate: string;
  notes: string;
}

interface CreatePayrollRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: PayrollDraft;
  onDraftChange: React.Dispatch<React.SetStateAction<PayrollDraft>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  canManagePayroll: boolean;
  hasCreatePayrollRun: boolean;
  formError: string;
  employees?: Array<{ payFrequency?: string; status?: string; displayName?: string }>;
}

function getMonthDates(monthStr: string) {
  if (!monthStr || !monthStr.includes('-')) return { start: '', end: '' };
  const parts = monthStr.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (isNaN(year) || isNaN(month)) return { start: '', end: '' };
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${monthStr}-01`,
    end: `${monthStr}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function CreatePayrollRunModal({
  isOpen,
  onClose,
  draft,
  onDraftChange,
  onSubmit,
  isPending,
  canManagePayroll,
  hasCreatePayrollRun,
  formError,
  employees = [],
}: CreatePayrollRunModalProps) {
  const { t } = useTranslation();

  // Auto-fill dates if empty when month exists
  useEffect(() => {
    if (isOpen && draft.periodMonth && (!draft.startDate || !draft.endDate)) {
      const { start, end } = getMonthDates(draft.periodMonth);
      onDraftChange((prev) => ({
        ...prev,
        startDate: prev.startDate || start,
        endDate: prev.endDate || end,
        payFrequency: prev.payFrequency || 'monthly',
      }));
    }
  }, [isOpen, draft.periodMonth, onDraftChange]);

  const activeEmployees = useMemo(() => {
    return employees.filter((e) => (e.status || 'active') === 'active');
  }, [employees]);

  const frequencyCounts = useMemo(() => {
    let monthly = 0;
    let weekly = 0;
    let biweekly = 0;
    let daily = 0;
    for (const emp of activeEmployees) {
      const freq = (emp.payFrequency || 'monthly').toLowerCase();
      if (freq === 'weekly') weekly++;
      else if (freq === 'biweekly') biweekly++;
      else if (freq === 'daily') daily++;
      else monthly++;
    }
    return {
      monthly,
      weekly,
      biweekly,
      daily,
      all: activeEmployees.length,
    };
  }, [activeEmployees]);

  const selectedTargetCount = useMemo(() => {
    const freq = draft.payFrequency || 'monthly';
    return frequencyCounts[freq] ?? 0;
  }, [draft.payFrequency, frequencyCounts]);

  if (!isOpen) return null;

  const handleMonthChange = (val: string) => {
    const { start, end } = getMonthDates(val);
    onDraftChange((prev) => ({
      ...prev,
      periodMonth: val,
      startDate: start,
      endDate: end,
    }));
  };

  return (
    <DialogShell open={true} onClose={onClose} width="580px">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Standard Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '4px',
                height: '18px',
                backgroundColor: '#170e5e',
                borderRadius: '2px',
                display: 'inline-block',
              }}
            />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {t('hr.payroll.create_payroll_run_modal.title', 'تجهيز مسير رواتب الشهر')}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {t('hr.payroll.create_payroll_run_modal.subtitle', 'احتساب الرواتب والبدلات وجزاءات الحضور وأقساط السلف آلياً')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
            }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {hasCreatePayrollRun && canManagePayroll ? (
            <form id="create-payroll-form" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Row 1: Month and Frequency */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {t('hr.payroll.create_payroll_run_modal.month', 'شهر مسير المرتبات *')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="month"
                      value={draft.periodMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {t('hr.payroll.create_payroll_run_modal.freq', 'دورة القبض المستهدفة')}
                  </label>
                  <select
                    value={draft.payFrequency}
                    onChange={(e) => onDraftChange((prev) => ({ ...prev, payFrequency: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="monthly">شهري - الرواتب الشهرية ({frequencyCounts.monthly} موظف)</option>
                    <option value="all">شامل - كافة الموظفين والدورات ({frequencyCounts.all} موظف)</option>
                    <option value="weekly">أسبوعي ({frequencyCounts.weekly} موظف)</option>
                    <option value="biweekly">نصف شهري ({frequencyCounts.biweekly} موظف)</option>
                    <option value="daily">يومي ({frequencyCounts.daily} موظف)</option>
                  </select>
                </div>
              </div>

              {/* Operational Live Target Banner */}
              {selectedTargetCount > 0 ? (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <CheckCircleIcon size={18} color="#16a34a" />
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#166534' }}>
                      جاهز للاحتساب: {selectedTargetCount} موظف نشط في هذه الدورة
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#15803d', marginTop: '1px' }}>
                      سيتم سحب الراتب الأساسي، والبدلات، وجزاءات التأخير والغياب، وأقساط السلف آلياً.
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <AlertCircleIcon size={18} color="#dc2626" />
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#991b1b' }}>
                      تنبيه: لا يوجد موظفون مسجلون بهذه الدورة ({draft.payFrequency})
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#b91c1c', marginTop: '1px' }}>
                      إذا قمت بالتجهيز الآن سيكون الكشف فارغاً (0 موظف). اختر دورة "شهري" أو "شامل" لتضمين موظفيك.
                    </div>
                  </div>
                </div>
              )}

              {/* Row 2: Date Range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {t('hr.payroll.create_payroll_run_modal.start_date', 'تاريخ بداية الفترة')}
                  </label>
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => onDraftChange((prev) => ({ ...prev, startDate: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.825rem',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    {t('hr.payroll.create_payroll_run_modal.end_date', 'تاريخ نهاية الفترة')}
                  </label>
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(e) => onDraftChange((prev) => ({ ...prev, endDate: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.825rem',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {t('hr.payroll.create_payroll_run_modal.notes', 'ملاحظات إدارية (اختياري)')}
                </label>
                <input
                  value={draft.notes}
                  placeholder="مثال: مسير رواتب شهر أكتوبر بعد مراجعة البصمة والسلف..."
                  onChange={(e) => onDraftChange((prev) => ({ ...prev, notes: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.825rem',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {formError && (
                <div
                  style={{
                    background: '#fff1f2',
                    border: '1px solid #fda4af',
                    color: '#9f1239',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {formError}
                </div>
              )}
            </form>
          ) : (
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
              {t('hr.payroll.create_payroll_run_modal.no_perm', 'لا تملك صلاحية تجهيز كشوف المرتبات.')}
            </p>
          )}
        </div>

        {/* Standard Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          {hasCreatePayrollRun && canManagePayroll ? (
            <Button
              type="submit"
              form="create-payroll-form"
              disabled={isPending}
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                fontWeight: 700,
                padding: '8px 20px',
                borderRadius: '8px',
              }}
            >
              {isPending
                ? t('hr.payroll.create_payroll_run_modal.pending', 'جارٍ احتساب الرواتب...')
                : t('hr.payroll.create_payroll_run_modal.submit', 'تجهيز مسير الشهر')}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            {t('hr.payroll.create_payroll_run_modal.cancel', 'إلغاء')}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
