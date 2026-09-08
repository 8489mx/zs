import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { PlusIcon } from '@/shared/components/icons/AppIcons';
import type { CreateRfqPayload } from '../../api/purchase-rfqs.api';

interface CreateRfqModalProps {
  isOpen: boolean;
  onClose: () => void;
  newRfq: CreateRfqPayload;
  onRfqChange: (val: CreateRfqPayload) => void;
  newItem: {
    product_id: number;
    product_name: string;
    unit_name: string;
    target_quantity: number;
    specifications: string;
  };
  onNewItemChange: (val: any) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export function CreateRfqModal({
  isOpen,
  onClose,
  newRfq,
  onRfqChange,
  newItem,
  onNewItemChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
  submitting,
}: CreateRfqModalProps) {
  if (!isOpen) return null;

  return (
    <StandardDialog
      isOpen={true}
      onClose={onClose}
      title="إنشاء طلب عرض سعر استدراج جديد (RFQ)"
      subtitle="إدخال بيانات المناقصة أو الاستدراج وقائمة الأصناف والمواصفات المستهدفة"
      width="min(800px, 95vw)"
    >
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              عنوان الطلب / الغرض *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: توريد خامات تعبئة وتغليف لشهر أكتوبر"
              value={newRfq.title}
              onChange={(e) => onRfqChange({ ...newRfq, title: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              آخر موعد لتقديم العروض (Deadline)
            </label>
            <input
              type="date"
              value={newRfq.deadline_date}
              onChange={(e) => onRfqChange({ ...newRfq, deadline_date: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              تاريخ التسليم المطلوب
            </label>
            <input
              type="date"
              value={newRfq.expected_delivery_date}
              onChange={(e) => onRfqChange({ ...newRfq, expected_delivery_date: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            شروط وملاحظات المناقصة
          </label>
          <textarea
            placeholder="شروط السداد، مكان التسليم، أو أي متطلبات خاصة..."
            value={newRfq.notes}
            onChange={(e) => onRfqChange({ ...newRfq, notes: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)', minHeight: '60px' }}
          />
        </div>

        {/* Items Section */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', backgroundColor: '#f8fafc' }}>
          <h4 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#170e5e', marginBottom: '12px' }}>
            الأصناف والمواصفات المطلوبة ({newRfq.items.length})
          </h4>

          {/* Add item bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: '8px', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569' }}>اسم الصنف / المادة</span>
              <input
                type="text"
                placeholder="اسم الصنف أو المادة الخام"
                value={newItem.product_name}
                onChange={(e) => onNewItemChange({ ...newItem, product_name: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
              />
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569' }}>الكمية المستهدفة</span>
              <input
                type="number"
                min="1"
                value={newItem.target_quantity}
                onChange={(e) => onNewItemChange({ ...newItem, target_quantity: Number(e.target.value) })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
              />
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569' }}>الوحدة</span>
              <input
                type="text"
                value={newItem.unit_name}
                onChange={(e) => onNewItemChange({ ...newItem, unit_name: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
              />
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569' }}>المواصفات والمعايير المطلوبة</span>
              <input
                type="text"
                placeholder="مثل: سمك 2 مم، فرز أول، أو كود الماركة"
                value={newItem.specifications}
                onChange={(e) => onNewItemChange({ ...newItem, specifications: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
              />
            </div>
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={onAddItem}
                style={{ padding: '6px 12px', fontSize: 'var(--font-body)', fontWeight: 700 }}
              >
                <PlusIcon size={14} /> إضافة
              </Button>
            </div>
          </div>

          {/* List of items */}
          {newRfq.items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 'var(--font-subtitle)', padding: '16px' }}>
              لم يتم إضافة أصناف بعد. أدخل الأصناف بالصندوق أعلاه.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff', borderRadius: '6px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: 'var(--font-micro)', color: '#475569' }}>
                  <th style={{ padding: '8px', textAlign: 'right' }}>الصنف</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>الكمية</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>الوحدة</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>المواصفات</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {newRfq.items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 'var(--font-body)' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{it.product_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{it.target_quantity}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{it.unit_name}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{it.specifications || '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(idx)}
                        style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <AppIcons.Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || newRfq.items.length === 0}
            style={{ backgroundColor: '#170e5e', borderColor: '#170e5e' }}
          >
            {submitting ? 'جاري الإنشاء...' : 'حفظ ونشر طلب عرض السعر'}
          </Button>
        </div>
      </form>
    </StandardDialog>
  );
}
