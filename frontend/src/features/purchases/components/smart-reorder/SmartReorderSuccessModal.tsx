import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { formatCurrency } from '@/lib/format';
import { CheckCircleIcon } from '@/shared/components/icons/AppIcons';

interface CreatedOrder {
  id: number;
  docNo?: string;
  supplierId: number;
  supplierName?: string;
  total: number;
  itemsCount: number;
}

interface SmartReorderSuccessModalProps {
  orders: CreatedOrder[] | null;
  onClose: () => void;
}

export function SmartReorderSuccessModal({ orders, onClose }: SmartReorderSuccessModalProps) {
  const navigate = useNavigate();

  return (
    <StandardDialog
      open={Boolean(orders)}
      onClose={onClose}
      title="تم توليد مسودات أوامر الشراء بنجاح"
      subtitle="تم حفظ مسودات أوامر الشراء في النظام بنجاح. يمكنك استعراضها الآن أو الانتقال لسجل فواتير المشتريات."
      maxWidth="600px"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          cancelLabel="البقاء في مقترح الطلب"
          onSubmit={() => navigate('/purchases')}
          submitLabel="الانتقال لسجل المشتريات"
        />
      }
    >
      <div style={{ direction: 'rtl' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <CheckCircleIcon size={48} color="#16a34a" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(orders || []).map((ord) => (
            <div
              key={ord.id}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>أمر شراء #{ord.docNo || ord.id}</strong>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  المورد: {ord.supplierName || '—'} · {ord.itemsCount} أصناف
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <strong style={{ color: '#170e5e' }}>{formatCurrency(ord.total)}</strong>
                <Button
                  variant="secondary"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={() => navigate('/purchases')}
                >
                  معاينة في السجل
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StandardDialog>
  );
}
