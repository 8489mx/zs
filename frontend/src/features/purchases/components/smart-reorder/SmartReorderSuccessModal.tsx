import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
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
    <DialogShell
      open={Boolean(orders)}
      onClose={onClose}
      width="min(600px, 95vw)"
      ariaLabel="تم توليد مسودات أوامر الشراء بنجاح"
      showCloseButton={true}
    >
      <div className="dialog-card" style={{ padding: '24px', direction: 'rtl', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <CheckCircleIcon size={48} color="#16a34a" />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>
          تم توليد مسودات أوامر الشراء بنجاح!
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          تم حفظ مسودات أوامر الشراء في النظام بنجاح. يمكنك استعراضها الآن أو الانتقال لسجل فواتير المشتريات.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', textAlign: 'right' }}>
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

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <Button
            variant="primary"
            style={{ backgroundColor: '#170e5e', borderColor: '#170e5e', color: '#ffffff' }}
            onClick={() => navigate('/purchases')}
          >
            الانتقال لسجل المشتريات
          </Button>
          <Button variant="secondary" onClick={onClose}>
            البقاء في مقترح الطلب
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
