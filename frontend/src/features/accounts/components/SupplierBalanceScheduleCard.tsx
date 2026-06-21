import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { EmptyState } from '@/shared/ui/empty-state';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { supplierBalanceScheduleApi, type SupplierPaymentScheduleItem } from '@/features/accounts/api/supplier-balance-schedule.api';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Supplier } from '@/types/domain';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function statusLabel(status: string) {
  if (status === 'paid') return 'مدفوعة';
  if (status === 'partial') return 'مدفوعة جزئيًا';
  if (status === 'overdue') return 'متأخرة';
  if (status === 'cancelled') return 'ملغاة';
  return 'غير مدفوعة';
}

function statusClass(status: string) {
  if (status === 'paid') return 'supplier-schedule-status supplier-schedule-status--paid';
  if (status === 'partial') return 'supplier-schedule-status supplier-schedule-status--partial';
  if (status === 'overdue') return 'supplier-schedule-status supplier-schedule-status--overdue';
  if (status === 'cancelled') return 'supplier-schedule-status supplier-schedule-status--cancelled';
  return 'supplier-schedule-status supplier-schedule-status--pending';
}

function summarize(rows: SupplierPaymentScheduleItem[]) {
  return rows.reduce((acc, row) => ({
    total: acc.total + Number(row.amount || 0),
    paid: acc.paid + Number(row.paidAmount || 0),
    remaining: acc.remaining + Number(row.remainingAmount || 0),
    overdue: acc.overdue + (row.status === 'overdue' ? 1 : 0),
  }), { total: 0, paid: 0, remaining: 0, overdue: 0 });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

type ScheduleFilter = 'all' | 'pending' | 'partial' | 'paid' | 'overdue';

const FILTER_OPTIONS: Array<{ key: ScheduleFilter; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'غير مدفوعة' },
  { key: 'partial', label: 'جزئية' },
  { key: 'paid', label: 'مدفوعة' },
  { key: 'overdue', label: 'متأخرة' },
];

function normalizeStatusForFilter(status: string): ScheduleFilter | 'cancelled' {
  if (status === 'paid') return 'paid';
  if (status === 'partial') return 'partial';
  if (status === 'overdue') return 'overdue';
  if (status === 'cancelled') return 'cancelled';
  return 'pending';
}

interface SupplierBalanceScheduleCardProps {
  supplier: Supplier | null;
  disabled?: boolean;
}

export function SupplierBalanceScheduleCard({ supplier, disabled = false }: SupplierBalanceScheduleCardProps) {
  const queryClient = useQueryClient();
  const supplierId = String(supplier?.id || '');
  const supplierName = String(supplier?.name || 'المورد');
  const supplierBalance = Number(supplier?.balance || 0);
  const [mode, setMode] = useState<'count' | 'amount'>('count');
  const [scheduleAmount, setScheduleAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('3');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [firstDueDate, setFirstDueDate] = useState(todayIso());
  const [intervalDays, setIntervalDays] = useState('7');
  const [roundingStep, setRoundingStep] = useState('100');
  const [note, setNote] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [paymentTarget, setPaymentTarget] = useState<SupplierPaymentScheduleItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('all');
  const [showAppendForm, setShowAppendForm] = useState(false);

  function refreshAccounts() {
    queryClient.invalidateQueries({ queryKey: queryKeys.supplierBalances });
    queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
    if (supplierId) queryClient.invalidateQueries({ queryKey: queryKeys.supplierLedger(supplierId) });
  }

  const scheduleQuery = useQuery({
    queryKey: queryKeys.supplierPaymentSchedule(supplierId),
    queryFn: () => supplierBalanceScheduleApi.list(supplierId),
    enabled: Boolean(supplierId),
  });

  const createMutation = useMutation({
    mutationFn: () => supplierBalanceScheduleApi.create(supplierId, {
      mode,
      scheduleAmount: Number(scheduleAmount || (supplierBalance - summary.remaining) || 0),
      installmentCount: mode === 'count' ? Number(installmentCount || 0) : undefined,
      installmentAmount: mode === 'amount' ? Number(installmentAmount || 0) : undefined,
      firstDueDate,
      intervalDays: Number(intervalDays || 1),
      roundingStep: Number(roundingStep || 1),
      note,
    }),
    onSuccess: (nextRows) => {
      queryClient.setQueryData(queryKeys.supplierPaymentSchedule(supplierId), nextRows);
    },
  });

  const settleMutation = useMutation({
    mutationFn: ({ row, amount, paymentNote: noteText }: { row: SupplierPaymentScheduleItem; amount?: number; paymentNote?: string }) => supplierBalanceScheduleApi.settle(row.id, {
      amount,
      note: noteText || `تسجيل دفع دفعة ${row.installmentNo} من مستحقات ${supplierName}`,
    }),
    onSuccess: (nextRows) => {
      queryClient.setQueryData(queryKeys.supplierPaymentSchedule(supplierId), nextRows);
      refreshAccounts();
      setPaymentTarget(null);
      setPaymentAmount('');
      setPaymentNote('');
    },
  });

  const rows = useMemo(() => scheduleQuery.data || [], [scheduleQuery.data]);
  const filteredRows = useMemo(() => rows.filter((row) => {
    if (scheduleFilter === 'all') return true;
    return normalizeStatusForFilter(row.status) === scheduleFilter;
  }), [rows, scheduleFilter]);
  const filterCounts = useMemo(() => rows.reduce<Record<ScheduleFilter, number>>((acc, row) => {
    acc.all += 1;
    const status = normalizeStatusForFilter(row.status);
    if (status !== 'cancelled') acc[status] += 1;
    return acc;
  }, { all: 0, pending: 0, partial: 0, paid: 0, overdue: 0 }), [rows]);
  const summary = useMemo(() => summarize(rows), [rows]);
  
  const unscheduledBalance = Math.round((supplierBalance - summary.remaining) * 100) / 100;
  const canSchedule = Boolean(supplierId) && unscheduledBalance > 0 && !disabled;
  const nextDue = rows.find((row) => row.status !== 'paid' && row.status !== 'cancelled');

  function openPaymentDialog(row: SupplierPaymentScheduleItem) {
    setPaymentTarget(row);
    setPaymentAmount(String(row.remainingAmount || row.amount || ''));
    setPaymentNote('');
  }

  function toggleRow(rowId: string) {
    setExpandedRows((current) => ({ ...current, [rowId]: !current[rowId] }));
  }

  if (!supplier) {
    return (
      <Card title="جدولة مستحقات المورد" description="اختر موردًا أولًا لعرض أو إنشاء جدول دفعات لمستحقاته.">
        <EmptyState title="لم يتم اختيار مورد" hint="اختر المورد من كشف حساب الموردين حتى تظهر أداة الجدولة." />
      </Card>
    );
  }

  return (
    <Card
      title={`مستحقات المورد: ${supplierName}`}
      description="قسّم رصيد المورد الحالي أو جزءًا منه إلى دفعات مستحقة وتابع المدفوع والمتبقي."
      actions={<span className="nav-pill">{rows.length ? `${rows.length} دفعات` : 'رصيد المورد'}</span>}
    >
      <div className="stats-grid compact-grid">
        <div className="stat-card"><span>رصيد المورد الحالي</span><strong>{formatCurrency(supplierBalance)}</strong></div>
        <div className="stat-card"><span>إجمالي الجدول</span><strong>{formatCurrency(summary.total)}</strong></div>
        <div className="stat-card"><span>مدفوع من الجدول</span><strong>{formatCurrency(summary.paid)}</strong></div>
        <div className="stat-card"><span>متبقي مجدول</span><strong>{formatCurrency(summary.remaining)}</strong></div>
      </div>

      {nextDue ? (
        <div className="supplier-schedule-next-payment">
          <div>
            <span>الدفعة القادمة إلى {supplierName}</span>
            <strong>{formatCurrency(nextDue.remainingAmount || nextDue.amount)}</strong>
            <small>تستحق في {formatDate(nextDue.dueDate)}</small>
          </div>
          <Button type="button" variant="secondary" disabled={disabled || settleMutation.isPending} onClick={() => openPaymentDialog(nextDue)}>تسجيل دفع</Button>
        </div>
      ) : null}

      {canSchedule && (!rows.length || showAppendForm) ? (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <Field label="المبلغ المراد جدولته">
            <input type="number" min="1" max={unscheduledBalance} step="0.01" value={scheduleAmount} onChange={(event) => setScheduleAmount(event.target.value)} placeholder={String(unscheduledBalance || '')} />
          </Field>
          <Field label="طريقة التقسيم">
            <select value={mode} onChange={(event) => setMode(event.target.value as 'count' | 'amount')}>
              <option value="count">حسب عدد الدفعات</option>
              <option value="amount">حسب مبلغ الدفعة</option>
            </select>
          </Field>
          {mode === 'count' ? (
            <Field label="عدد الدفعات"><input type="number" min="1" value={installmentCount} onChange={(event) => setInstallmentCount(event.target.value)} /></Field>
          ) : (
            <Field label="مبلغ كل دفعة"><input type="number" min="1" step="0.01" value={installmentAmount} onChange={(event) => setInstallmentAmount(event.target.value)} /></Field>
          )}
          <Field label="تاريخ أول دفعة"><input type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)} /></Field>
          <Field label="تكرار الاستحقاق كل كام يوم"><input type="number" min="1" value={intervalDays} onChange={(event) => setIntervalDays(event.target.value)} /></Field>
          <Field label="تقريب الدفعات لأقرب"><input type="number" min="1" value={roundingStep} onChange={(event) => setRoundingStep(event.target.value)} /></Field>
          <Field label="ملاحظة"><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثال: اتفاق سداد رصيد المورد" /></Field>
          <div className="field"><span>إنشاء الجدول</span><Button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>جدولة المستحقات</Button></div>
        </div>
      ) : null}

      {canSchedule && rows.length && !showAppendForm ? (
        <div className="surface-note" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>يوجد رصيد غير مجدول بقيمة {formatCurrency(unscheduledBalance)}. يمكنك إضافته كدفعات إضافية.</span>
          <Button type="button" variant="secondary" onClick={() => setShowAppendForm(true)}>إضافة دفعات للرصيد المتبقي</Button>
        </div>
      ) : null}
      
      {!canSchedule && supplierBalance <= 0 ? <div className="surface-note" style={{ marginTop: 12 }}>لا توجد مستحقات موجبة على هذا المورد يمكن جدولتها حاليًا.</div> : null}
      {!canSchedule && supplierBalance > 0 && unscheduledBalance <= 0 ? <div className="surface-note" style={{ marginTop: 12 }}>تمت جدولة جميع مستحقات هذا المورد بالكامل.</div> : null}

      <MutationFeedback isError={createMutation.isError || settleMutation.isError} isSuccess={createMutation.isSuccess || settleMutation.isSuccess} error={createMutation.error || settleMutation.error} errorFallback={((createMutation.error as any)?.message) || ((settleMutation.error as any)?.message) || "تعذر تنفيذ عملية جدولة المورد"} successText="تم تحديث جدول مستحقات المورد." />

      {rows.length ? (
        <div className="supplier-schedule-filter-bar" aria-label="فلترة دفعات المورد">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`supplier-schedule-filter-chip ${scheduleFilter === option.key ? 'supplier-schedule-filter-chip--active' : ''}`}
              onClick={() => setScheduleFilter(option.key)}
            >
              {option.label}
              <span>{filterCounts[option.key]}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="table-wrap supplier-schedule-table-wrap" style={{ marginTop: 12 }}>
        {filteredRows.length ? (
          <table className="supplier-schedule-table">
            <thead><tr><th>#</th><th>الاستحقاق</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>الإجراء</th></tr></thead>
            <tbody>
              {filteredRows.map((row) => {
                const isSettled = row.status === 'paid' || row.status === 'cancelled';
                const payments = row.payments || [];
                const isExpanded = Boolean(expandedRows[row.id]);
                return (
                  <Fragment key={row.id}>
                    <tr
                      className={`supplier-schedule-row ${isExpanded ? 'supplier-schedule-row--expanded' : ''}`}
                      tabIndex={0}
                      onClick={() => toggleRow(row.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleRow(row.id);
                        }
                      }}
                    >
                      <td>
                        <span className="supplier-schedule-installment-label">دفعة {row.installmentNo} {isExpanded ? '▴' : '▾'}</span>
                      </td>
                      <td>{formatDate(row.dueDate)}</td>
                      <td>{formatCurrency(row.amount)}</td>
                      <td className="muted">{formatCurrency(row.paidAmount)}</td>
                      <td><strong>{formatCurrency(row.remainingAmount)}</strong></td>
                      <td><span className={statusClass(row.status)}>{statusLabel(row.status)}</span></td>
                      <td>
                        {isSettled ? (
                          <span className="supplier-schedule-completed-label">مكتملة</span>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={disabled || settleMutation.isPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              openPaymentDialog(row);
                            }}
                          >
                            تسجيل دفع
                          </Button>
                        )}
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="supplier-schedule-details-row">
                        <td colSpan={7}>
                          <div className="supplier-schedule-details-panel">
                            <div className="supplier-schedule-details-heading">
                              <strong>سجل دفع الدفعة {row.installmentNo}</strong>
                              <span>{payments.length ? `${payments.length} عملية` : 'لا يوجد دفع مسجل'}</span>
                            </div>
                            {payments.length ? (
                              <div className="supplier-schedule-payment-log">
                                {payments.map((payment) => (
                                  <div key={payment.id} className="supplier-schedule-payment-log-item">
                                    <strong>{formatCurrency(payment.amount)}</strong>
                                    <span>{formatDateTime(payment.createdAt)}</span>
                                    <span>تم تسجيل الدفع بواسطة المستخدم: {payment.createdByName || payment.createdBy || '—'}</span>
                                    {payment.note ? <em>ملاحظة: {payment.note}</em> : null}
                                  </div>
                                ))}
                              </div>
                            ) : <div className="muted small">لم يتم تسجيل أي دفع على هذه الدفعة بعد.</div>}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        ) : rows.length ? (
          <EmptyState title="لا توجد دفعات مطابقة للفلتر" hint="غيّر فلتر الحالة لعرض باقي دفعات المورد." />
        ) : (
          <EmptyState title="لا يوجد جدول مستحقات لهذا المورد" hint="استخدم نموذج الجدولة لتقسيم رصيد المورد أو جزء منه على دفعات." />
        )}
      </div>

      {paymentTarget ? (
        <div className="dialog-overlay supplier-payment-dialog-overlay" role="presentation">
          <div className="dialog-shell supplier-payment-dialog" role="dialog" aria-modal="true" aria-label={`تأكيد تسليم الدفعة إلى ${supplierName}`}>
            <div className="dialog-card supplier-payment-dialog-card">
              <div className="supplier-payment-dialog-header supplier-payment-dialog-header--centered">
                <button type="button" className="supplier-payment-dialog-close" onClick={() => setPaymentTarget(null)} disabled={settleMutation.isPending} aria-label="إغلاق">×</button>
                <div>
                  <h3>تأكيد تسليم الدفعة إلى {supplierName}</h3>
                  <p className="muted">دفعة {paymentTarget.installmentNo} — المتبقي {formatCurrency(paymentTarget.remainingAmount)}</p>
                </div>
              </div>
              <div className="form-grid supplier-payment-dialog-form">
                <Field label="المبلغ المدفوع">
                  <input type="number" min="0.01" step="0.01" max={paymentTarget.remainingAmount} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
                </Field>
                <Field label="ملاحظات اختيارية">
                  <textarea rows={3} value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="مثال: تم التسليم لمندوب المورد / رقم إيصال / ملاحظة داخلية" />
                </Field>
              </div>
              <div className="actions compact-actions supplier-payment-dialog-actions">
                <Button type="button" onClick={() => settleMutation.mutate({ row: paymentTarget, amount: paymentAmount ? Number(paymentAmount) : undefined, paymentNote })} disabled={settleMutation.isPending}>تأكيد تسليم الدفعة للمورد</Button>
                <Button type="button" variant="secondary" onClick={() => setPaymentTarget(null)} disabled={settleMutation.isPending}>إلغاء</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
