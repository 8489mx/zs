import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { formatCurrency } from '@/lib/format';

interface SmartReorderConfirmModalProps {
  open: boolean;
  onClose: () => void;
  ordersCount: number;
  totalItemsCount: number;
  totalCost: number;
  batchNote: string;
  setBatchNote: (v: string) => void;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  onExecute: () => void;
}

export function SmartReorderConfirmModal({
  open,
  onClose,
  ordersCount,
  totalItemsCount,
  totalCost,
  batchNote,
  setBatchNote,
  isPending,
  isError,
  errorMessage,
  onExecute,
}: SmartReorderConfirmModalProps) {
  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تأكيد توليد مسودات أوامر الشراء"
      subtitle="سيتم إنشاء أوامر شراء مسودة (Draft POs) مجمعة تلقائياً في سجل المشتريات دون التأثير على رصيد المخزون حتى يتم الاستلام الفعلي."
      maxWidth="560px"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          cancelLabel="إلغاء"
          onSubmit={onExecute}
          submitLabel={isPending ? 'جاري الإنشاء...' : 'نعم، توليد أوامر الشراء'}
          isSubmitting={isPending}
          submitDisabled={isPending || ordersCount === 0}
        />
      }
    >
      <div style={{ direction: 'rtl' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>عدد أوامر الشراء المستهدفة:</span>
            <strong style={{ fontSize: '14px', color: '#1e293b' }}>{ordersCount} أمر شراء</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>إجمالي الأصناف المحددة:</span>
            <strong style={{ fontSize: '14px', color: '#1e293b' }}>{totalItemsCount} صنف</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>إجمالي القيمة التقديرية:</span>
            <strong style={{ fontSize: '16px', color: '#170e5e' }}>{formatCurrency(totalCost)}</strong>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
            ملاحظة على مسودات الشراء:
          </label>
          <input
            type="text"
            value={batchNote}
            onChange={(e) => setBatchNote(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {isError ? (
          <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
            {errorMessage || 'فشل توليد أوامر الشراء'}
          </div>
        ) : null}
      </div>
    </StandardDialog>
  );
}
