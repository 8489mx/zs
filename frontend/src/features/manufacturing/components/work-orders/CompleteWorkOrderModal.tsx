import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon } from '@/shared/components/icons/AppIcons';
import type { WorkOrderRecord, WorkOrderOperationInput } from '@/features/manufacturing/api/work-orders.api';
import type { WorkCenterRecord } from '@/features/manufacturing/api/work-centers.api';

interface CompleteWorkOrderModalProps {
  order: WorkOrderRecord | null;
  onClose: () => void;
  workCenters: WorkCenterRecord[];
  operations: WorkOrderOperationInput[];
  onOperationsChange: React.Dispatch<React.SetStateAction<WorkOrderOperationInput[]>>;
  onConfirm: () => void;
  isCompleting: boolean;
}

export function CompleteWorkOrderModal({
  order,
  onClose,
  workCenters,
  operations,
  onOperationsChange,
  onConfirm,
  isCompleting,
}: CompleteWorkOrderModalProps) {
  if (!order) return null;

  return (
    <DialogShell open={true} onClose={onClose} width="min(680px, 95vw)" ariaLabel="إنهاء أمر الإنتاج">
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">إنهاء أمر الإنتاج: {order.doc_no || `#${order.id}`}</h3>
            <p className="standard-dialog-subtitle">
              تأكيد تصنيع الكمية المطلوبة ({order.quantity_to_produce} من {order.product_name}) وإدخال مراكز العمل
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="standard-dialog-close-btn"
            aria-label="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
            سيتم استهلاك المواد الخام المسجلة في الـ BOM من المخزن وإضافة المنتج التام إلى المخزون تلقائياً.
          </p>

          {/* Operations optional inputs */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#170e5e' }}>تسجيل عمليات مراكز التشغيل (اختياري):</span>
              <button
                type="button"
                onClick={() =>
                  onOperationsChange((prev) => [
                    ...prev,
                    { work_center_id: workCenters[0]?.id || 1, name: 'تشغيل', duration_minutes: 30, cost: 0 },
                  ])
                }
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                + إضافة مرحلة تشغيل
              </button>
            </div>

            {operations.map((op, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr auto', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="اسم العملية"
                  value={op.name}
                  onChange={(e) => {
                    const next = [...operations];
                    next[idx].name = e.target.value;
                    onOperationsChange(next);
                  }}
                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <select
                  value={op.work_center_id}
                  onChange={(e) => {
                    const next = [...operations];
                    next[idx].work_center_id = Number(e.target.value);
                    onOperationsChange(next);
                  }}
                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                >
                  {workCenters.map((wc) => (
                    <option key={wc.id} value={wc.id}>{wc.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="دقائق"
                  value={op.duration_minutes}
                  onChange={(e) => {
                    const next = [...operations];
                    next[idx].duration_minutes = Number(e.target.value);
                    onOperationsChange(next);
                  }}
                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <input
                  type="number"
                  placeholder="تكلفة"
                  value={op.cost}
                  onChange={(e) => {
                    const next = [...operations];
                    next[idx].cost = Number(e.target.value);
                    onOperationsChange(next);
                  }}
                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <button
                  type="button"
                  onClick={() => onOperationsChange((prev) => prev.filter((_, i) => i !== idx))}
                  style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                >
                  <XIcon size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="standard-dialog-footer">
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isCompleting}
              style={{ backgroundColor: '#059669', color: '#ffffff', fontWeight: 700 }}
            >
              {isCompleting ? 'جاري التأكيد والخصم...' : 'تأكيد الإنتاج وإدخال المخزون'}
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
