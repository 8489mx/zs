import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';
import { pdcChequesApi, type PdcCheque } from '../api/accounting.api';

export type PdcActionType = 'deposit' | 'collect' | 'clear' | 'bounce' | 'endorse' | 'return' | null;

export interface PdcChequeActionModalProps {
  open: boolean;
  action: PdcActionType;
  cheque: PdcCheque | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PdcChequeActionModal({
  open,
  action,
  cheque,
  onClose,
  onSuccess,
}: PdcChequeActionModalProps) {
  const queryClient = useQueryClient();
  const [actionDate, setActionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bouncedReason, setBouncedReason] = useState('عدم كفاية الرصيد');
  const [bouncedFee, setBouncedFee] = useState('0');
  const [endorsedSupplier, setEndorsedSupplier] = useState('');
  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    if (open) {
      setActionDate(new Date().toISOString().slice(0, 10));
      setBouncedReason('عدم كفاية الرصيد');
      setBouncedFee('0');
      setEndorsedSupplier('');
      setActionNotes('');
    }
  }, [open, action]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      pdcChequesApi.updateStatus(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pdc-cheques-list'] });
      void queryClient.invalidateQueries({ queryKey: ['pdc-cheques-stats'] });
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  const handleActionSubmit = () => {
    if (!cheque || !action) return;

    const payload: any = {
      action,
      actionDate,
      notes: actionNotes.trim() || undefined,
    };

    if (action === 'bounce') {
      payload.bouncedReason = bouncedReason;
      payload.bouncedFee = Number(bouncedFee) || 0;
    } else if (action === 'endorse') {
      payload.endorsedSupplier = endorsedSupplier.trim();
    }

    updateStatusMutation.mutate({ id: cheque.id, payload });
  };

  if (!open || !cheque || !action) return null;

  return (
    <DialogShell
      isOpen={open}
      onClose={onClose}
      size="md"
    >
      <div className="standard-dialog-header">
        <div>
          <h2 className="standard-dialog-title">
            {action === 'deposit' && 'إيداع الشيك برسم التحصيل بالبنك'}
            {action === 'collect' && 'تأكيد تحصيل الشيك بالبنك'}
            {action === 'clear' && 'تأكيد صرف ورقة الدفع بنكياً'}
            {action === 'bounce' && 'تسجيل ارتداد / رفض الشيك'}
            {action === 'endorse' && 'تظهير الشيك لمورد'}
            {action === 'return' && 'إرجاع الشيك للعميل'}
          </h2>
          <p className="standard-dialog-subtitle">
            تنفيذ الحركة المحاسبية وتحديث حالة الشيك
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

      <div className="standard-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '12px 14px', border: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>رقم الشيك:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
              {cheque.cheque_number}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>الطرف:</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{cheque.partner_name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>المبلغ:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              {formatCurrency(cheque.amount)} {cheque.currency}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              تاريخ الإجراء <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="date"
              value={actionDate}
              onChange={(e) => setActionDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: '#1e293b',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {action === 'bounce' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  سبب الرفض / الارتداد <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <select
                  value={bouncedReason}
                  onChange={(e) => setBouncedReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="عدم كفاية الرصيد">عدم كفاية الرصيد (رفض مالي)</option>
                  <option value="اختلاف التوقيع">اختلاف التوقيع عن نموذج البنك</option>
                  <option value="شيك ملغى أو عليه أمر إيقاف صرف">
                    شيك ملغى أو عليه أمر إيقاف صرف
                  </option>
                  <option value="خطأ أو شطب في كتابة المبلغ أو التاريخ">
                    خطأ أو شطب في كتابة المبلغ أو التاريخ
                  </option>
                  <option value="الحساب مغلق بالبنك">الحساب مغلق بالبنك</option>
                  <option value="سبب بنكي آخر">سبب بنكي آخر</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  مصاريف الرفض البنكية (إن وجدت)
                </label>
                <input
                  type="number"
                  value={bouncedFee}
                  onChange={(e) => setBouncedFee(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          )}

          {action === 'endorse' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                اسم المورد المراد تظهير الشيك إليه <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="text"
                value={endorsedSupplier}
                onChange={(e) => setEndorsedSupplier(e.target.value)}
                placeholder="اسم المورد المستحق للسداد"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '12px',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              ملاحظات
            </label>
            <input
              type="text"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="ملاحظات حول الإجراء..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: '#1e293b',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      <div className="standard-dialog-footer">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}
        >
          إلغاء
        </Button>
        <Button
          type="button"
          onClick={handleActionSubmit}
          disabled={updateStatusMutation.isPending || (action === 'endorse' && !endorsedSupplier.trim())}
          style={{
            backgroundColor: '#170e5e',
            color: '#ffffff',
            padding: '8px 22px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            opacity: updateStatusMutation.isPending ? 0.6 : 1,
          }}
        >
          {updateStatusMutation.isPending ? 'جاري التنفيذ...' : 'تأكيد الإجراء'}
        </Button>
      </div>
    </DialogShell>
  );
}
