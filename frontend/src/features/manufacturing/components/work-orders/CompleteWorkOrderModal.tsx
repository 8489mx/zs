import { type Dispatch, type SetStateAction } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { PlusIcon, Trash2Icon } from '@/shared/components/icons/AppIcons';
import type { WorkOrderRecord, WorkOrderOperationInput } from '@/features/manufacturing/api/work-orders.api';
import type { WorkCenterRecord } from '@/features/manufacturing/api/work-centers.api';

interface CompleteWorkOrderModalProps {
  order: WorkOrderRecord | null;
  onClose: () => void;
  workCenters: WorkCenterRecord[];
  operations: WorkOrderOperationInput[];
  onOperationsChange: Dispatch<SetStateAction<WorkOrderOperationInput[]>>;
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

  const workCenterOptions = workCenters.map((wc) => ({
    value: String(wc.id),
    label: wc.name,
    hint: wc.code || undefined,
  }));

  return (
    <StandardDialog
      isOpen={true}
      onClose={onClose}
      title={`إنهاء أمر الإنتاج: ${order.doc_no || `#${order.id}`}`}
      subtitle={`تأكيد تصنيع (${order.quantity_to_produce} من ${order.product_name}) وإدخال مراكز العمل`}
      maxWidth="720px"
      footer={
        <StandardDialogFooter
          onClose={onClose}
          closeLabel="إلغاء"
          primaryButton={{
            label: isCompleting ? 'جاري التأكيد والخصم...' : 'تأكيد الإنتاج وإدخال المخزون',
            onClick: onConfirm,
            disabled: isCompleting,
          }}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Card 1: Summary Notice */}
        <div
          style={{
            padding: 14,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 10,
            fontSize: '12.5px',
            color: '#1e3a8a',
            lineHeight: 1.6,
          }}
        >
          <strong>إشعار رقابي مخزني:</strong> عند تأكيد إنهاء هذا الأمر، سيتم استهلاك المواد الخام المسجلة في الـ BOM من المخزن وخصمها آلياً، وإيداع كمية المنتج التام المصنعة ({order.quantity_to_produce} وحدة) في رصيد المستودع المعتمد.
        </div>

        {/* Card 2: Operations / Work Centers */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#170e5e' }}>
              تسجيل عمليات مراكز التشغيل والعمالة (اختياري):
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                onOperationsChange((prev) => [
                  ...prev,
                  { workCenterId: workCenters[0]?.id || 1, operationName: 'تشغيل', durationHours: 0.5, cost: 0 },
                ])
              }
              style={{ padding: '4px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <PlusIcon size={14} />
              <span>إضافة مرحلة تشغيل</span>
            </Button>
          </div>

          {operations.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              لم يتم إضافة مراحل تشغيل مخصصة (سيتم احتساب تكلفة الإنتاج القياسية من الـ BOM مباشرة).
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {operations.map((op, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(120px, 1.5fr) minmax(140px, 1.5fr) 75px 85px 36px',
                    gap: '8px',
                    alignItems: 'center',
                    background: '#ffffff',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <input
                    type="text"
                    placeholder="اسم العملية"
                    value={op.operationName}
                    onChange={(e) => {
                      const next = [...operations];
                      next[idx].operationName = e.target.value;
                      onOperationsChange(next);
                    }}
                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                  <CustomSelect
                    value={String(op.workCenterId)}
                    onChange={(val) => {
                      const next = [...operations];
                      next[idx].workCenterId = Number(val);
                      onOperationsChange(next);
                    }}
                    options={workCenterOptions}
                    placeholder="مركز العمل..."
                  />
                  <input
                    type="number"
                    placeholder="ساعات"
                    value={op.durationHours}
                    onChange={(e) => {
                      const next = [...operations];
                      next[idx].durationHours = Number(e.target.value);
                      onOperationsChange(next);
                    }}
                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                  />
                  <input
                    type="number"
                    placeholder="تكلفة"
                    value={op.cost ?? 0}
                    onChange={(e) => {
                      const next = [...operations];
                      next[idx].cost = Number(e.target.value);
                      onOperationsChange(next);
                    }}
                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => onOperationsChange((prev) => prev.filter((_, i) => i !== idx))}
                    style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="حذف المرحلة"
                  >
                    <Trash2Icon size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StandardDialog>
  );
}
