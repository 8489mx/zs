import React, { useState } from 'react';
import { TrashIcon } from '@/shared/components/icons/AppIcons';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { PriceList, UpsertPriceListPayload, PriceListItem } from '../../api/price-lists.api';
import { useProductsQuery } from '@/shared/hooks/use-catalog-queries';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { matchesArabic } from '@/lib/arabic-normalization';

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
  const { data: products = [] } = useProductsQuery();
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [newItem, setNewItem] = useState<{
    product_id: number | null;
    product_name: string;
    min_quantity: number;
    fixed_price: string;
    discount_percent: string;
  }>({
    product_id: null,
    product_name: '',
    min_quantity: 1,
    fixed_price: '',
    discount_percent: '',
  });

  const addItemToRule = () => {
    const pName = selectedProduct?.name || newItem.product_name.trim() || productSearch.trim();
    if (!pName) return;

    const pId = selectedProduct?.id ? Number(selectedProduct.id) : (newItem.product_id ? Number(newItem.product_id) : null);

    const item: PriceListItem = {
      product_id: pId,
      product_name: pName,
      min_quantity: Number(newItem.min_quantity) || 1,
      fixed_price: newItem.fixed_price ? Number(newItem.fixed_price) : null,
      discount_percent: newItem.discount_percent ? Number(newItem.discount_percent) : null,
    };

    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items || []), item],
    }));

    setNewItem({ product_id: null, product_name: '', min_quantity: 1, fixed_price: '', discount_percent: '' });
    setSelectedProduct(null);
    setProductSearch('');
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
      maxWidth="760px"
    >
      <form onSubmit={onSave} dir="rtl">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              اسم القائمة <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: أسعار كبار الموزعين VIP"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              كود القائمة (إنجليزي) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: WHOLESALE_VIP"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px', alignItems: 'center' }}>
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
              style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-body)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '22px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-body)', fontWeight: 500, color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              />
              قائمة افتراضية للعملاء
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-body)', fontWeight: 500, color: '#1e293b' }}>
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
          <h4 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
            شرائح الكميات وأسعار الأصناف المحددة
          </h4>
          <p style={{ fontSize: 'var(--font-micro)', color: '#64748b', margin: '0 0 14px 0' }}>
            حدد أسعاراً خاصة أو خصومات عند شراء كميات أكبر من حد أدنى معين (مثال: خصم 10% أو سعر ثابت عند شراء 10 قطع فأكثر).
          </p>

          {/* Add item row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr auto', gap: '10px', marginBottom: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 'var(--font-micro)', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                الصنف المستهدف <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <SearchableCombobox
                placeholder="ابحث باسم الصنف أو الباركود..."
                value={productSearch}
                onChange={(val) => {
                  setProductSearch(val);
                  if (!val) {
                    setSelectedProduct(null);
                    setNewItem(prev => ({ ...prev, product_id: null, product_name: '' }));
                  }
                }}
                options={(products || []).map((p: any) => ({
                  id: String(p.id),
                  name: p.name,
                  barcode: p.barcode,
                  code: p.code,
                  retail_price: p.retail_price || p.price || 0,
                }))}
                getLabel={(p) => p.name}
                getMeta={(p) => `السعر: ${p.retail_price} ج.م${p.barcode ? ` | باركود: ${p.barcode}` : ''}`}
                search={(p, q) => matchesArabic(p.name, q) || Boolean(p.barcode && p.barcode.includes(q)) || Boolean(p.code && p.code.includes(q))}
                onSelect={(p) => {
                  setSelectedProduct(p);
                  setProductSearch(p.name);
                  setNewItem(prev => ({
                    ...prev,
                    product_id: Number(p.id),
                    product_name: p.name,
                  }));
                }}
                showDropdownOnEmpty={true}
                emptyLabel="لا توجد أصناف مطابقة"
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-micro)', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 600 }}>الحد الأدنى للكمية</label>
              <input
                type="number"
                min="1"
                value={newItem.min_quantity}
                onChange={(e) => setNewItem({ ...newItem, min_quantity: Number(e.target.value) })}
                style={{ width: '100%', height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-micro)', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 600 }}>سعر ثابت</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="اختياري"
                value={newItem.fixed_price}
                onChange={(e) => setNewItem({ ...newItem, fixed_price: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-micro)', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 600 }}>أو خصم %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="%"
                value={newItem.discount_percent}
                onChange={(e) => setNewItem({ ...newItem, discount_percent: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-table-head)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <button
                type="button"
                onClick={addItemToRule}
                style={{
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 'var(--font-table-head)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                + إضافة
              </button>
            </div>
          </div>

          {selectedProduct && (
            <div style={{ fontSize: '0.74rem', color: '#15803d', marginBottom: '10px', fontWeight: 600, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>
              تم تحديد الصنف: <strong>{selectedProduct.name}</strong> (سعر البيع الافتراضي الحالي: {selectedProduct.retail_price} ج.م)
            </div>
          )}

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
                    <th style={{ padding: '8px 12px', fontSize: 'var(--font-micro)', color: '#475569', textAlign: 'center' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#0f172a', fontWeight: 600 }}>
                        {it.product_name}
                        {it.product_id && (
                          <span style={{ fontSize: '0.7rem', color: '#64748b', marginInlineStart: '6px', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                            #{it.product_id}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#0f172a' }}>{it.min_quantity} قطعة+</td>
                      <td style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#0f172a', fontWeight: 700 }}>{it.fixed_price != null ? `${it.fixed_price} ج.م` : '-'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 'var(--font-table-head)', color: '#16a34a', fontWeight: 700 }}>{it.discount_percent != null ? `${it.discount_percent}%` : '-'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                          title="حذف الصنف من القائمة"
                        >
                          <TrashIcon size={14} />
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

