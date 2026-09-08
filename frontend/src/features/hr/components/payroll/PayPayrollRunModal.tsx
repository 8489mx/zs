import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { text } from '@/features/hr/pages/payroll/hr-payroll.helpers';
import type { HrPayrollRun } from '@/types/domain';

interface PayPayrollRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRun?: HrPayrollRun;
  payChannel: 'cash' | 'bank';
  onPayChannelChange: (val: 'cash' | 'bank') => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  canApprovePayroll: boolean;
  formError: string;
}

export function PayPayrollRunModal({
  isOpen,
  onClose,
  selectedRun,
  payChannel,
  onPayChannelChange,
  onSubmit,
  isPending,
  canApprovePayroll,
  formError,
}: PayPayrollRunModalProps) {
  if (!isOpen) return null;

  return (
    <DialogShell open={true} onClose={onClose} width="500px">
      <div style={{ padding: '24px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>صرف المرتبات</h2>
        {canApprovePayroll ? (
          <form className="form-grid" onSubmit={onSubmit}>
            <p style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
              أنت على وشك صرف المرتبات للمسير المعتمد الخاص بشهر {text(selectedRun?.periodMonth)}. سيتم إنشاء قيد يومية محاسبي بالصرف.
            </p>
            <label className="field field-wide">
              <span>طريقة الصرف *</span>
              <select
                value={payChannel}
                onChange={(e) => onPayChannelChange(e.target.value as 'cash' | 'bank')}
                required
              >
                <option value="cash">نقداً (من الخزينة)</option>
                <option value="bank">تحويل بنكي</option>
              </select>
            </label>
            {formError && <div className="field-wide error-box">{formError}</div>}
            <div className="actions compact-actions field-wide" style={{ marginTop: '16px' }}>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'جارٍ الصرف...' : 'تأكيد الصرف'}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                إلغاء
              </Button>
            </div>
          </form>
        ) : (
          <p className="muted">لا تملك صلاحية تنفيذ هذا الإجراء.</p>
        )}
      </div>
    </DialogShell>
  );
}
