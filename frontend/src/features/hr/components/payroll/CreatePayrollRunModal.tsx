import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';

export interface PayrollDraft {
  periodMonth: string;
  payFrequency: 'monthly' | 'weekly' | 'biweekly' | 'daily';
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
}: CreatePayrollRunModalProps) {
  if (!isOpen) return null;

  return (
    <DialogShell open={true} onClose={onClose} width="500px">
      <div style={{ padding: '24px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>تجهيز مسير المرتبات</h2>
        {hasCreatePayrollRun && canManagePayroll ? (
          <form className="form-grid" onSubmit={onSubmit}>
            <label className="field field-wide">
              <span>شهر مسير المرتبات (كمرجع) *</span>
              <input
                type="month"
                value={draft.periodMonth}
                onChange={(e) => onDraftChange((prev) => ({ ...prev, periodMonth: e.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>دورة القبض المستهدفة</span>
              <select
                value={draft.payFrequency}
                onChange={(e) => onDraftChange((prev) => ({ ...prev, payFrequency: e.target.value as any }))}
              >
                <option value="monthly">شهري</option>
                <option value="weekly">أسبوعي</option>
                <option value="biweekly">نصف شهري (كل أسبوعين)</option>
                <option value="daily">يومي</option>
              </select>
            </label>
            <div className="form-grid field-wide" style={{ gap: '12px', display: 'flex' }}>
              <label className="field" style={{ flex: 1 }}>
                <span>تاريخ البداية (اختياري)</span>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => onDraftChange((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>تاريخ النهاية (اختياري)</span>
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => onDraftChange((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </label>
            </div>
            <label className="field field-wide">
              <span>ملاحظات</span>
              <input
                value={draft.notes}
                onChange={(e) => onDraftChange((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>
            {formError && <div className="field-wide error-box">{formError}</div>}
            <div className="actions compact-actions field-wide" style={{ marginTop: '16px' }}>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'جارٍ التجهيز...' : 'تجهيز المسير'}
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
