import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { EmptyState } from '@/shared/ui/empty-state';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { purchasePaymentScheduleApi, type SupplierPaymentScheduleItem } from '@/features/purchases/api/purchase-payment-schedule.api';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Purchase } from '@/types/domain';

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

function buildScheduleSummary(rows: SupplierPaymentScheduleItem[]) {
  return rows.reduce((summary, row) => ({
    total: summary.total + Number(row.amount || 0),
    paid: summary.paid + Number(row.paidAmount || 0),
    remaining: summary.remaining + Number(row.remainingAmount || 0),
    overdue: summary.overdue + (row.status === 'overdue' ? 1 : 0),
  }), { total: 0, paid: 0, remaining: 0, overdue: 0 });
}

interface PurchasePaymentScheduleCardProps {
  purchase: Purchase;
}

export function PurchasePaymentScheduleCard({ purchase }: PurchasePaymentScheduleCardProps) {
  const queryClient = useQueryClient();
  const purchaseId = String(purchase.id || '');
  const supplierId = String(purchase.supplierId || '');
  const isCreditPurchase = purchase.paymentType === 'credit';
  const [mode, setMode] = useState<'count' | 'amount'>('count');
  const [installmentCount, setInstallmentCount] = useState('3');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [firstDueDate, setFirstDueDate] = useState(todayIso());
  const [intervalDays, setIntervalDays] = useState('7');
  const [roundingStep, setRoundingStep] = useState('100');
  const [note, setNote] = useState('');
  const [settleAmounts, setSettleAmounts] = useState<Record<string, string>>({});

  function refreshFinancialQueries() {
    queryClient.invalidateQueries({ queryKey: queryKeys.supplierBalances });
    queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
    queryClient.invalidateQueries({ queryKey: queryKeys.purchases });
    if (supplierId) queryClient.invalidateQueries({ queryKey: queryKeys.supplierLedger(supplierId) });
  }

  const scheduleQuery = useQuery({
    queryKey: queryKeys.purchasePaymentSchedule(purchaseId),
    queryFn: () => purchasePaymentScheduleApi.list(purchaseId),
    enabled: Boolean(purchaseId),
  });

  const createMutation = useMutation({
    mutationFn: () => purchasePaymentScheduleApi.create(purchaseId, {
      mode,
      installmentCount: mode === 'count' ? Number(installmentCount || 0) : undefined,
      installmentAmount: mode === 'amount' ? Number(installmentAmount || 0) : undefined,
      firstDueDate,
      intervalDays: Number(intervalDays || 1),
      roundingStep: Number(roundingStep || 1),
      note,
    }),
    onSuccess: (nextRows) => {
      queryClient.setQueryData(queryKeys.purchasePaymentSchedule(purchaseId), nextRows);
    },
  });

  const settleMutation = useMutation({
    mutationFn: ({ row, amount }: { row: SupplierPaymentScheduleItem; amount?: number }) => purchasePaymentScheduleApi.settle(row.id, {
      amount,
      note: `تسجيل دفع دفعة ${row.installmentNo} من فاتورة ${purchase.docNo || purchase.id}`,
      branchId: Number(purchase.branchId || 0) || undefined,
      locationId: Number(purchase.locationId || 0) || undefined,
    }),
    onSuccess: (nextRows) => {
      queryClient.setQueryData(queryKeys.purchasePaymentSchedule(purchaseId), nextRows);
      refreshFinancialQueries();
      setSettleAmounts({});
    },
  });

  const rows = useMemo(() => scheduleQuery.data || [], [scheduleQuery.data]);
  const summary = useMemo(() => buildScheduleSummary(rows), [rows]);
  const canCreateSchedule = purchase.status !== 'cancelled' && isCreditPurchase && Boolean(supplierId) && Number(purchase.total || 0) > 0;

  return (
    <FormSection
      className="purchase-payment-schedule-card"
      title="جدولة دفعات المورد"
      description="قسّم فاتورة المورد الآجلة إلى دفعات مستحقة، وتابع المدفوع والمتبقي من نفس الفاتورة."
      actions={<span className="nav-pill">{rows.length ? `${rows.length} دفعات` : 'بدون جدول'}</span>}
    >
      <div className="stats-grid compact-grid">
        <div className="stat-card"><span>إجمالي الجدول</span><strong>{formatCurrency(summary.total)}</strong></div>
        <div className="stat-card"><span>مدفوع</span><strong>{formatCurrency(summary.paid)}</strong></div>
        <div className="stat-card"><span>متبقي</span><strong>{formatCurrency(summary.remaining || (isCreditPurchase ? Number(purchase.total || 0) : 0))}</strong></div>
        <div className="stat-card"><span>متأخر</span><strong>{summary.overdue}</strong></div>
      </div>

      {!isCreditPurchase ? (
        <div className="surface-note" style={{ marginTop: 12 }}>
          جدولة الدفعات متاحة لفواتير المورد الآجلة فقط، لأن الفاتورة النقدية يتم تسجيل خروجها من الخزينة مباشرة عند إنشاء الفاتورة.
        </div>
      ) : null}

      {canCreateSchedule ? (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <Field label="طريقة التقسيم">
            <select value={mode} onChange={(event) => setMode(event.target.value as 'count' | 'amount')}>
              <option value="count">حسب عدد الدفعات</option>
              <option value="amount">حسب مبلغ الدفعة</option>
            </select>
          </Field>
          {mode === 'count' ? (
            <Field label="عدد الدفعات">
              <input type="number" min="1" value={installmentCount} onChange={(event) => setInstallmentCount(event.target.value)} />
            </Field>
          ) : (
            <Field label="مبلغ كل دفعة">
              <input type="number" min="1" step="0.01" value={installmentAmount} onChange={(event) => setInstallmentAmount(event.target.value)} />
            </Field>
          )}
          <Field label="تاريخ أول دفعة"><input type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)} /></Field>
          <Field label="تكرار الاستحقاق كل كام يوم"><input type="number" min="1" value={intervalDays} onChange={(event) => setIntervalDays(event.target.value)} /></Field>
          <Field label="تقريب الدفعات لأقرب"><input type="number" min="1" value={roundingStep} onChange={(event) => setRoundingStep(event.target.value)} /></Field>
          <Field label="ملاحظة"><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثال: اتفاق دفع مع المورد" /></Field>
          <div className="field"><span>إنشاء الجدول</span><Button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>{rows.length ? 'إعادة جدولة الدفعات' : 'جدولة الدفعات'}</Button></div>
        </div>
      ) : null}

      <MutationFeedback isError={createMutation.isError || settleMutation.isError} isSuccess={createMutation.isSuccess || settleMutation.isSuccess} error={createMutation.error || settleMutation.error} errorFallback="تعذر تنفيذ عملية الدفعات" successText="تم تحديث جدول دفعات المورد." />

      <div className="table-wrap" style={{ marginTop: 12 }}>
        {rows.length ? (
          <table>
            <thead><tr><th>#</th><th>الاستحقاق</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>تسجيل دفع</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const isSettled = row.status === 'paid' || row.status === 'cancelled';
                const amountValue = settleAmounts[row.id] ?? '';
                return (
                  <tr key={row.id}>
                    <td>{row.installmentNo}</td>
                    <td>{formatDate(row.dueDate)}</td>
                    <td>{formatCurrency(row.amount)}</td>
                    <td>{formatCurrency(row.paidAmount)}</td>
                    <td>{formatCurrency(row.remainingAmount)}</td>
                    <td>{statusLabel(row.status)}</td>
                    <td><div className="actions compact-actions"><input type="number" min="0.01" step="0.01" value={amountValue} onChange={(event) => setSettleAmounts((current) => ({ ...current, [row.id]: event.target.value }))} placeholder={String(row.remainingAmount || '')} disabled={isSettled || !isCreditPurchase} style={{ maxWidth: 110 }} /><Button type="button" variant="secondary" disabled={isSettled || !isCreditPurchase || settleMutation.isPending} onClick={() => settleMutation.mutate({ row, amount: amountValue ? Number(amountValue) : undefined })}>دفع</Button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState title="لا يوجد جدول دفعات لهذه الفاتورة" hint={isCreditPurchase ? 'اختر طريقة التقسيم وأنشئ جدول دفعات للمورد.' : 'حوّل الفاتورة إلى آجلة عند إنشائها إذا كان سيتم سدادها على دفعات.'} />
        )}
      </div>
    </FormSection>
  );
}
