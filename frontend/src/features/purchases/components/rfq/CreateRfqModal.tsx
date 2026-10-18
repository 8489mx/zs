import { useTranslation } from 'react-i18next';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { PlusIcon, TrashIcon } from '@/shared/components/icons/AppIcons';
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
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <StandardDialog
      open={isOpen}
      onClose={onClose}
      title={t('purchases.rfq.create_rfq_modal.s0', "إنشاء طلب عرض سعر استدراج جديد (RFQ)")}
      subtitle={t('purchases.rfq.create_rfq_modal.s1', "إدخال بيانات المناقصة أو الاستدراج وقائمة الأصناف والمواصفات المستهدفة")}
      maxWidth="800px"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          cancelLabel={t('purchases.rfq.create_rfq_modal.s2', "إلغاء")}
          submitLabel={submitting ? t('purchases.rfq.create_rfq_modal.s3', "جاري الإنشاء...") : t('purchases.rfq.create_rfq_modal.s4', "حفظ ونشر طلب عرض السعر")}
          isSubmitting={submitting}
          submitDisabled={submitting || newRfq.items.length === 0}
          onSubmit={onSubmit}
        />
      }
    >
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {t('purchases.rfq.create_rfq_modal.s5', "عنوان الطلب / الغرض *")}
            </label>
            <input
              type="text"
              required
              placeholder={t('purchases.rfq.create_rfq_modal.s6', "مثال: توريد خامات تعبئة وتغليف لشهر أكتوبر")}
              value={newRfq.title}
              onChange={(e) => onRfqChange({ ...newRfq, title: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {t('purchases.rfq.create_rfq_modal.s7', "آخر موعد لتقديم العروض (Deadline)")}
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
              {t('purchases.rfq.create_rfq_modal.s8', "تاريخ التسليم المطلوب")}
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
            {t('purchases.rfq.create_rfq_modal.s9', "شروط وملاحظات المناقصة")}
          </label>
          <textarea
            placeholder={t('purchases.rfq.create_rfq_modal.s10', "شروط السداد، مكان التسليم، أو أي متطلبات خاصة...")}
            value={newRfq.notes}
            onChange={(e) => onRfqChange({ ...newRfq, notes: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)', minHeight: '60px' }}
          />
        </div>

        {/* Items Section */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', backgroundColor: '#f8fafc' }}>
          <h4 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#170e5e', marginBottom: '12px' }}>
            {t('purchases.rfq.create_rfq_modal.s11', "الأصناف والمواصفات المطلوبة (")}{newRfq.items.length})
          </h4>

          {/* Add item bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: '8px', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569' }}>{t('purchases.rfq.create_rfq_modal.s12', "اسم الصنف / المادة")}</span>
              <input
                type="text"
                placeholder={t('purchases.rfq.create_rfq_modal.s13', "اسم الصنف أو المادة الخام")}
                value={newItem.product_name}
                onChange={(e) => onNewItemChange({ ...newItem, product_name: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
              />
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569' }}>{t('purchases.rfq.create_rfq_modal.s14', "الكمية المستهدفة")}</span>
              <input
                type="number"
                min="1"
                value={newItem.target_quantity}
                onChange={(e) => onNewItemChange({ ...newItem, target_quantity: Number(e.target.value) })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
              />
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569' }}>{t('purchases.rfq.create_rfq_modal.s15', "الوحدة")}</span>
              <input
                type="text"
                value={newItem.unit_name}
                onChange={(e) => onNewItemChange({ ...newItem, unit_name: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
              />
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#475569' }}>{t('purchases.rfq.create_rfq_modal.s16', "المواصفات والمعايير المطلوبة")}</span>
              <input
                type="text"
                placeholder={t('purchases.rfq.create_rfq_modal.s17', "مثل: سمك 2 مم، فرز أول، أو كود الماركة")}
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
                <PlusIcon size={14} /> {t('purchases.rfq.create_rfq_modal.s18', "إضافة")}
              </Button>
            </div>
          </div>

          {/* List of items */}
          {newRfq.items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 'var(--font-subtitle)', padding: '16px' }}>
              {t('purchases.rfq.create_rfq_modal.s19', "لم يتم إضافة أصناف بعد. أدخل الأصناف بالصندوق أعلاه.")}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff', borderRadius: '6px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: 'var(--font-micro)', color: '#475569' }}>
                  <th style={{ padding: '8px', textAlign: 'right' }}>{t('purchases.rfq.create_rfq_modal.s20', "الصنف")}</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>{t('purchases.rfq.create_rfq_modal.s21', "الكمية")}</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>{t('purchases.rfq.create_rfq_modal.s22', "الوحدة")}</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>{t('purchases.rfq.create_rfq_modal.s23', "المواصفات")}</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>{t('purchases.rfq.create_rfq_modal.s24', "إجراء")}</th>
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
                        <TrashIcon size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </form>
    </StandardDialog>
  );
}
