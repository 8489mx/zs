import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { EmptyState } from '@/shared/ui/empty-state';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { supplierBalanceScheduleApi, type SupplierPaymentScheduleItem } from '@/features/accounts/api/supplier-balance-schedule.api';
import { formatCurrency, formatDate, formatWhatsAppNumber } from '@/lib/format';
import { openWhatsApp } from '@/lib/whatsapp';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import type { Supplier } from '@/types/domain';

function isIncompleteSchedule(row: SupplierPaymentScheduleItem) {
  return row.status !== 'paid' && row.status !== 'cancelled' && Number(row.remainingAmount || 0) > 0;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function SupplierQuickPaymentDialog() {
  const queryClient = useQueryClient();
  const { data: settings } = useSettingsQuery();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [successReceipt, setSuccessReceipt] = useState<{ row: SupplierPaymentScheduleItem; supplier: Supplier; amountPaid: number } | null>(null);

  const suppliersQuery = useQuery({
    queryKey: [...queryKeys.suppliers, 'debt-lookup'],
    queryFn: () => supplierBalanceScheduleApi.listSuppliersWithDebt(),
    enabled: isOpen,
  });

  const suppliers = useMemo(() => suppliersQuery.data || [], [suppliersQuery.data]);
  const selectedSupplier = useMemo(() => suppliers.find((supplier) => String(supplier.id) === selectedSupplierId) || null, [suppliers, selectedSupplierId]);

  const scheduleQuery = useQuery({
    queryKey: queryKeys.supplierPaymentSchedule(selectedSupplierId),
    queryFn: () => supplierBalanceScheduleApi.list(selectedSupplierId),
    enabled: isOpen && Boolean(selectedSupplierId),
  });

  const schedules = useMemo(() => scheduleQuery.data || [], [scheduleQuery.data]);
  const payableSchedules = useMemo(() => schedules.filter(isIncompleteSchedule), [schedules]);
  const selectedSchedule = useMemo(() => payableSchedules.find((row) => row.id === selectedScheduleId) || null, [payableSchedules, selectedScheduleId]);

  function resetPaymentFields() {
    setSelectedScheduleId('');
    setPaymentAmount('');
    setPaymentNote('');
  }

  function closeDialog() {
    setIsOpen(false);
    setSelectedSupplierId('');
    setSuccessReceipt(null);
    resetPaymentFields();
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = String(event.key || '').toLowerCase();
      const isSupplierPaymentShortcut = event.ctrlKey
        && event.altKey
        && (event.code === 'KeyD' || key === 'd' || event.key === 'د');

      if (isSupplierPaymentShortcut) {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedSupplierId && suppliers.length === 1) {
      setSelectedSupplierId(String(suppliers[0].id));
    }
  }, [isOpen, selectedSupplierId, suppliers]);

  useEffect(() => {
    resetPaymentFields();
  }, [selectedSupplierId]);

  useEffect(() => {
    if (!selectedSchedule && payableSchedules.length === 1) {
      const onlySchedule = payableSchedules[0];
      setSelectedScheduleId(onlySchedule.id);
      setPaymentAmount(String(onlySchedule.remainingAmount || onlySchedule.amount || ''));
    }
  }, [payableSchedules, selectedSchedule]);

  const settleMutation = useMutation({
    mutationFn: () => {
      if (!selectedSchedule) throw new Error('اختر دفعة أولًا');
      return supplierBalanceScheduleApi.settle(selectedSchedule.id, {
        amount: paymentAmount ? Number(paymentAmount) : undefined,
        note: paymentNote || `تسجيل سريع لدفعة ${selectedSchedule.installmentNo} إلى ${selectedSupplier?.name || 'المورد'}`,
      });
    },
    onSuccess: (nextRows) => {
      if (selectedSupplierId) {
        queryClient.setQueryData(queryKeys.supplierPaymentSchedule(selectedSupplierId), nextRows);
        queryClient.invalidateQueries({ queryKey: queryKeys.supplierBalances });
        queryClient.invalidateQueries({ queryKey: queryKeys.treasury });
        queryClient.invalidateQueries({ queryKey: queryKeys.cashierShifts });
        queryClient.invalidateQueries({ queryKey: queryKeys.supplierLedger(selectedSupplierId) });
      }
      
      if (selectedSchedule && selectedSupplier) {
        setSuccessReceipt({
          row: selectedSchedule,
          supplier: selectedSupplier,
          amountPaid: paymentAmount ? Number(paymentAmount) : (selectedSchedule.remainingAmount || 0),
        });
      }

      resetPaymentFields();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay supplier-payment-dialog-overlay" role="presentation">
      {!successReceipt ? (
        <div className="dialog-shell supplier-payment-dialog supplier-quick-payment-dialog" role="dialog" aria-modal="true" aria-label="تسجيل دفعة مورد سريعة">
          <div className="dialog-card supplier-payment-dialog-card supplier-quick-payment-card">
          <div className="supplier-payment-dialog-header supplier-payment-dialog-header--centered">
            <button type="button" className="supplier-payment-dialog-close" onClick={closeDialog} disabled={settleMutation.isPending} aria-label="إغلاق">×</button>
            <div>
              <h3>تسجيل دفعة مورد</h3>
              <p className="muted">اختصار Ctrl + Alt + D — اختر المورد والدفعة وسجّل المبلغ بسرعة.</p>
            </div>
          </div>

          <div className="supplier-quick-payment-grid">
            <Field label="المورد">
              <select
                value={selectedSupplierId}
                onChange={(event) => setSelectedSupplierId(event.target.value)}
                disabled={suppliersQuery.isLoading || settleMutation.isPending}
              >
                <option value="">اختر المورد</option>
                {suppliers.map((supplier: Supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} — {formatCurrency(Number(supplier.balance || 0))}
                  </option>
                ))}
              </select>
            </Field>
            {selectedSupplier ? (
              <div className="supplier-quick-payment-summary">
                <span>رصيد المورد</span>
                <strong>{formatCurrency(Number(selectedSupplier.balance || 0))}</strong>
              </div>
            ) : null}
          </div>

          {selectedSupplierId ? (
            <div className="supplier-quick-payment-schedules">
              <div className="supplier-quick-payment-section-title">
                <strong>الدفعات المستحقة</strong>
                <span>{payableSchedules.length} دفعات غير مكتملة</span>
              </div>
              {scheduleQuery.isLoading ? (
                <div className="surface-note">جاري تحميل جدول الدفعات...</div>
              ) : payableSchedules.length ? (
                <div className="supplier-quick-payment-list">
                  {payableSchedules.map((row) => {
                    const isSelected = row.id === selectedScheduleId;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        className={`supplier-quick-payment-row ${isSelected ? 'supplier-quick-payment-row--active' : ''}`}
                        onClick={() => {
                          setSelectedScheduleId(row.id);
                          setPaymentAmount(String(row.remainingAmount || row.amount || ''));
                        }}
                      >
                        <span>دفعة {row.installmentNo}</span>
                        <strong>{formatCurrency(row.remainingAmount || row.amount)}</strong>
                        <small>{formatDate(row.dueDate)}</small>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="لا توجد دفعات مفتوحة لهذا المورد" hint="إما أن الجدولة غير موجودة أو كل الدفعات مكتملة." />
              )}
            </div>
          ) : null}

          {selectedSchedule ? (
            <div className="supplier-quick-payment-confirm-panel">
              <div className="supplier-quick-payment-target">
                <strong>تأكيد تسليم الدفعة إلى {selectedSupplier?.name || 'المورد'}</strong>
                <span>دفعة {selectedSchedule.installmentNo} — المتبقي {formatCurrency(selectedSchedule.remainingAmount)}</span>
                {selectedSchedule.payments?.length ? <small>آخر تسجيل: {formatDateTime(selectedSchedule.payments[selectedSchedule.payments.length - 1]?.createdAt)}</small> : null}
              </div>
              <Field label="المبلغ المدفوع">
                <input type="number" min="0.01" step="0.01" max={selectedSchedule.remainingAmount} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
              </Field>
              <Field label="ملاحظات اختيارية">
                <textarea rows={3} value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="مثال: تم التسليم لمندوب المورد / رقم إيصال / ملاحظة داخلية" />
              </Field>
              <div className="actions compact-actions supplier-payment-dialog-actions">
                <Button type="button" onClick={() => settleMutation.mutate()} disabled={settleMutation.isPending}>تأكيد تسليم الدفعة للمورد</Button>
                <Button type="button" variant="secondary" onClick={closeDialog} disabled={settleMutation.isPending}>إغلاق</Button>
              </div>
            </div>
          ) : null}

          <MutationFeedback isError={settleMutation.isError} isSuccess={false} error={settleMutation.error} errorFallback="تعذر تسجيل دفعة المورد" successText="" />
        </div>
      </div>
      ) : null}
      
      {successReceipt ? (
        <div className="dialog-shell supplier-payment-dialog" role="dialog" aria-modal="true" aria-label="تم الدفع بنجاح" style={{ zIndex: 110 }}>
          <div className="dialog-card supplier-payment-dialog-card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h3 style={{ marginBottom: '0.5rem' }}>تم تسجيل الدفعة بنجاح</h3>
            <p className="muted" style={{ marginBottom: '1.5rem' }}>
              تم سداد {formatCurrency(successReceipt.amountPaid)} لصالح {successReceipt.supplier.name}.
            </p>
            
            <div className="actions compact-actions supplier-payment-dialog-actions" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button 
                type="button" 
                onClick={() => {
                  const rawPhone = successReceipt.supplier.phone || ''; 
                  const phone = formatWhatsAppNumber(rawPhone);
                  const currentBalance = Number(successReceipt.supplier.balance || 0);
                  const newBalance = Math.max(0, currentBalance - successReceipt.amountPaid);
                  const text = `مرحباً ${successReceipt.supplier.name}،\nتم تسجيل استلام دفعة نقدية بقيمة ${formatCurrency(successReceipt.amountPaid)} (تسوية لدفعة رقم ${successReceipt.row.installmentNo}).\nإجمالي الرصيد المتبقي لكم هو ${formatCurrency(newBalance)}.\nشكراً لتعاملكم.`;
                  const encodedText = encodeURIComponent(text);
                  let url = `https://wa.me/${phone}?text=${encodedText}`;
                  if (settings?.whatsappLinkMode === 'web') {
                    url = `https://web.whatsapp.com/send/?phone=${phone}&text=${encodedText}`;
                  } else if (settings?.whatsappLinkMode === 'app') {
                    url = `whatsapp://send?phone=${phone}&text=${encodedText}`;
                  }
                  openWhatsApp(url);
                  closeDialog();
                }}
              >
                إرسال للمورد عبر واتساب 💬
              </Button>
              <Button type="button" variant="secondary" onClick={closeDialog}>إغلاق النافذة</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
