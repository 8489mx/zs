import { useMemo, useState } from 'react';
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

interface SupplierBalanceScheduleCardProps {
  supplier: Supplier | null;
  disabled?: boolean;
}

export function SupplierBalanceScheduleCard({ supplier, disabled = false }: SupplierBalanceScheduleCardProps) {
  const queryClient = useQueryClient();
  const supplierId = String(supplier?.id || '');
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
      scheduleAmount: Number(scheduleAmount || supplierBalance || 0),
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
      note: noteText || `تسجيل دفع دفعة ${row.installmentNo} من مستحقات ${supplier?.name || 'المورد'}`,
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
  const summary = useMemo(() => summarize(rows), [rows]);
  const canSchedule = Boolean(supplierId) && supplierBalance > 0 && !disabled;
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
      title="جدولة مستحقات المورد"
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
        <div className="surface-note" style={{ marginTop: 12 }}>
          <strong>الدفعة القادمة:</strong> {formatCurrency(nextDue.remainingAmount || nextDue.amount)} مستحقة في {formatDate(nextDue.dueDate)}.
          <Button type="button" variant="secondary" style={{ marginInlineStart: 8 }} disabled={disabled || settleMutation.isPending} onClick={() => openPaymentDialog(nextDue)}>تسجيل دفع</Button>
        </div>
      ) : null}

      {canSchedule && !rows.length ? (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <Field label="المبلغ المراد جدولته">
            <input type="number" min="1" max={supplierBalance} step="0.01" value={scheduleAmount} onChange={(event) => setScheduleAmount(event.target.value)} placeholder={String(supplierBalance || '')} />
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

      {canSchedule && rows.length ? <div className="surface-note" style={{ marginTop: 12 }}>تم إنشاء جدول مستحقات لهذا المورد. لا يمكن إعادة الجدولة بعد تسجيل أي دفعة، ويمكن تعديل الجدولة لاحقًا من تطوير مستقل إذا احتجنا.</div> : null}
      {!canSchedule ? <div className="surface-note" style={{ marginTop: 12 }}>لا توجد مستحقات موجبة على هذا المورد يمكن جدولتها حاليًا.</div> : null}

      <MutationFeedback isError={createMutation.isError || settleMutation.isError} isSuccess={createMutation.isSuccess || settleMutation.isSuccess} error={createMutation.error || settleMutation.error} errorFallback="تعذر تنفيذ عملية جدولة المورد" successText="تم تحديث جدول مستحقات المورد." />

      <div className="table-wrap" style={{ marginTop: 12 }}>
        {rows.length ? (
          <table>
            <thead><tr><th>#</th><th>الاستحقاق</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>الإجراء</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const isSettled = row.status === 'paid' || row.status === 'cancelled';
                const payments = row.payments || [];
                return (
                  <>
                    <tr key={row.id}>
                      <td><button type="button" className="link-button" onClick={() => toggleRow(row.id)}>دفعة {row.installmentNo}</button></td>
                      <td>{formatDate(row.dueDate)}</td>
                      <td>{formatCurrency(row.amount)}</td>
                      <td>{formatCurrency(row.paidAmount)}</td>
                      <td>{formatCurrency(row.remainingAmount)}</td>
                      <td>{statusLabel(row.status)}</td>
                      <td><Button type="button" variant="secondary" disabled={isSettled || disabled || settleMutation.isPending} onClick={() => openPaymentDialog(row)}>تسجيل دفع</Button></td>
                    </tr>
                    {expandedRows[row.id] ? (
                      <tr key={`${row.id}-details`}>
                        <td colSpan={7}>
                          <div className="surface-note">
                            <strong>سجل دفع الدفعة {row.installmentNo}</strong>
                            {payments.length ? (
                              <div className="list-stack" style={{ marginTop: 8 }}>
                                {payments.map((payment) => (
                                  <div key={payment.id} className="list-row stacked-row">
                                    <div>
                                      <strong>{formatCurrency(payment.amount)}</strong>
                                      <div className="muted small">{formatDateTime(payment.createdAt)} · بواسطة {payment.createdByName || payment.createdBy || '—'}</div>
                                      {payment.note ? <div className="muted small">ملاحظة: {payment.note}</div> : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : <div className="muted small" style={{ marginTop: 8 }}>لم يتم تسجيل أي دفع على هذه الدفعة بعد.</div>}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState title="لا يوجد جدول مستحقات لهذا المورد" hint="استخدم نموذج الجدولة لتقسيم رصيد المورد أو جزء منه على دفعات." />
        )}
      </div>

      {paymentTarget ? (
        <div className="modal-backdrop" role="dialog" aria-label="تأكيد تسليم الدفعة للمورد">
          <div className="modal-card">
            <h3>تأكيد تسليم الدفعة للمورد</h3>
            <p className="muted">دفعة {paymentTarget.installmentNo} — المتبقي {formatCurrency(paymentTarget.remainingAmount)}</p>
            <Field label="المبلغ المدفوع">
              <input type="number" min="0.01" step="0.01" max={paymentTarget.remainingAmount} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
            </Field>
            <Field label="ملاحظات اختيارية">
              <textarea rows={3} value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="مثال: تم التسليم لمندوب المورد / رقم إيصال / ملاحظة داخلية" />
            </Field>
            <div className="actions compact-actions" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
              <Button type="button" onClick={() => settleMutation.mutate({ row: paymentTarget, amount: paymentAmount ? Number(paymentAmount) : undefined, paymentNote })} disabled={settleMutation.isPending}>تأكيد تسليم الدفعة للمورد</Button>
              <Button type="button" variant="secondary" onClick={() => setPaymentTarget(null)} disabled={settleMutation.isPending}>إلغاء</Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
