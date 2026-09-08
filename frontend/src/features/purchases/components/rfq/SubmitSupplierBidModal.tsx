import { type FormEvent } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import type { PurchaseRfq, SubmitSupplierBidPayload } from '../../api/purchase-rfqs.api';

interface SubmitSupplierBidModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRfq: PurchaseRfq | null;
  bidForm: SubmitSupplierBidPayload;
  onBidFormChange: (val: SubmitSupplierBidPayload) => void;
  onSubmit: (e: FormEvent) => void;
  submitting: boolean;
}

export function SubmitSupplierBidModal({
  isOpen,
  onClose,
  activeRfq,
  bidForm,
  onBidFormChange,
  onSubmit,
  submitting,
}: SubmitSupplierBidModalProps) {
  if (!isOpen || !activeRfq) return null;

  return (
    <StandardDialog
      isOpen={true}
      onClose={onClose}
      title="تسجيل عرض سعر مورد جديد"
      subtitle={`إدخال أسعار وشروط العرض المقدم لطلب: ${activeRfq.title}`}
      width="min(600px, 95vw)"
    >
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              اسم المورد أو الشركة *
            </label>
            <input
              type="text"
              required
              placeholder="اسم المورد"
              value={bidForm.supplier_name}
              onChange={(e) => onBidFormChange({ ...bidForm, supplier_name: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              رقم هاتف المورد / التواصل
            </label>
            <input
              type="text"
              placeholder="01xxxxxxxxx"
              value={bidForm.supplier_phone}
              onChange={(e) => onBidFormChange({ ...bidForm, supplier_phone: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              مدة التوريد (بالأيام)
            </label>
            <input
              type="number"
              min="0"
              value={bidForm.delivery_lead_days}
              onChange={(e) => onBidFormChange({ ...bidForm, delivery_lead_days: Number(e.target.value) })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              شروط الدفع
            </label>
            <input
              type="text"
              value={bidForm.payment_terms}
              onChange={(e) => onBidFormChange({ ...bidForm, payment_terms: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
            />
          </div>
        </div>

        {/* Pricing Items */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', backgroundColor: '#f8fafc' }}>
          <h4 style={{ fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#170e5e', marginBottom: '8px' }}>
            تسعير الأصناف
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff', borderRadius: '6px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: 'var(--font-micro)', color: '#475569' }}>
                <th style={{ padding: '8px', textAlign: 'right' }}>الصنف</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>الكمية</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>سعر الوحدة المقترح (ج.م) *</th>
              </tr>
            </thead>
            <tbody>
              {activeRfq.items?.map((item) => {
                const currentBidItem = bidForm.item_bids.find((b) => b.rfq_item_id === item.id);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{item.product_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{item.target_quantity} {item.unit_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={currentBidItem?.quoted_unit_cost || ''}
                        onChange={(e) => {
                          const cost = Number(e.target.value);
                          const updated = bidForm.item_bids.map((b) =>
                            b.rfq_item_id === item.id ? { ...b, quoted_unit_cost: cost } : b
                          );
                          onBidFormChange({ ...bidForm, item_bids: updated });
                        }}
                        style={{ width: '120px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            ملاحظات إضافية على العرض
          </label>
          <textarea
            placeholder="ملاحظات المورد..."
            value={bidForm.notes}
            onChange={(e) => onBidFormChange({ ...bidForm, notes: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)', minHeight: '50px' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            style={{ backgroundColor: '#170e5e', borderColor: '#170e5e' }}
          >
            {submitting ? 'جاري الحفظ...' : 'حفظ عرض السعر'}
          </Button>
        </div>
      </form>
    </StandardDialog>
  );
}
