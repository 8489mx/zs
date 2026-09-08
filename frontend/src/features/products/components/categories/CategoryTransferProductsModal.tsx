import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';

interface CategoryTransferProductsModalProps {
  category: { id: string | number; name: string } | null;
  categories: Array<{ id: string | number; name: string }>;
  categoryProducts: Array<{ id: string | number; name: string; barcode?: string }>;
  selectedProductIds: Set<number>;
  targetCategoryId: string;
  setTargetCategoryId: (id: string) => void;
  toggleProductSelection: (id: number) => void;
  toggleAllProducts: () => void;
  isLoadingProducts: boolean;
  isPending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: () => void;
}

export const CategoryTransferProductsModal: React.FC<CategoryTransferProductsModalProps> = ({
  category,
  categories,
  categoryProducts,
  selectedProductIds,
  targetCategoryId,
  setTargetCategoryId,
  toggleProductSelection,
  toggleAllProducts,
  isLoadingProducts,
  isPending,
  error,
  onClose,
  onSubmit,
}) => {
  if (!category) return null;

  return (
    <DialogShell open={true} onClose={onClose} width="520px">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '18px 24px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
        <div style={{ width: 4, height: 18, backgroundColor: 'var(--primary, #170c5c)', borderRadius: 2 }} />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>نقل أصناف قسم: {category.name}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
        <div style={{ padding: '14px 16px', backgroundColor: '#eff6ff', color: '#1e40af', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #dbeafe' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5.072 10.5 5c1.333-.2 2.667-.2 4 0l.5.072m-4 13.856L10.5 19c1.333.2 2.667.2 4 0l.5-.072m-9.5-4.428L5 14c-.2-1.333-.2-2.667 0-4l.072-.5m13.856 4.5L19 14c.2-1.333.2-2.667 0-4l-.072-.5m-3.5 1.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
          <div>
            <strong style={{ display: 'block', marginBottom: '2px', fontSize: '13.5px' }}>نقل أصناف لقسم آخر</strong>
            <span className="small" style={{ fontSize: '12px', color: '#3b82f6' }}>يمكنك نقل كل أصناف هذا القسم أو تحديد أصناف معينة لنقلها.</span>
          </div>
        </div>
        
        <Field label="القسم الوجهة">
          <select 
            value={targetCategoryId} 
            onChange={(e) => setTargetCategoryId(e.target.value)}
            className="purchase-prototype-field-input"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            <option value="">اختر القسم الوجهة...</option>
            {categories.filter(c => c.id !== category.id).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>تحديد الأصناف للنقل</strong>
              <span className="muted" style={{ fontSize: '12px', color: '#64748b' }}>
                {selectedProductIds.size === 0 
                  ? 'إذا لم تحدد، سيتم نقل جميع أصناف القسم.' 
                  : `تم تحديد ${selectedProductIds.size} من أصل ${categoryProducts.length} صنف.`}
              </span>
            </div>
            <Button 
              variant="secondary" 
              onClick={toggleAllProducts}
              disabled={isLoadingProducts || categoryProducts.length === 0}
              style={{ padding: '4px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
            >
              {selectedProductIds.size === categoryProducts.length && categoryProducts.length > 0 ? 'إلغاء التحديد' : 'تحديد الكل'}
            </Button>
          </div>
          
          <div className="custom-combobox-dropdown" style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
            {isLoadingProducts ? (
              <div className="muted small" style={{ textAlign: 'center', padding: '24px' }}>جاري تحميل الأصناف...</div>
            ) : categoryProducts.length === 0 ? (
              <div className="muted small" style={{ textAlign: 'center', padding: '24px' }}>لا توجد أصناف في هذا القسم.</div>
            ) : (
              categoryProducts.map((p, index) => {
                const isSelected = selectedProductIds.has(Number(p.id));
                return (
                  <label 
                    key={p.id} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'row',
                      alignItems: 'center', 
                      justifyContent: 'flex-start',
                      gap: '10px', 
                      padding: '10px 14px', 
                      cursor: 'pointer', 
                      borderBottom: index < categoryProducts.length - 1 ? '1px solid #f1f5f9' : 'none',
                      margin: 0,
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => toggleProductSelection(Number(p.id))}
                      style={{ margin: 0, width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? '#1d4ed8' : '#0f172a' }}>{p.name}</span>
                      {p.barcode && <span className="muted" style={{ fontSize: '11px', color: '#64748b' }}>{p.barcode}</span>}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}
      </div>
      <div className="actions compact-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f8fafc' }}>
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button 
          onClick={onSubmit} 
          disabled={!targetCategoryId || isPending}
        >
          {isPending ? 'جاري النقل...' : 'نقل الأصناف'}
        </Button>
      </div>
    </DialogShell>
  );
};
