import React, { useState } from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { PriceList, UpsertPriceListPayload, PriceListItem } from '../../api/price-lists.api';

interface PriceListModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingList: PriceList | null;
  formData: UpsertPriceListPayload;
  setFormData: React.Dispatch<React.SetStateAction<UpsertPriceListPayload>>;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export const PriceListModal: React.FC<PriceListModalProps> = ({
  isOpen,
  onClose,
  editingList,
  formData,
  setFormData,
  saving,
  onSave,
}) => {
  const [newItem, setNewItem] = useState<{
    product_name: string;
    min_quantity: number;
    fixed_price: string;
    discount_percent: string;
  }>({
    product_name: '',
    min_quantity: 1,
    fixed_price: '',
    discount_percent: '',
  });

  const addItemToRule = () => {
    if (!newItem.product_name.trim()) return;
    const item: PriceListItem = {
      product_name: newItem.product_name.trim(),
      min_quantity: Number(newItem.min_quantity) || 1,
      fixed_price: newItem.fixed_price ? Number(newItem.fixed_price) : null,
      discount_percent: newItem.discount_percent ? Number(newItem.discount_percent) : null,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items || []), item],
    }));
    setNewItem({ product_name: '', min_quantity: 1, fixed_price: '', discount_percent: '' });
  };

  const removeItem = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== idx),
    }));
  };

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title={editingList ? 'تعديل قائمة الأسعار' : 'إنشاء قائمة أسعار جديدة'}
      maxWidth="720px"
    >
      <form onSubmit={onSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              اسم القائمة *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: أسعار كبار الموزعين VIP"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              كود القائمة (إنجليزي) *
            </label>
            <input
              type="text"
              placeholder="مثال: WHOLESALE_VIP"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              نسبة الخصم العام الافتراضية (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={formData.default_discount_percent}
              onChange={(e) => setFormData({ ...formData, default_discount_percent: Number(e.target.value) })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-body)' }}>
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              />
              قائمة افتراضية للعملاء
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-body)' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              نشطة
            </label>
          </div>
        </div>

        {/* Volume Tiers & Specific Item Rules */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px', marginBottom: '16px' }}>
          <h4 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            شرائح الكميات وأسعار الأصناف المحددة
          </h4>
          <p style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginBottom: '12px' }}>
            حدد أسعاراً خاصة أو خصومات عند شراء كميات أكبر من حد أدنى معين (مثال: خصم 10% عند شراء 10 قطع فأكثر).
          </p>

          {/* Add item row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 'var(--font-micro)', color: '#475569', display: 'block', marginBottom: '4px' }}>اسم الصنف</label>
              <input
                type="text"
                placeholder="مثال: شاي العروسة 250جم"
                value={newItem.product_name}
                onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-micro)', color: '#475569', display: 'block', marginBottom: '4px' }}>الحد الأدنى للكمية</label>
              <input
                type="number"
                min="1"
                value={newItem.min_quantity}
                onChange={(e) => setNewItem({ ...newItem, min_quantity: Number(e.target.value) })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-micro)', color: '#475569', display: 'block', marginBottom: '4px' }}>سعر ثابت</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="اختياري"
                value={newItem.fixed_price}
                onChange={(e) => setNewItem({ ...newItem, fixed_price: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-micro)', color: '#475569', display: 'block', marginBottom: '4px' }}>أو خصم %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="%"
                value={newItem.discount_percent}
                onChange={(e) => setNewItem({ ...newItem, discount_percent: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)' }}
              />
            </div>
            <button
              type="button"
              onClick={addItemToRule}
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 'var(--font-table-head)',
              }}
            >
              + إضافة
            </button>
          </div>

          {/* Items Table */}
          {formData.items && formData.items.length > 0 && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginTop: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-micro)', color: '#475569' }}>الصنف</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-micro)', color: '#475569' }}>الحد الأدنى</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-micro)', color: '#475569' }}>السعر المحدد</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-micro)', color: '#475569' }}>نسبة الخصم</th>
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-micro)', color: '#475569' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#0f172a' }}>{it.product_name}</td>
                      <td style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#0f172a' }}>{it.min_quantity} قطعة+</td>
                      <td style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#0f172a' }}>{it.fixed_price != null ? `${it.fixed_price} ج.م` : '-'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#0f172a' }}>{it.discount_percent != null ? `${it.discount_percent}%` : '-'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', padding: '2px' }}
                        >
                          <AppIcons.Trash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 'var(--font-body)',
            }}
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '9px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 'var(--font-body)',
            }}
          >
            {saving ? 'جاري الحفظ...' : editingList ? 'حفظ التعديلات' : 'إنشاء القائمة'}
          </button>
        </div>
      </form>
    </StandardDialog>
  );
};
