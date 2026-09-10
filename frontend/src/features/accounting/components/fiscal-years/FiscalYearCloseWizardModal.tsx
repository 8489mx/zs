import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  XIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  LockIcon,
  ScaleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@/shared/components/icons/AppIcons';
import { fiscalYearsApi } from '../../api/fiscal-years.api';
import type { FiscalYearRecord } from '../../types/fiscal-years.types';

export interface FiscalYearCloseWizardModalProps {
  open: boolean;
  onClose: () => void;
  fiscalYear: FiscalYearRecord | null;
  onClosed?: () => void;
}

export function FiscalYearCloseWizardModal({
  open,
  onClose,
  fiscalYear,
  onClosed,
}: FiscalYearCloseWizardModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch preview data for the fiscal year
  const previewQuery = useQuery({
    queryKey: ['accounting', 'fiscal-years', fiscalYear?.id, 'preview'],
    queryFn: () => {
      if (!fiscalYear) throw new Error('No fiscal year selected');
      return fiscalYearsApi.previewClose(fiscalYear.id);
    },
    enabled: open && !!fiscalYear,
  });

  useEffect(() => {
    if (open) {
      setStep(1);
      setNotes('');
      setErrorMessage(null);
    }
  }, [open, fiscalYear]);

  const closeMutation = useMutation({
    mutationFn: () => {
      if (!fiscalYear) throw new Error('No fiscal year selected');
      return fiscalYearsApi.executeClose(fiscalYear.id, {
        notes,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'settings'] });
      if (onClosed) onClosed();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'حدث خطأ أثناء تنفيذ إقفال السنة المالية.');
    },
  });

  if (!open || !fiscalYear) return null;

  const preview = previewQuery.data;
  const isLoading = previewQuery.isLoading;

  const handleNext = () => {
    setErrorMessage(null);
    if (step === 1) {
      if (!preview?.canClose) {
        setErrorMessage(preview?.blockReason || 'لا يمكن المتابعة لوجود موانع محاسبية.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePrev = () => {
    setErrorMessage(null);
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleExecute = () => {
    setErrorMessage(null);
    closeMutation.mutate();
  };

  return (
    <DialogShell isOpen={open} onClose={onClose} size="xl">
      {/* Header */}
      <div className="standard-dialog-header">
        <div>
          <h2 className="standard-dialog-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ScaleIcon size={22} color="#170e5e" />
            <span>معالج إقفال السنة المالية وترحيل الأرباح: {fiscalYear.name}</span>
          </h2>
          <p className="standard-dialog-subtitle">
            الفترة من {fiscalYear.start_date} إلى {fiscalYear.end_date}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="standard-dialog-close-btn"
          aria-label="إغلاق"
        >
          <XIcon size={18} />
        </button>
      </div>

      {/* Step Indicator Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          padding: '12px 20px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: step === 1 ? '#ffffff' : 'transparent',
            border: step === 1 ? '1px solid #170e5e' : '1px solid transparent',
            color: step === 1 ? '#170e5e' : '#64748b',
            fontWeight: step === 1 ? 700 : 500,
            fontSize: '12px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: step === 1 ? '#170e5e' : '#e2e8f0',
              color: step === 1 ? '#ffffff' : '#64748b',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            1
          </span>
          <span>1. التدقيق والفحص المالي</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: step === 2 ? '#ffffff' : 'transparent',
            border: step === 2 ? '1px solid #170e5e' : '1px solid transparent',
            color: step === 2 ? '#170e5e' : '#64748b',
            fontWeight: step === 2 ? 700 : 500,
            fontSize: '12px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: step === 2 ? '#170e5e' : '#e2e8f0',
              color: step === 2 ? '#ffffff' : '#64748b',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            2
          </span>
          <span>2. محاكاة قيد الإقفال والتصفير</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: step === 3 ? '#ffffff' : 'transparent',
            border: step === 3 ? '1px solid #170e5e' : '1px solid transparent',
            color: step === 3 ? '#170e5e' : '#64748b',
            fontWeight: step === 3 ? 700 : 500,
            fontSize: '12px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: step === 3 ? '#170e5e' : '#e2e8f0',
              color: step === 3 ? '#ffffff' : '#64748b',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            3
          </span>
          <span>3. التأكيد النهائي وقفل الفترة</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="standard-dialog-body" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13px',
            }}
          >
            <AlertCircleIcon size={18} color="#b91c1c" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>جاري فحص وتدقيق الحسابات والقيود اليومية للسنة المالية...</div>
          </div>
        ) : !preview ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#b91c1c' }}>
            تعذر تحميل بيانات معاينة الإقفال للسنة المالية.
          </div>
        ) : (
          <>
            {/* STEP 1: AUDIT & SUMMARY */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Audit Checklist Box */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                    نتائج الفحص والتدقيق المالي قبل الإقفال
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Unposted entries check */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: preview.unpostedEntriesCount === 0 ? '#f0fdf4' : '#fef2f2',
                        border: preview.unpostedEntriesCount === 0 ? '1px solid #bbf7d0' : '1px solid #fecaca',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {preview.unpostedEntriesCount === 0 ? (
                          <CheckCircleIcon size={20} color="#16a34a" />
                        ) : (
                          <AlertTriangleIcon size={20} color="#dc2626" />
                        )}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: preview.unpostedEntriesCount === 0 ? '#166534' : '#991b1b' }}>
                            حالة القيود اليومية (مسودات vs مرحلة)
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569' }}>
                            {preview.unpostedEntriesCount === 0
                              ? 'جميع القيود اليومية في هذه السنة مرحلة بالكامل ولا توجد مسودات معلقة.'
                              : `يوجد عدد ${preview.unpostedEntriesCount} قيد مسودة غير مرحل. يجب ترحيل جميع القيود أو حذفها قبل المتابعة.`}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: preview.unpostedEntriesCount === 0 ? '#dcfce7' : '#fee2e2',
                          color: preview.unpostedEntriesCount === 0 ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {preview.unpostedEntriesCount === 0 ? 'سليم جاهز' : 'مطلوب إجراء'}
                      </span>
                    </div>

                    {/* Retained earnings account check */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: preview.retainedEarningsAccount ? '#f0fdf4' : '#fef2f2',
                        border: preview.retainedEarningsAccount ? '1px solid #bbf7d0' : '1px solid #fecaca',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {preview.retainedEarningsAccount ? (
                          <CheckCircleIcon size={20} color="#16a34a" />
                        ) : (
                          <AlertTriangleIcon size={20} color="#dc2626" />
                        )}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: preview.retainedEarningsAccount ? '#166534' : '#991b1b' }}>
                            حساب الأرباح المحتجزة / المبقاة للترحيل
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569' }}>
                            {preview.retainedEarningsAccount
                              ? `تم تحديد الحساب [${preview.retainedEarningsAccount.code} - ${preview.retainedEarningsAccount.name_ar}] لاستقبال صافي الربح/الخسارة.`
                              : 'لم يتم العثور على حساب أرباح محتجزة (3200) في شجرة الحسابات.'}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: preview.retainedEarningsAccount ? '#dcfce7' : '#fee2e2',
                          color: preview.retainedEarningsAccount ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {preview.retainedEarningsAccount ? 'معتمد' : 'غير متوفر'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                      إجمالي الإيرادات (المبيعات والإيرادات الأخرى)
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>
                      {formatCurrency(preview.totalRevenue)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      {preview.revenueAccounts.length} حساب إيرادات نشط
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                      إجمالي المصروفات (التشغيلية وتكلفة البضاعة)
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#b91c1c' }}>
                      {formatCurrency(preview.totalExpense)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      {preview.expenseAccounts.length} حساب مصروفات نشط
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: preview.isProfit ? '#f0fdf4' : '#fef2f2',
                      border: preview.isProfit ? '1px solid #bbf7d0' : '1px solid #fecaca',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: preview.isProfit ? '#166534' : '#991b1b', fontWeight: 600, marginBottom: '6px' }}>
                      {preview.isProfit ? 'صافي أرباح السنة المالية' : 'صافي خسائر السنة المالية'}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: preview.isProfit ? '#15803d' : '#b91c1c' }}>
                      {formatCurrency(Math.abs(preview.netProfitLoss))}
                    </div>
                    <div style={{ fontSize: '11px', color: preview.isProfit ? '#166534' : '#991b1b', marginTop: '4px' }}>
                      {preview.isProfit ? 'ترحيل دائن للأرباح المحتجزة' : 'ترحيل مدين (تخفيض) للأرباح المحتجزة'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SIMULATED CLOSING JOURNAL ENTRY TABLE */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #dbeafe',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#1e40af',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ScaleIcon size={18} color="#1d4ed8" />
                    <span>
                      معاينة قيد الإقفال السنوي المتزن: سيتم تصفير جميع أرصدة حسابات النتيجة (قائمة الدخل) وترحيل الفارق إلى حساب الأرباح المحتجزة.
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>
                    عدد الأسطر: {preview.proposedClosingLines.length}
                  </span>
                </div>

                {/* Closing Entry Table */}
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>كود الحساب</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>اسم الحساب</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>البيان والتوجيه المحاسبي</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'left' }}>مدين (Debit)</th>
                        <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'left' }}>دائن (Credit)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.proposedClosingLines.map((line, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                          }}
                        >
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#170e5e', fontFamily: 'monospace' }}>
                            {line.accountCode}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>
                            {line.accountName}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#64748b' }}>
                            {line.description}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: line.debit > 0 ? 700 : 400, color: line.debit > 0 ? '#0f172a' : '#94a3b8' }}>
                            {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: line.credit > 0 ? 700 : 400, color: line.credit > 0 ? '#0f172a' : '#94a3b8' }}>
                            {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                        <td colSpan={3} style={{ padding: '10px 12px', color: '#0f172a' }}>
                          إجمالي طرفي القيد (تطابق تام بنسبة 100%)
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'left', color: '#0f172a' }}>
                          {formatCurrency(preview.proposedClosingLines.reduce((sum, l) => sum + l.debit, 0))}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'left', color: '#0f172a' }}>
                          {formatCurrency(preview.proposedClosingLines.reduce((sum, l) => sum + l.credit, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* STEP 3: FINAL CONFIRMATION & PERIOD LOCK */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    display: 'flex',
                    gap: '12px',
                  }}
                >
                  <LockIcon size={24} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#78350f', marginBottom: '6px' }}>
                      التأكيد النهائي وتأمين الفترة المحاسبية
                    </div>
                    <div style={{ fontSize: '13px', color: '#92400e', lineHeight: 1.6 }}>
                      عند الضغط على زر «تنفيذ الإقفال النهائي»، سيقوم النظام بالآتي:
                      <ol style={{ margin: '6px 0 0 0', paddingInlineStart: '20px' }}>
                        <li>توليد وترحيل قيد الإقفال السنوي وتصفير أرصدة الإيرادات والمصروفات.</li>
                        <li>ترحيل صافي {preview.isProfit ? 'الأرباح' : 'الخسائر'} البالغ <strong>{formatCurrency(Math.abs(preview.netProfitLoss))}</strong> إلى حساب الأرباح المحتجزة.</li>
                        <li>تحويل حالة السنة المالية {fiscalYear.name} إلى <strong>«مقفلة»</strong>.</li>
                        <li>تحديث تاريخ القفل الشامل للنظام تلقائياً إلى تاريخ <strong>{fiscalYear.end_date}</strong> لحظر أي إضافة أو تعديل لقيود محاسبية بأثر رجعي.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    ملاحظات الإقفال ومحضر الجرد السنوي (اختياري)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أدخل أي ملاحظات إدارية أو إشارات لمحضر الجرد واعتماد الجمعية العمومية..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '13px',
                      color: '#1e293b',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Controls */}
      <div className="standard-dialog-footer" style={{ justifyContent: 'space-between' }}>
        <div>
          {step > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={handlePrev}
              disabled={closeMutation.isPending}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowRightIcon size={16} />
              <span>السابق</span>
            </Button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={closeMutation.isPending}>
            إلغاء
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={isLoading || !preview?.canClose}
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>المتابعة للخطوة التالية</span>
              <ArrowLeftIcon size={16} />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleExecute}
              disabled={closeMutation.isPending}
              style={{
                backgroundColor: '#15803d',
                color: '#ffffff',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <LockIcon size={16} />
              <span>{closeMutation.isPending ? 'جاري تنفيذ الإقفال والتأمين...' : 'تنفيذ الإقفال النهائي وتأمين الفترة'}</span>
            </Button>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
