import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <DialogShell open={true} onClose={onClose} width="500px">
      <div style={{ padding: '24px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>{t('hr.payroll.pay_payroll_run_modal.s0', "صرف المرتبات")}</h2>
        {canApprovePayroll ? (
          <form className="form-grid" onSubmit={onSubmit}>
            <p style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
              {t('hr.payroll.pay_payroll_run_modal.s1', "أنت على وشك صرف المرتبات للمسير المعتمد الخاص بشهر")} {text(selectedRun?.periodMonth)}{t('hr.payroll.pay_payroll_run_modal.s2', ". سيتم إنشاء قيد يومية محاسبي بالصرف.")}
            </p>
            <label className="field field-wide">
              <span>{t('hr.payroll.pay_payroll_run_modal.s3', "طريقة الصرف *")}</span>
              <select
                value={payChannel}
                onChange={(e) => onPayChannelChange(e.target.value as 'cash' | 'bank')}
                required
              >
                <option value="cash">{t('hr.payroll.pay_payroll_run_modal.s4', "نقداً (من الخزينة)")}</option>
                <option value="bank">{t('hr.payroll.pay_payroll_run_modal.s5', "تحويل بنكي")}</option>
              </select>
            </label>
            {formError && <div className="field-wide error-box">{formError}</div>}
            <div className="actions compact-actions field-wide" style={{ marginTop: '16px' }}>
              <Button type="submit" disabled={isPending}>
                {isPending ? t('hr.payroll.pay_payroll_run_modal.s6', "جارٍ الصرف...") : t('hr.payroll.pay_payroll_run_modal.s7', "تأكيد الصرف")}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                {t('hr.payroll.pay_payroll_run_modal.s8', "إلغاء")}
              </Button>
            </div>
          </form>
        ) : (
          <p className="muted">{t('hr.payroll.pay_payroll_run_modal.s9', "لا تملك صلاحية تنفيذ هذا الإجراء.")}</p>
        )}
      </div>
    </DialogShell>
  );
}
