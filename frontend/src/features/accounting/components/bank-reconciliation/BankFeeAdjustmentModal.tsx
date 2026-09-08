import React from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { formatCurrency } from '@/lib/format';
import { BankStatementLine } from '../../api/accounting.api';

interface BankFeeAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeTargetLine: BankStatementLine | null;
  expenseAccounts: any[];
  selectedExpenseAccountId: number;
  onSelectedExpenseAccountIdChange: (id: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const BankFeeAdjustmentModal: React.FC<BankFeeAdjustmentModalProps> = ({
  isOpen,
  onClose,
  feeTargetLine,
  expenseAccounts,
  selectedExpenseAccountId,
  onSelectedExpenseAccountIdChange,
  onSubmit,
  isSubmitting,
}) => {
  if (!isOpen || !feeTargetLine) return null;

  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="500px"
      zIndex={95}
      ariaLabel="تسوية عمولة ومصاريف بنكية"
    >
      <Card title="تسوية عمولة ومصاريف بنكية فورية" className="dialog-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
            <div>البيان: <strong>{feeTargetLine.description}</strong></div>
            <div style={{ marginTop: '4px' }}>
              قيمة العمولة المخصومة: <strong style={{ color: '#dc2626' }}>{formatCurrency(Math.abs(feeTargetLine.amount))}</strong>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              حساب المصروفات البنكية (شجرة الحسابات):
            </label>
            <select
              value={selectedExpenseAccountId}
              onChange={(e) => onSelectedExpenseAccountIdChange(Number(e.target.value))}
              style={{ width: '100%', padding: '8px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              {expenseAccounts.map((a: any) => (
                <option key={a.id} value={a.id}>{a.code} - {a.nameAr}</option>
              ))}
            </select>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
              سيتم إنشاء قيد يومية متزن آلياً (من ح/ مصاريف بنكية إلى ح/ البنك) ومطابقة الحركة فورياً.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting || !selectedExpenseAccountId}
              onClick={onSubmit}
              style={{ background: '#170e5e', borderColor: '#170e5e', fontWeight: 800 }}
            >
              {isSubmitting ? 'جارٍ التسوية...' : 'إنشاء القيد ومطابقة السطر'}
            </Button>
          </div>
        </div>
      </Card>
    </DialogShell>
  );
};
