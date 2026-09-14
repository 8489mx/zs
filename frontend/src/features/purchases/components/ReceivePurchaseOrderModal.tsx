import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { PurchaseOrderRecord } from '../api/purchase-orders.api';

interface ReceiveItem {
  itemId: number;
  productId: number;
  productName: string;
  quantity: number;
  receivedQuantity: number;
  toReceive: number;
}

interface ReceivePurchaseOrderModalProps {
  order: PurchaseOrderRecord | null;
  open: boolean;
  onClose: () => void;
  receiveItems: ReceiveItem[];
  onChangeItemReceive: (index: number, val: number) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export const ReceivePurchaseOrderModal: React.FC<ReceivePurchaseOrderModalProps> = ({
  order,
  open,
  onClose,
  receiveItems,
  onChangeItemReceive,
  onConfirm,
  isPending,
}) => {
  if (!open || !order) return null;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`إثبات استلام بضاعة لأمر الشراء #${order.order_number || ''}`}
      subtitle="أدخل الكميات المستلمة فعلياً في المستودع لتغذية المخزون وتحديث رصيد الصنف تلقائياً"
      maxWidth="820px"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          cancelLabel="إلغاء"
          onSubmit={onConfirm}
          submitLabel={isPending ? 'جاري تسجيل الاستلام...' : 'تأكيد الاستلام وتغذية المخزن'}
          isSubmitting={isPending}
        />
      }
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
              <tr>
                <th style={{ padding: '10px 12px' }}>الصنف</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>المطلوب</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>المستلم مسبقاً</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: '130px' }}>الكمية المستلمة الآن</th>
              </tr>
            </thead>
            <tbody>
              {receiveItems.map((it, idx) => (
                <tr key={it.itemId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{it.productName}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>{it.quantity}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{it.receivedQuantity}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <input
                      type="number"
                      min="0"
                      max={it.quantity - it.receivedQuantity}
                      value={it.toReceive}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        onChangeItemReceive(idx, val);
                      }}
                      style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontWeight: 700, boxSizing: 'border-box' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </StandardDialog>
  );
};
