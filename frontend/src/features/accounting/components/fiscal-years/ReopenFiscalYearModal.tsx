import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon, AlertTriangleIcon, AlertCircleIcon, RefreshCwIcon } from '@/shared/components/icons/AppIcons';
import { fiscalYearsApi } from '../../api/fiscal-years.api';
import type { FiscalYearRecord } from '../../types/fiscal-years.types';

export interface ReopenFiscalYearModalProps {
  open: boolean;
  onClose: () => void;
  fiscalYear: FiscalYearRecord | null;
  onReopened?: () => void;
}

export function ReopenFiscalYearModal({
  open,
  onClose,
  fiscalYear,
  onReopened,
}: ReopenFiscalYearModalProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reopenMutation = useMutation({
    mutationFn: () => {
      if (!fiscalYear) throw new Error('لا توجد سنة مالية محددة.');
      return fiscalYearsApi.reopen(fiscalYear.id, { reason });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'settings'] });
      if (onReopened) onReopened();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'حدث خطأ أثناء إعادة فتح السنة المالية.');
    },
  });

  if (!open || !fiscalYear) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!reason.trim()) {
      setErrorMessage('يجب ذكر سبب إعادة فتح السنة المالية لأغراض الرقابة المحاسبية.');
      return;
    }

    reopenMutation.mutate();
  };

  return (
    <DialogShell isOpen={open} onClose={onClose} size="md">
      <div className="standard-dialog-header">
        <div>
          <h2 className="standard-dialog-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCwIcon size={20} color="#e11d48" />
            <span>إعادة فتح السنة المالية: {fiscalYear.name}</span>
          </h2>
          <p className="standard-dialog-subtitle">
            إلغاء قيد الإقفال السنوي وإعادة تفعيل الفترة المحاسبية لإجراء التسويات
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

      <form onSubmit={handleSubmit}>
        <div className="standard-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

          <div
            style={{
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              color: '#92400e',
              fontSize: '13px',
              lineHeight: 1.6,
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangleIcon size={22} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '4px', color: '#78350f' }}>
                تنبيه هام ومسؤولية محاسبية:
              </strong>
              إعادة فتح السنة المالية سيؤدي إلى:
              <ul style={{ margin: '6px 0 0 0', paddingInlineStart: '20px' }}>
                <li>إلغاء وحذف قيد الإقفال السنوي رقم {fiscalYear.closing_entry_id ? `#${fiscalYear.closing_entry_id}` : '—'} بشكل كامل.</li>
                <li>إعادة أرصدة الإيرادات والمصروفات إلى حالتها الأصلية قبل التصفير.</li>
                <li>تعديل تاريخ القفل المحاسبي (Lock Date) للسماح بتعديل وإدخال قيود خلال هذه الفترة.</li>
              </ul>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              سبب إعادة الفتح والمبرر الإداري <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب المبرر الرقابي لإعادة فتح السنة المالية (مثال: إجراء قيود تسوية جردية لمصروفات استحقاق)..."
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

        <div className="standard-dialog-footer">
          <Button type="button" variant="secondary" onClick={onClose} disabled={reopenMutation.isPending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={reopenMutation.isPending}
            style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
          >
            {reopenMutation.isPending ? 'جاري إعادة الفتح...' : 'تأكيد إعادة فتح السنة المالية'}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
