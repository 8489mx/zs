import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
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
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(560px, 95vw)"
      ariaLabel="تأكيد توليد مسودات أوامر الشراء"
      showCloseButton={true}
    >
      <div className="dialog-card" style={{ padding: '24px', direction: 'rtl' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
          تأكيد توليد مسودات أوامر الشراء
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', marginBottom: '16px' }}>
          سيتم إنشاء أوامر شراء مسودة (Draft POs) مجمعة تلقائياً في سجل المشتريات.
          <strong> لن يتم التأثير على رصيد المخزون </strong> حتى تقوم باعتماد الاستلام المخزني الفعلي.
        </p>

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
            }}
          />
        </div>

        {isError ? (
          <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
            {errorMessage || 'فشل توليد أوامر الشراء'}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            style={{ backgroundColor: '#170e5e', borderColor: '#170e5e', color: '#ffffff', fontWeight: 600 }}
            onClick={onExecute}
            disabled={isPending || ordersCount === 0}
          >
            {isPending ? 'جاري الإنشاء...' : 'نعم، توليد أوامر الشراء'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
