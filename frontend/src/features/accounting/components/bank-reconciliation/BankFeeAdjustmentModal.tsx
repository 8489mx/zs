import React from 'react';
import { Button } from '@/shared/ui/button';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { FileTextIcon, DollarSignIcon } from '@/shared/components/icons/AppIcons';
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

  const expenseAccountOptions = expenseAccounts.map((a: any) => ({
    value: String(a.id),
    label: `${a.code} - ${a.nameAr || a.name}`,
    hint: a.code,
  }));

  return (
    <StandardDialog
      open={isOpen}
      onClose={onClose}
      title="تسوية عمولة ومصاريف بنكية فورية"
      subtitle="إنشاء قيد يومية متزن آلياً لمطابقة السطر البنكي فورياً"
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Card 1: Bank Line Info */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
            <FileTextIcon size={15} style={{ color: '#170e5e' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>بيانات السطر البنكي المراد تسويته</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
            <span style={{ color: '#64748b' }}>البيان:</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{feeTargetLine.description}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
            <span style={{ color: '#64748b' }}>قيمة العمولة المخصومة:</span>
            <span style={{ fontWeight: 800, color: '#dc2626' }}>
              {formatCurrency(Math.abs(feeTargetLine.amount))}
            </span>
          </div>
        </div>

        {/* Card 2: Account Selection */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
            <DollarSignIcon size={15} style={{ color: '#170e5e' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>توجيه حساب المصروفات</span>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              حساب المصروفات البنكية (شجرة الحسابات) <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <CustomSelect
              value={selectedExpenseAccountId ? String(selectedExpenseAccountId) : ''}
              onChange={(val) => onSelectedExpenseAccountIdChange(Number(val))}
              options={expenseAccountOptions}
              placeholder="اختر حساب المصروفات البنكية..."
            />
            <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
              سيتم إنشاء قيد يومية متزن آلياً (من ح/ مصاريف بنكية إلى ح/ البنك) ومطابقة الحركة فورياً.
            </p>
          </div>
        </div>
      </div>

      <StandardDialogFooter>
        <Button type="button" variant="secondary" onClick={onClose} style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}>
          إلغاء
        </Button>
        <Button
          type="button"
          disabled={isSubmitting || !selectedExpenseAccountId}
          onClick={onSubmit}
          style={{
            backgroundColor: '#170e5e',
            color: '#ffffff',
            padding: '8px 22px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            opacity: isSubmitting || !selectedExpenseAccountId ? 0.6 : 1,
          }}
        >
          {isSubmitting ? 'جارٍ التسوية...' : 'إنشاء القيد ومطابقة السطر'}
        </Button>
      </StandardDialogFooter>
    </StandardDialog>
  );
};
